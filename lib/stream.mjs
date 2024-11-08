import { isArray } from './util.mjs'

export default {
  /**
   * Streaming array helper
   *
   * @param {Stream} data (optional)
   * @return {Function}
   */
  array: function (stream) {
    if (!stream) return function () {}
    let first = true

    return function (data, end) {
      const str = JSON.stringify(data, true, 2)
      const json = isArray(data) ? str.slice(1, -1) : str
      const empty = json.trim() === ''

      if (first && empty && !end) return
      if (first) { stream.write('[\n') }
      if (!first && !empty) { stream.write(',') }

      if (end) {
        stream.end(json + ']')
      } else {
        stream.write(json)
      }

      first = false
    }
  },

  /**
   * Streaming object helper
   *
   * @param {Stream} data (optional)
   * @return {Function}
   */
  object: function (stream) {
    if (!stream) return function () {}

    return function (data, end) {
      const json = JSON.stringify(data, true, 2)

      if (end) {
        stream.end(json)
      } else {
        stream.write(json)
      }
    }
  },

  waitCb: function (stream, fn) {
    fn(function (err) {
      if (err) stream.emit('error', err)
    })
  }
}
