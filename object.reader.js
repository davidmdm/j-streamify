'use strict';

const { Readable } = require('stream');
const JStream = require('./index.js');

module.exports = class ObjectStreamStringify extends Readable {

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

      console.log('hmm');
      
    })();
  }

  _read() {

    if (this.jStream) {
      return this.jStream.once('data', data => {
        this.push(data)
      });
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
          this.jStream.on('end', () => {
            this.jStream = null;
            this._read();
          });
          this._read();
        })
        .catch(err => this.emit('error', err));
    }

  }


}