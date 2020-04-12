'use strict';

const { Readable } = require('stream');

class ObjectReader extends Readable {
  constructor(objectStream, replacer) {
    super();

    this.replacer = replacer;

    this.iterator = (function* () {
      let done = false;
      let first = true;

      objectStream.once('data', () => (first = false));
      objectStream.on('end', () => (done = true));

      const getNextObj = function () {
        return new Promise((resolve, reject) => {
          objectStream.resume();
          objectStream.once('data', (data) => {
            objectStream.pause();
            resolve(data);
          });
          objectStream.once('error', reject);
        });
      };

      while (!done) {
        if (!first) {
          yield ',';
        }
        yield getNextObj();
      }
    })();
  }

  _read() {
    const JStream = require('./index.js');

    if (this.jStream) {
      this.jStream.resume();
      return this.jStream.once('data', (data) => {
        this.jStream.pause();
        return this.push(data);
      });
    }

    const { value, done } = this.iterator.next();

    if (done) {
      return this.push(null);
    }

    if (value instanceof Promise) {
      return value
        .then((result) => {
          if (result instanceof Function || result === undefined || Number.isNaN(result)) {
            this.jStream = new JStream(null);
          } else {
            this.jStream = new JStream(result, this.replacer);
          }

          this.jStream.on('end', () => {
            this.jStream = null;
            return this._read();
          });
          return this._read();
        })
        .catch((err) => this.emit('error', err));
    }

    return this.push(value);
  }
}

module.exports = { ObjectReader };
