import * as url from 'node:url'

/**
 * Selector
 */

const selector = [
  'a[href]',
  'img[src]',
  'script[src]',
  'link[href]',
  'source[src]',
  'track[src]',
  'img[src]',
  'frame[src]',
  'iframe[src]'
].join(',')

/**
 * Checks if a given string is a valid URL
 *
 * @param {String} src
 * @return {Boolean}
 */
const isValidUrl = (src) => url.URL.parse(src)

/**
 * Change all the URLs into absolute urls
 *
 * @param {String} path
 * @param {Cheerio} $
 * @return {$}
 */
export default function (path, $) {
  const parts = url.URL.parse(path)
  let remote = parts ? parts.protocol + '//' + parts.host : ''
  let href

  // apply <base> tag transformation
  const base = $('head').find('base')
  if (base.length === 1) {
    href = base.attr('href')
    if (href) {
      remote = href
    }
  }
  $(selector).each(abs)

  function abs (i, el) {
    const $el = $(el)
    let key = null
    let src = null

    const hasHref = $el.attr('href')
    const hashSrc = $el.attr('src')

    if (hasHref) {
      key = 'href'
      src = hasHref
    } else if (hashSrc) {
      key = 'src'
      src = hashSrc
    } else {
      return
    }

    src = src.trim()

    if (~src.indexOf('://')) {
      return
    } else if (isValidUrl(url.resolve(remote, src))) {
      let current
      if (href && src.indexOf('/') !== 0) {
        current = url.resolve(remote, href)
        src = url.resolve(current, src)
      } else {
        current = url.resolve(remote, parts.pathname)
        src = url.resolve(current, src)
      }
    }

    $el.attr(key, src)
  }

  return $
}
