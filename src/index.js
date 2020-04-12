'use strict';

const { Readable } = require('stream');

const { toJSON } = require('./util');
const { jsonGenerator } = require('./generators');
const { ObjectReader } = require('./object.reader');

class JStream extends Readable {
  constructor(obj, fn) {
    const value = toJSON(obj);
    const replacer = typeof fn === 'function' || Array.isArray(fn) ? fn : (_, x) => x;

    super();
    this.pMode = false;
    this.src = null;
    this.jsonIterator = jsonGenerator(this, value, replacer);
  }

  _read() {
    if (this.src) {
      this.src.resume();
      return this.src.once('data', (x) => {
        this.src.pause();
        if (this.src instanceof ObjectReader) {
          return this.push(x);
        }
        return this.push(JSON.stringify(x.toString()).slice(1, -1));
      });
    }

    const { value, done } = this.jsonIterator.next();

    if (done) {
      return this.push(null);
    }

    if (value === undefined) {
      return this.push('');
    }

    if (this.pMode === true) {
      return value
        .then((x) => {
          const { value } = this.jsonIterator.next(x);
          return this.push(value);
        })
        .catch((err) => this.emit('error', err));
    }

    return this.push(value);
  }
}

module.exports = JStream;
