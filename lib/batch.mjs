/*!
 * batch
 * Copyright(c) 2013-2015 TJ Holowaychuk
 * MIT Licensed
 */

import { EventEmitter } from 'node:events'
import process from 'node:process'

/**
 * Defer.
 */

const defer = typeof process !== 'undefined' && process && typeof process.nextTick === 'function'
  ? process.nextTick
  : (fn) => setTimeout(fn)

/**
 * Create a new Batch.
 */

class Batch extends EventEmitter {
  constructor (options) {
    super()
    const args = new Array(arguments.length)
    for (let i = 0; i < arguments.length; i++) {
      args[i] = arguments[i]
    }

    let opts = {}

    if (args.length > 0 && typeof options !== 'function') {
      opts = args.shift() || {}
    }

    this.funcs = []
    this.concurrency(opts.concurrency || Infinity)
    this.throws(opts.throws === undefined ? true : opts.throws)

    for (let i = 0; i < args.length; i++) {
      this.push(args[i])
    }
  }

  /**
  * Set concurrency to `n`.
  *
  * @param {Number} n
  * @return {Batch}
  * @api public
  */
  concurrency (n) {
    this.n = n
    return this
  }

  /**
  * Queue a function.
  *
  * @param {Function} fn
  * @return {Batch}
  * @api public
  */
  push (fn) {
    this.funcs.push(fn)
    return this
  }

  /**
  * Set wether Batch will or will not throw up.
  *
  * @param  {Boolean} throws
  * @return {Batch}
  * @api public
  */
  throws (throws) {
    this.e = !!throws
    return this
  }

  /**
  * Execute all queued functions in parallel,
  * executing `cb(err, results)`.
  *
  * @param {Function} cb
  * @return {Batch}
  * @api public
  */
  end (cb) {
    const self = this
    const total = this.funcs.length
    const results = []
    const errors = []
    const funcs = this.funcs
    const max = this.n
    const throws = this.e
    let pending = total
    let index = 0
    let done

    // empty
    if (!funcs.length) {
      if (cb) defer(() => cb(null, results))
      return
    }

    // process
    function next () {
      const i = index++
      const fn = funcs[i]
      if (!fn) return
      const start = new Date()

      function callback (err, res) {
        if (done) return

        if (err && throws) {
          done = true
          if (cb) defer(function () { cb(err) })
          return
        }

        const complete = total - pending + 1
        const end = new Date()

        results[i] = res
        errors[i] = err

        self.emit('progress', {
          index: i,
          value: res,
          error: err,
          pending,
          total,
          complete,
          percent: complete / total * 100 | 0,
          start,
          end,
          duration: end - start
        })

        if (--pending) next()
        else if (cb) {
          defer(function () {
            if (!throws) cb(errors, results)
            else cb(null, results)
          })
        }
      }

      try {
        fn(callback)
      } catch (err) {
        callback(err)
      }
    }

    // concurrency
    for (let i = 0; i < funcs.length; i++) {
      if (i === max) break
      next()
    }

    return this
  }
}

export default Batch
