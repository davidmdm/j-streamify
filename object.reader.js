'use strict';

const { Readable } = require('stream');
const JStream = require('./index');

class ObjectStreamStringify extends Readable {

  constructor(objectStream) {
    super();

    this.iterator = (function* () {

      let done = false;
      let first = true;

      objectStream.on('data', () => first = false);
      objectStream.on('end', () => done = true);

      const getNextObj = function () {
        return new Promise((resolve, reject) => {
          objectStream.once('data', resolve);
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

    if (this.jStream) {
      const { value, done } = this.jStream.next();
      if (done) {
        this.jStream = null;
      } else {
        return this.push(value);
      }
    }

    const { value, done } = this.iterator.next();

    if (done) {
      this.push(null);
    }

    if (typeof value === 'string') {
      return this.push(value);
    }

    if (value instanceof Promise) {
      return value
        .then(result => {
          this.jStream = new JStream(result);
          this._read();
        })
        .catch(err => this.emit('error', err));
    }

  }


}