/**
 * Module Dependencies
 */

/**
 * Regexps
 */

const rselector = /^([^@]*)(?:@\s*([\w-_:]+))?$/
const rfilters = /\s*\|(?!=)\s*/

function filterParser (str) {
  return str.split(/ *\| */).map(function (call) {
    const parts = call.split(':')
    const name = parts.shift()
    const args = parseArgs(parts.join(':'))

    return {
      name,
      args
    }
  })
}

/**
 * Parse args `str`.
 *
 * @param {String} str
 * @return {Array}
 * @api private
 */

function parseArgs (str) {
  const args = []
  const re = /"([^"]*)"|'([^']*)'|([^ \t,]+)/g
  let m = re.exec(str)

  while (m) {
    m = re.exec(str)
    args.push(m[2] || m[1] || m[0])
  }

  return args
}

/**
 * Initialize `parse`
 *
 * @param {String}
 * @return {Object}
 */

export default function (str) {
  const filters = str.split(rfilters)
  const z = filters.shift()
  const m = z.match(rselector) || []

  return {
    selector: m[1] ? m[1].trim() : m[1],
    attribute: m[2],
    filters: filters.length ? filterParser(filters.join('|')) : []
  }
}
