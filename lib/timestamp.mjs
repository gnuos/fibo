// If `Date.now()` is invoked twice quickly, it's possible to get two
// identical time stamps. To avoid generation duplications, subsequent
// calls are manually ordered to force uniqueness.

let _last = 0
let _count = 1
let adjusted = 0
let _adjusted = 0

export default function () {
  /**
  Returns NOT an accurate representation of the current time.
  Since js only measures time as ms, if you call `Date.now()`
  twice quickly, it's possible to get two identical time stamps.
  This function guarantees unique but maybe inaccurate results
  on each call.
  **/
  const _time = Date.now()

  /**
  If time returned is same as in last call, adjust it by
  adding a number based on the counter.
  Counter is incremented so that next call get's adjusted properly.
  Because floats have restricted precision,
  may need to step past some values...
  **/
  if (_last === _time) {
    do {
      adjusted = _time + ((_count++) / (_count + 999))
    } while (adjusted === _adjusted)

    _adjusted = adjusted
  } else { // If last time was different reset timer back to `1`.
    _count = 1
    adjusted = _time
  }
  _adjusted = adjusted
  _last = _time
  return adjusted
}
