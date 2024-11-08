/**
 * Module Dependencies
 */
import got from 'got'

/**
 * Got HTTP driver
 * 暂时没有启用
 *
 * @param {Object} opts
 * @return {Function}
 */

export default function (opts) {
  const client = got.extend({ headers: opts.hreaders })

  return (ctx) => client.get(ctx.url).text()
}
