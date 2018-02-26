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

    super();
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

    function* arrayGenerator(value) {

      let arr;

      if (replacer instanceof Function) {
        arr = replacer
          .call(value, undefined, value)
          .map((x, i, a) => {
            const value = replacer.call(a, Number(i).toString(), x);
            if (value === undefined || value instanceof Function) {
              return null;
            }
            return value;
          });
      } else {
        arr = value.map(x => (x === undefined || x instanceof Function) ? null : x);
      }

      yield '[';

      for (let i = 0; i < arr.length; i++) {
        yield* jsonGenerator(arr[i]);
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

      let obj;

      if (replacer instanceof Function) {
        obj = Object.assign({}, replacer.call(value, undefined, value));

        for (const key in obj) {
          const value = replacer.call(obj, key, obj[key]);
          if (value === undefined || value instanceof Function) {
            delete obj[key];
            continue;
          }
          obj[key] = value;
        }
      }

      if (Array.isArray(replacer)) {
        obj = {};
        for (const key in value) {
          if (value[key] === undefined || value[key] instanceof Function || !replacer.includes(key)) {
            continue;
          }
          obj[key] = value[key];
        }
      }

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
          return this.push(value);
        })
        .catch(err => this.emit('error', err));
    }

    return this.push(value);
  }

};
