'use strict';

const { Readable } = require('stream');

module.exports = class JStream extends Readable {

  constructor(obj, replacer) {

    if (!replacer) {
      replacer = function(_, value) {
        return value;
      }
    }

    if (typeof replacer !== 'function' && !Array.isArray(replacer)) {
      throw new Error(`Expecting replacer to be a function or an array not ${typeof replacer}`);
    }

    if (Array.isArray(replacer)) {
      replacer = function(key, value) {
        if (replacer.includes(key)) {
          return value;
        }
        return undefined;
      }
    }

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

        if (value._readableState.objectMode) {
          return self.emit('error', new Error('Readable streams in objectMode are not supported'));
        }

        self.src = value;
        value.once('end', () => {
          self.src = null;
          self._read();
        });
        value.once('error', err => self.emit('error', err));
        yield '"';
        yield '"';
        return;
      }

      if (typeof value === 'object' && value !== null) {
        return yield* objectGenerator(value);
      }
      
      yield JSON.stringify(value);

    }

    function* arrayGenerator(arr) {
      yield '[';
      for (let i = 0; i < arr.length; i++) {

        const value = arr[i] === undefined ? null : arr[i];

        yield* jsonGenerator(value);
        if (i !== arr.length - 1) {
          yield ',';
        }
      }
      yield ']';
    }

    function* objectGenerator(value) {

      yield '{';

      // As per JSON.stringify replacer param documentation, the replacer is called initially
      // on the object itself as the value and undefined as the key.
      const obj = Object.assign({}, replacer.call(value, undefined, value));

      const keys = Object.keys(obj);

      for (let i = 0; i < keys.length; i++) {

        if (typeof obj[keys[i]] === 'function') {
          continue;
        }

        const value = replacer.call(obj, keys[i], obj[keys[i]]);

        if (value === undefined) {
          continue;
        }

        yield `"${keys[i]}":`;

        yield* jsonGenerator(value);

        if (i !== keys.length - 1) {
          yield ',';
        }

      }
      yield '}';
    }

  }

  _read() {

    if (this.src) {
      return this.src.once('data', x => this.push(JSON.stringify(x.toString()).slice(1, -1)));
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
        .then(x => {
          const { value } = this.jsonIterator.next(x);
          return this.push(value.toString());
        })
        .catch(err => this.emit('error', err));
    }

    return this.push(value.toString());
  }

};
