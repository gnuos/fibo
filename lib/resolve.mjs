/**
 * Module Dependencies
 */

import Debugger from 'debug'

import { isArray } from './util.mjs'
import parse from './parse.mjs'

/**
 * Initialize `resolve`
 *
 * @param {$} cheerio object
 * @param {String} scope
 * @param {String|Array} selector
 * @param {Object} filters
 * @return {Array|String}
 */

export default function ($, scope, selector, filters) {
  const debug = Debugger('resolve')

  debug('resolve($j, %j)', scope, selector)
  filters = filters || {}
  const array = isArray(selector)
  const obj = parse(array ? selector[0] : selector)
  obj.attribute = obj.attribute || 'text'

  if (!obj.selector) {
    obj.selector = scope
    scope = null
  }

  let value = find($, scope, array ? [obj.selector] : obj.selector, obj.attribute)
  debug('resolved($j, %j) => %j', scope, selector, value)

  if (array && typeof value.map === 'function') {
    value = value.map(function (v) {
      return filter(obj, $, scope, selector, v, filters)
    })
  } else {
    value = filter(obj, $, scope, selector, value, filters)
  }

  return value
}

/**
 * Find the node(s)
 *
 * @param {Cheerio} $
 * @param {String} scope
 * @param {String|Array} selector
 * @param {String} attr
 * @return {Array|String}
 */

function find ($, scope, selector, attr) {
  let $scope
  const out = []
  if (scope && isArray(selector)) {
    $scope = select($, scope)
    $scope.each(function (i) {
      const $el = $scope.eq(i)
      const $children = select($el, selector[0])

      return $children.map(function (i) {
        const _attr = attribute($children.eq(i), attr)
        out.push(_attr)
        return _attr
      })
    })

    return out
  } else if (scope) {
    $scope = select($, scope)
    return attribute($scope.find(selector).eq(0), attr)
  } else {
    let $selector
    if (isArray(selector)) {
      $selector = select($, selector[0])
      $selector.each(function (i) {
        out.push(attribute($selector.eq(i), attr))
      })
      return out
    } else {
      $selector = select($, selector)
      return attribute($selector.eq(0), attr)
    }
  }
}

/**
 * Selector abstraction, deals
 * with various instances of $
 *
 * @param {Cheerio} $
 * @param {String} selector
 * @return {Cheerio}
 */

function select ($, selector) {
  if ($.is && $.is(selector)) return $
  return $.find ? $.find(selector) : $(selector)
}

/**
 * Select the attribute based on `attr`
 *
 * @param {Cheerio} $
 * @param {Cheerio} $el
 * @param {String} attr
 * @return {String}
 */

function attribute ($el, attr) {
  switch (attr) {
    case 'html':
      return $el.html()
    case 'text':
      return $el.text()
    default:
      return $el.attr(attr)
  }
}

/**
 * Filter the value(s)
 *
 * @param {Object} obj
 * @param {Cheerio} $
 * @param {String} scope
 * @param {String|Array} selector
 * @param {Object} filters
 * @return {Array|String}
 */

function filter (obj, $, scope, selector, value, filters) {
  const debug = Debugger('resolve')

  const ctx = { $, selector: obj.selector, attribute: obj.attribute }
  return (obj.filters || []).reduce(function (out, filter) {
    const fn = filters[filter.name]
    if (typeof fn === 'function') {
      const args = [out].concat(filter.args || [])
      const filtered = fn.apply(ctx, args)
      debug('%s.apply(ctx, %j) => %j', filter.name, args, filtered)
      return filtered
    } else {
      throw new Error('Invalid filter: ' + filter.name)
    }
  }, value)
}
