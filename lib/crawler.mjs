/**
 * Module Dependencies
 */

import Context from 'http-context'
import enqueue from './enqueue.mjs'
import wrapFn from './wrapFn.mjs'
import rateLimit from './rateLimit.mjs'
import http from './driver/default.mjs'
import { range } from './util.mjs'

import ms from 'ms'
import Debugger from 'debug'

const noop = function () {}

/**
 * Initialize a `Crawler`
 *
 * @param {Function} driver (optional)
 * @return {Function} crawler(url, cb)
 * @api public
 */

export default function Crawler (driver, opts) {
  driver = driver || http(opts)

  const debug = Debugger('crawler')

  // defaults
  let throttle = rateLimit()
  let concurrency = Infinity
  let limit = Infinity
  let request = noop
  let timeout = false
  let response = noop
  let delay = range()
  let queue = null

  /**
   * Make a request
   */

  function crawler (url, cb) {
    // co support
    if (arguments.length === 1) {
      return function (cb) {
        return crawler(url, cb)
      }
    }

    if (!queue) {
      const options = {
        concurrency,
        timeout,
        limit
      }

      queue = enqueue(get, options)
      queue(url, cb)
    } else {
      schedule(url, cb)
    }

    return crawler
  }

  /**
   * Fetch the `url` based on the `driver`
   * 封装了HTTP客户端库的一个函数
   *
   * @param {String} url
   * @param {Function} cb
   */
  function get (url, cb) {
    debug('getting: %s', url)
    const ctx = Context()
    ctx.url = url

    // request hook
    request(ctx.request)

    // HTTP response
    function result (err, res) {
      if (err) return cb(err)

      // update the context
      if (res && res !== ctx) ctx.body = res

      // post-flight. modify the response
      response(ctx.response)

      cb(null, ctx)
    }

    /*
    * 默认用的superagent库封装的函数会直接返回
    * driver.apply(this, ctx.concat(done))
    */
    wrapFn(driver, result)(ctx)
  }

  /**
   * Schedule another request for later
   *
   * @param {String} url
   * @param {Function} fn
   */

  function schedule (url, fn) {
    // if we've reached the limit, don't request anymore
    if (--limit <= 0) return

    // if specified, throttle requests and add a delay
    const wait = throttle() + delay()

    debug('queued: "%s", waiting "%sms"', url, wait)
    setTimeout(function () {
      // queue up next request
      queue(url, fn)
    }, wait)
  }

  /**
   * Get or set the driver
   *
   * @param {Function} driver
   * @return {Function|Crawler}
   * @api public
   */

  crawler.driver = function (fn) {
    if (!arguments.length) return driver
    driver = fn
    return crawler
  }

  /**
   * Throttle according to a rate limit
   *
   * @param {Number|String} requests
   * @param {Number|String} rate
   * @return {Number|Crawler}
   * @api public
   */

  crawler.throttle = function (requests, rate) {
    if (!arguments.length) return throttle

    if (arguments.length === 1) {
      rate = requests
      requests = 1
    }

    rate = /^\d/.test(rate) ? rate : 1 + rate
    rate = typeof rate === 'string' ? ms(rate) : rate
    throttle = rateLimit(requests, rate)
    return crawler
  }

  /**
   * Delay subsequent requests
   *
   * @param {String|Number} from
   * @param {String|Number} to (optional)
   * @return {Number|Crawler}
   * @api public
   */

  crawler.delay = function (from, to) {
    if (!arguments.length) return delay
    from = typeof from === 'string' ? ms(from) : from
    to = typeof to === 'string' ? ms(to) : to
    delay = range(from, to)
    return crawler
  }

  /**
   * Specify a request timeout
   *
   * @param {String|Number} timeout
   * @return {Number|Crawler}
   * @api public
   */

  crawler.timeout = function (n) {
    if (!arguments.length) return n
    timeout = typeof n === 'string' ? ms(n) : n
    return crawler
  }

  /**
   * Specify a request concurrency
   *
   * @param {Number} n
   * @return {Number|crawler}
   */

  crawler.concurrency = function (n) {
    if (!arguments.length) return concurrency
    concurrency = n
    return crawler
  }

  /**
   * Hook into the request
   *
   * @param {Function} fn
   * @return {Function|crawler}
   */

  crawler.request = function (fn) {
    if (!arguments.length) return request
    request = fn
    return crawler
  }

  /**
   * Hook into the response
   *
   * @param {Function} fn
   * @return {Function|crawler}
   */

  crawler.response = function (fn) {
    if (!arguments.length) return response
    response = fn
    return crawler
  }

  /**
   * Limit the total number of requests
   *
   * @param {Number} n
   * @return {Number|crawler}
   */

  crawler.limit = function (n) {
    if (!arguments.length) return limit
    limit = n
    return crawler
  }

  return crawler
}
