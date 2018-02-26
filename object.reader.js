'use strict';

const { Readable } = require('stream');

module.exports = class ObjectStreamStringify extends Readable {

  constructor(objectStream) {
    super();

    this.iterator = (function* () {

      let done = false;
      let first = true;

      objectStream.once('data', () => first = false);
      objectStream.on('end', () => done = true);

      const getNextObj = function () {
        return new Promise((resolve, reject) => {
          objectStream.resume();
          objectStream.once('data', data => {
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
      return this.jStream.once('data', data => {
        this.jStream.pause();
        return this.push(data)
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