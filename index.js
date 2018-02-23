'use strict';

const { Readable } = require('stream');

module.exports = class JStream extends Readable {

  constructor(obj) {
    super({ objectMode: true });
    this.jsonIterator = jsonGenerator(obj);

    const self = this;

    function* jsonGenerator(value) {

      if (Array.isArray(value)) {
        return yield* arrayGenerator(value);
      }

      if (value instanceof Promise) {
        self.pMode = true;
        const resolved = yield value;
        self.pMode = false;
        return yield* jsonGenerator(resolved);
      }

      if (value instanceof Readable) {
        self.src = value;
        value.once('end', () => {
          self.src = null;
          self._read();
        });
        value.once('error', err => self.emit('error', err));
        yield '"';
        yield '"'
        return;
      }

      if (typeof value === 'object') {
        return yield* objectGenerator(value);
      }

      yield JSON.stringify(value);

    }

    function* arrayGenerator(arr) {
      yield '[';
      for (let i = 0; i < arr.length; i++) {
        yield* jsonGenerator(arr[i]);
        if (i !== arr.length - 1) {
          yield ',';
        }
      }
      yield ']';
    }

    function* objectGenerator(obj) {
      yield '{';
      const keys = Object.keys(obj);
      for (let i = 0; i < keys.length; i++) {
        yield `"${keys[i]}":`;
        yield* jsonGenerator(obj[keys[i]]);
        if (i !== keys.length - 1) {
          yield ',';
        }
      }
      yield '}';
    }

  }

  _read() {

    if (this.src) {
      return this.src.once('data', x => this.push(x.toString()));
    }

    const { value, done } = this.jsonIterator.next();

    if (done) {
      return this.push(null);
    }

    if (this.pMode === true) {
      return value
        .then(x => {
          const { value } = this.jsonIterator.next(x);
          return this.push(value.toString());
        })
        .catch(err => this.emit('error', err));
    }

    return this.push(value.toString());
  }

}
