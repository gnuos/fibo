/**
 * RegExps.
 * A URL must match #1 and then at least one of #2/#3.
 * Use two levels of REs to avoid REDOS.
 */
const protocolAndDomainRE = /^(?:\w+:)?\/\/(\S+)$/
const localhostDomainRE = /^localhost[:?\d]*(?:[^:?\d]\S*)?$/
const nonLocalhostDomainRE = /^[^\s.]+\.\S{2,}$/

const has = Object.prototype.hasOwnProperty
const isArray = Array.isArray
const isObject = (val) =>
  val != null && typeof val === 'object' && Array.isArray(val) === false

/**
 * Compact an array,
 * removing empty objects
 *
 * @param {Array} arr
 * @return {Array}
 */
function compact (arr) {
  return arr.filter(function (val) {
    if (!val) return false
    if (val.length !== undefined) return val.length !== 0
    for (const key in val) if (has.call(val, key)) return true
    return false
  })
}

/**
 * Check if the string is HTML
 */
function isHTML (str) {
  str = (str || '').toString().trim()
  return str[0] === '<' && str[str.length - 1] === '>'
}

/**
 * Loosely validate a URL `string`.
 *
 * @param {String} string
 * @return {Boolean}
 */
function isUrl (string) {
  if (typeof string !== 'string') {
    return false
  }

  const match = string.match(protocolAndDomainRE)
  if (!match) {
    return false
  }

  const everythingAfterProtocol = match[1]
  if (!everythingAfterProtocol) {
    return false
  }

  if (
    localhostDomainRE.test(everythingAfterProtocol) ||
    nonLocalhostDomainRE.test(everythingAfterProtocol)
  ) {
    return true
  }

  return false
}

/**
 * Get the root, if there is one.
 *
 * @param {Mixed}
 * @return {Boolean|String}
 */
function root (selector) {
  return (
    (typeof selector === 'string' || isArray(selector)) &&
    !~selector.indexOf('@') &&
    !isUrl(selector) &&
    selector
  )
}

/**
 * Initialize a `range`
 *
 * @param {Number} from
 * @param {Number} to
 * @return {Function}
 */

function range (from, to) {
  from = from || 0
  to = to || from

  return function () {
    return Math.floor(Math.random() * (to - from + 1) + from)
  }
}

/**
 * An Array.prototype.slice.call(arguments) alternative
 *
 * @param {Object} args something with a length
 * @param {Number} slice
 * @param {Number} sliceEnd
 * @api public
 */

function sliced (args, slice, sliceEnd) {
  const ret = []
  let len = args.length

  if (len === 0) return ret

  const start = slice < 0 ? Math.max(0, slice + len) : slice || 0

  if (sliceEnd !== undefined) {
    len = sliceEnd < 0 ? sliceEnd + len : sliceEnd
  }

  while (len-- > start) {
    ret[len - start] = args[len]
  }

  return ret
}

export { has, isArray, isObject, isHTML, isUrl, compact, root, range, sliced }
