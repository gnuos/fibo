/**
 * Module Dependencies
 */

import { isObject } from './util.mjs'
import Batch from './batch.mjs'

/**
 * Walk recursively, providing
 * callbacks for each step.
 *
 * @param {Mixed} value
 * @param {Function} fn
 * @param {Function} done
 * @param {String} key (private)
 */

export default function walk (value, fn, done, key) {
  const batch = new Batch()
  let out

  if (isObject(value)) {
    out = {}
    Object.keys(value).forEach(function (k) {
      const v = value[k]
      batch.push(function (next) {
        walk(v, fn, function (err, value) {
          if (err) return next(err)
          // ignore undefined values
          if (undefined !== value && value !== '') {
            out[k] = value
          }
          next()
        }, k)
      })
    })
  } else {
    out = null
    batch.push(function (next) {
      fn(value, key, function (err, v) {
        if (err) return next(err)
        out = v
        next()
      })
    })
  }

  batch.end(function (err) {
    if (err) return done(err)
    return done(null, out)
  })
}
