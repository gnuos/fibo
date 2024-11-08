/**
 * Module Dependencies
 */

import superagent from 'superagent'
import Debugger from 'debug'

/**
 * Default HTTP driver
 *
 * @param {Object} opts
 * @return {Function}
 */

export default function (opts) {
  const agent = superagent.agent(opts || {})
  const debug = Debugger('crawler:superagent')

  return (ctx, fn) => {
    debug('going to %s', ctx.url)

    agent
      .get(ctx.url)
      .set(ctx.headers)
      .end(function (err, res) {
        if (err && !err.status) return fn(err)

        ctx.status = res.status
        ctx.set(res.headers)

        ctx.body = ctx.type === 'application/json'
          ? res.body
          : res.text

        // update the URL if there were redirects
        ctx.url = res.redirects.length
          ? res.redirects.pop()
          : ctx.url

        return fn(null, ctx)
      })
  }
}
