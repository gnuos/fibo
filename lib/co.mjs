/**
 * slice() reference.
 */

const slice = Array.prototype.slice

/**
 * Execute the generator function or a generator
 * and return a promise.
 *
 * @param {Function} fn
 * @return {Promise}
 * @api public
 */

export default function co (gen) {
  const ctx = this
  const args = slice.call(arguments, 1)

  // we wrap everything in a promise to avoid promise chaining,
  // which leads to memory leak errors.
  // see https://github.com/tj/co/issues/180
  return new Promise(function (resolve, reject) {
    if (typeof gen === 'function') gen = gen.apply(ctx, args)
    if (!gen || typeof gen.next !== 'function') return resolve(gen)

    onFulfilled()

    /**
     * @param {Mixed} res
     * @return {Promise}
     * @api private
     */

    function onFulfilled (res) {
      let ret
      try {
        ret = gen.next(res)
      } catch (e) {
        return reject(e)
      }
      next(ret)
      return null
    }

    /**
     * @param {Error} err
     * @return {Promise}
     * @api private
     */

    function onRejected (err) {
      let ret
      try {
        ret = gen.throw(err)
      } catch (e) {
        return reject(e)
      }
      next(ret)
    }

    /**
     * Get the next value in the generator,
     * return a promise.
     *
     * @param {Object} ret
     * @return {Promise}
     * @api private
     */

    function next (ret) {
      if (ret.done) return resolve(ret.value)
      const value = toPromise.call(ctx, ret.value)
      if (value && isPromise(value)) return value.then(onFulfilled, onRejected)
      return onRejected(new TypeError('You may only yield a function, promise, generator, array, or object, ' +
        'but the following object was passed: "' + String(ret.value) + '"'))
    }
  })
}

co.co = co
co.default = co

/**
 * Wrap the given generator `fn` into a
 * function that returns a promise.
 * This is a separate function so that
 * every `co()` call doesn't create a new,
 * unnecessary closure.
 *
 * @param {GeneratorFunction} fn
 * @return {Function}
 * @api public
 */

co.wrap = function (fn) {
  createPromise.__generatorFunction__ = fn
  function createPromise () {
    return co.call(this, fn.apply(this, arguments))
  }

  return createPromise
}

/**
 * Convert a `yield`ed value into a promise.
 *
 * @param {Mixed} obj
 * @return {Promise}
 * @api private
 */

function toPromise (obj) {
  if (!obj) return obj
  if (isPromise(obj)) return obj
  if (isGeneratorFunction(obj) || isGenerator(obj)) return co.call(this, obj)
  if (typeof obj === 'function') return thunkToPromise.call(this, obj)
  if (Array.isArray(obj)) return arrayToPromise.call(this, obj)
  if (isObject(obj)) return objectToPromise.call(this, obj)
  return obj
}

/**
 * Convert a thunk to a promise.
 *
 * @param {Function}
 * @return {Promise}
 * @api private
 */

function thunkToPromise (fn) {
  const ctx = this
  return new Promise(function (resolve, reject) {
    fn.call(ctx, function (err, res) {
      if (err) return reject(err)
      if (arguments.length > 2) res = slice.call(arguments, 1)
      resolve(res)
    })
  })
}

/**
 * Convert an array of "yieldables" to a promise.
 * Uses `Promise.all()` internally.
 *
 * @param {Array} obj
 * @return {Promise}
 * @api private
 */

function arrayToPromise (obj) {
  return Promise.all(obj.map(toPromise, this))
}

/**
 * Convert an object of "yieldables" to a promise.
 * Uses `Promise.all()` internally.
 *
 * @param {Object} obj
 * @return {Promise}
 * @api private
 */

function objectToPromise (obj) {
  const results = new obj.constructor()
  const keys = Object.keys(obj)
  const promises = []
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const promise = toPromise.call(this, obj[key])
    if (promise && isPromise(promise)) defer(promise, key)
    else results[key] = obj[key]
  }
  return Promise.all(promises).then(function () {
    return results
  })

  function defer (promise, key) {
    // predefine the key in the result
    results[key] = undefined
    promises.push(promise.then(function (res) {
      results[key] = res
    }))
  }
}

/**
 * Check if `obj` is a promise.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isPromise (obj) {
  return obj && typeof obj.then === 'function'
}

/**
 * Check if `obj` is a generator.
 *
 * @param {Mixed} obj
 * @return {Boolean}
 * @api private
 */

function isGenerator (obj) {
  return obj && typeof obj.next === 'function' && typeof obj.throw === 'function'
}

/**
 * Check if `obj` is a generator function.
 *
 * @param {Mixed} obj
 * @return {Boolean}
 * @api private
 */

function isGeneratorFunction (obj) {
  const constructor = obj.constructor
  if (!constructor) return false
  if (constructor.name === 'GeneratorFunction' || constructor.displayName === 'GeneratorFunction') return true
  return isGenerator(constructor.prototype)
}

/**
 * Check for plain object.
 *
 * @param {Mixed} val
 * @return {Boolean}
 * @api private
 */

function isObject (val) {
  return Object === val.constructor
}
