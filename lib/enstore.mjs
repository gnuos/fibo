import { EventEmitter } from 'events'
import timestamp from './timestamp.mjs'

import { Readable, Writable } from 'node:stream'

class Store extends EventEmitter {
  constructor () {
    super()
    this.store = []
    this.ended = false
  }

  createWriteStream (opts) {
    const self = this
    const w = Writable(opts)

    w._write = (chunk, _, done) => {
      const _chunk = {
        ts: timestamp(),
        chunk
      }
      self.store.push(_chunk)
      self.emit('chunk', _chunk)
      done()
    }

    w.on('finish', () => {
      self.ended = true
      self.emit('end')
    })
    return w
  }

  createReadStream (opts) {
    const self = this
    const r = Readable(opts)

    let idx = 0
    r._read = () => {
      if (self.store[idx]) return r.push(self.store[idx++].chunk)
      if (self.ended) return r.push(null)

      const onchunk = function (chunk) {
        self.removeListener('end', onend)
        idx++
        r.push(chunk.chunk)
      }
      self.once('chunk', onchunk)

      const onend = function () {
        self.removeListener('chunk', onchunk)
        r.push(null)
      }
      self.once('end', onend)
    }
    return r
  }
}

export default Store
