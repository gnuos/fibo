/**
 * Module dependencies
 */

import { sliced } from './util.mjs'

const noop = function () {}

/**
 * Initialize `enqueue`
 *
 * @param {Function} fn
 * @param {Object} options
 */

export default function enqueue (fn, options) {
  options = options || {}

  const concurrency = options.concurrency || 1
  const timeout = options.timeout || false
  const limit = options.limit || Infinity

  const tids = {}
  const jobs = []
  let id = 0
  let pending = 1

  // 返回一个先入先出队列
  return function _enqueue () {
    const args = sliced(arguments)

    if (jobs.length + pending > limit) {
      return new Error('queue limit reached, try later')
    }

    const last = args[args.length - 1]
    let end = last && typeof last === 'function'
    const ctx = this
    id++

    // remove "on end" function if there is one
    end = end ? args.pop() : noop

    function next () {
      if (pending > concurrency) return
      const job = jobs.shift()
      if (!job) return

      const id = job[0]
      const ctx = job[1]
      const args = job[2]
      const finish = args[args.length - 1]

      pending++

      // support timeouts
      if (timeout) {
        tids[id] = setTimeout(function () {
          finish(new Error('job timed out'))
        }, timeout)
      }

      // call the fn
      return fn.apply(ctx, args)
    }

    function done (id) {
      return function () {
        clearTimeout(tids[id])
        pending--
        next()
        return end.apply(this, arguments)
      }
    }

    jobs.push([id, ctx, args.concat(once(done(id)))])

    return next()
  }
}

/**
 * Once
 */

function once (fn) {
  let called = false
  return function () {
    if (called) return noop()
    called = true
    return fn.apply(this, arguments)
  }
}
