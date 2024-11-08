/**
 * Create a rate limiter
 *
 * @param {Number} requests
 * @param {Number} rate
 * @return {Number}
 */

export default function (requests, rate) {
  requests = requests || Infinity
  rate = rate || 0

  rate = Math.round(rate / requests)

  let waiting = 0
  let called = 0
  const tids = []

  function timer (ms) {
    tids[tids.length] = setTimeout(function () {
      called = new Date()
      waiting--
    }, ms)
  }

  return (fn) => {
    if (fn === 0) return tids.forEach(clearTimeout)

    const calling = new Date()
    const delta = calling - called
    const free = delta > rate && !waiting

    if (free) {
      called = calling
      return 0
    } else {
      const wait = (rate - delta) + (waiting++ * rate)
      timer(wait)
      return wait
    }
  }
}
