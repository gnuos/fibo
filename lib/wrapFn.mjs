/**
 * Module Dependencies
 */

import co from './co.mjs'

const noop = function () {}

/**
 * Wrap a function to support
 * sync, async, and gen functions.
 *
 * @param {Function} fn
 * @param {Function} done
 * @return {Function}
 * @api public
 */

export default function wrapFn (fn, done) {
  done = once(done || noop)

  return function () {
    // prevents arguments leakage
    let i = arguments.length
    const args = new Array(i)

    while (i--) args[i] = arguments[i]

    const ctx = this

    // done
    if (!fn) {
      return done.apply(ctx, [null].concat(args))
    }

    // async
    if (fn.length > args.length) {
      // NOTE: this only handles uncaught synchronous errors
      try {
        return fn.apply(ctx, args.concat(done))
      } catch (e) {
        return done(e)
      }
    }

    // generator
    if (isGenerator(fn)) {
      return co(fn).apply(ctx, args.concat(done))
    }

    // sync
    return sync(fn, done).apply(ctx, args)
  }
}

/**
 * Wrap a synchronous function execution.
 *
 * @param {Function} fn
 * @param {Function} done
 * @return {Function}
 * @api private
 */

function sync (fn, done) {
  return function () {
    let ret

    try {
      ret = fn.apply(this, arguments)
    } catch (err) {
      return done(err)
    }

    if (isPromise(ret)) {
      ret.then(function (value) { done(null, value) }, done)
    } else {
      ret instanceof Error ? done(ret) : done(null, ret)
    }
  }
}

/**
 * Is `value` a generator?
 *
 * @param {Mixed} value
 * @return {Boolean}
 * @api private
 */

function isGenerator (value) {
  return value &&
    value.constructor &&
    value.constructor.name === 'GeneratorFunction'
}

/**
 * Is `value` a promise?
 *
 * @param {Mixed} value
 * @return {Boolean}
 * @api private
 */

function isPromise (value) {
  return value && typeof value.then === 'function'
}

/**
 * Once
 */

function once (fn) {
  return function () {
    const ret = fn.apply(this, arguments)
    fn = noop
    return ret
  }
}
