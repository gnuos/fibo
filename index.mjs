'use strict'

import { isUrl, root, compact, isArray } from './lib/util.mjs'
import absolutes from './lib/absolutes.mjs'
import streamHelper from './lib/stream.mjs'
import Crawler from './lib/crawler.mjs'
import resolve from './lib/resolve.mjs'
import params from './lib/params.mjs'
import Store from './lib/enstore.mjs'
import walk from './lib/walk.mjs'

import * as cheerio from 'cheerio'
import Debugger from 'debug'
import sts from 'stream-to-string'
import fs from 'node:fs'

const CONSTANT = Object.freeze({
  CRAWLER_METHODS: ['concurrency', 'throttle', 'timeout', 'driver', 'delay', 'limit', 'abort'],
  INIT_STATE: {
    stream: false,
    concurrency: Infinity,
    paginate: false,
    limit: Infinity,
    abort: false
  }
})

function load (html, url) {
  html = html || ''
  let $ = html.html ? html : cheerio.load(html, { decodeEntities: false })
  if (url) $ = absolutes(url, $)
  return $
}

function WalkHTML (xray, selector, scope, filters) {
  return ($, fn) => {
    const handler = function (v, k, next) {
      if (typeof v === 'string') {
        const value = resolve($, root(scope), v, filters)
        return next(null, value)
      } else if (typeof v === 'function') {
        return v($, function (err, obj) {
          if (err) return next(err)
          return next(null, obj)
        })
      } else if (isArray(v)) {
        if (typeof v[0] === 'string') {
          return next(null, resolve($, root(scope), v, filters))
        } else if (typeof v[0] === 'object') {
          const $scope = $.find ? $.find(scope) : $(scope)
          let pending = $scope.length
          const out = []

          // Handle the empty result set (thanks @jenbennings!)
          if (!pending) return next(null, out)

          return $scope.each(function (i) {
            const $innerscope = $scope.eq(i)
            const node = xray(scope, v[0])
            node($innerscope, function (err, obj) {
              if (err) return next(err)
              out[i] = obj
              if (!--pending) {
                return next(null, compact(out))
              }
            })
          })
        }
      }
      return next()
    }

    walk(selector, handler, function (err, obj) {
      if (err) return fn(err)
      fn(null, obj, $)
    })
  }
}

function Xray (options) {
  options = options || {}

  const driverOpts = { headers: options.headers }

  // 只初始化一次
  const crawler = Crawler(null, driverOpts)
  const filters = options.filters || {}
  const debug = Debugger('x-ray')

  function newRequest (craw) {
    return function (url, fn) {
      debug('fetching %s', url)
      craw(url, function (err, ctx) {
        if (err) return fn(err)
        debug('got response for %s with status code: %s', url, ctx.status)
        return fn(null, ctx.body)
      })
    }
  }

  function xray (source, scope, selector) {
    const args = params(source, scope, selector)
    selector = args.selector
    source = args.source
    scope = args.context

    const state = Object.assign({}, CONSTANT.INIT_STATE)
    const store = new Store()
    let pages = []

    let stream

    const walkHTML = WalkHTML(xray, selector, scope, filters)
    const request = newRequest(crawler)

    function node (source2, fn) {
      if (arguments.length === 1) {
        fn = source2
      } else {
        source = source2
      }

      debug('params: %j', {
        source,
        scope,
        selector
      })

      if (isUrl(source)) {
        debug('starting at: %s', source)
        request(source, function (err, html) {
          if (err) return next(err)
          const $ = load(html, source)
          walkHTML($, next)
        })
      } else if (scope && ~scope.indexOf('@')) {
        debug('resolving to a url: %s', scope)
        const url = resolve(source, false, scope, filters)

        // ensure that a@href is a URL
        if (!isUrl(url)) {
          debug('%s is not a url. Skipping!', url)
          return walkHTML(load(''), next)
        }

        debug('resolved "%s" to a %s', scope, url)
        request(url, function (err, html) {
          if (err) return next(err)
          const $ = load(html, url)
          walkHTML($, next)
        })
      } else if (source) {
        const $ = load(source)
        walkHTML($, next)
      } else {
        debug('%s is not a url or html. Skipping!', source)
        return walkHTML(load(''), next)
      }

      function next (err, obj, $) {
        if (err) return fn(err)
        const paginate = state.paginate
        const limit = --state.limit

        // create the stream
        if (!stream) {
          if (paginate) stream = streamHelper.array(state.stream)
          else stream = streamHelper.object(state.stream)
        }

        if (paginate) {
          if (isArray(obj)) {
            pages = pages.concat(obj)
          } else {
            pages.push(obj)
          }

          if (limit <= 0) {
            debug('reached limit, ending')
            stream(obj, true)
            return fn(null, pages)
          }

          const url = resolve($, false, paginate, filters)
          debug('paginate(%j) => %j', paginate, url)

          if (!isUrl(url)) {
            debug('%j is not a url, finishing up', url)
            stream(obj, true)
            return fn(null, pages)
          }

          if (state.abort && state.abort(obj, url)) {
            debug('abort check passed, ending')
            stream(obj, true)
            return fn(null, pages)
          }

          stream(obj)

          // debug
          debug('paginating %j', url)
          isFinite(limit) && debug('%s page(s) left to crawl', limit)

          request(url, function (err, html) {
            if (err) return next(err)
            const $ = load(html, url)
            walkHTML($, next)
          })
        } else {
          stream(obj, true)
          fn(null, obj)
        }
      }

      return node
    }

    node.abort = function (validator) {
      if (!arguments.length) return state.abort
      state.abort = validator
      return node
    }

    node.paginate = function (selector) {
      if (!arguments.length) return state.paginate
      state.paginate = selector
      return node
    }

    node.limit = function (limit) {
      if (!arguments.length) return state.limit
      state.limit = limit
      return node
    }

    node.stream = function () {
      state.stream = store.createWriteStream()
      const rs = store.createReadStream()
      streamHelper.waitCb(rs, node)
      return rs
    }

    node.write = function (path) {
      if (!arguments.length) return node.stream()
      state.stream = fs.createWriteStream(path)
      streamHelper.waitCb(state.stream, node)
      return state.stream
    }

    node.then = function (resHandler, errHandler) {
      return new Promise(function (resolve, reject) {
        sts(node.stream(), function (err, resStr) {
          if (err) {
            reject(err)
          } else {
            try {
              resolve(JSON.parse(resStr))
            } catch (e) {
              reject(e)
            }
          }
        })
      }).then(resHandler, errHandler)
    }

    return node
  }

  CONSTANT.CRAWLER_METHODS.forEach(function (method) {
    xray[method] = function () {
      if (!arguments.length) return crawler[method]()
      crawler[method].apply(crawler, arguments)
      return this
    }
  })

  return xray
}

export default Xray
