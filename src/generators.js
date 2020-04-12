'use strict';

const { Readable } = require('stream');

const { toJSON } = require('./util');
const { ObjectReader } = require('./object.reader');

function* arrayGenerator(jstream, value, replacer) {
  const arr =
    typeof replacer === 'function'
      ? replacer.call(value, '', value).map((x, i, a) => {
          const value = replacer.call(a, i.toString(), x);
          if (value === undefined || value instanceof Function) {
            return null;
          }
          return value;
        })
      : value.map((x) => (x === undefined || x instanceof Function ? null : x));

  yield '[';

  for (let i = 0; i < arr.length; i++) {
    yield* jsonGenerator(jstream, toJSON(arr[i]), replacer);
    if (i !== arr.length - 1) {
      yield ',';
    }
  }
  yield ']';
}

function* objectGenerator(jstream, value, replacer) {
  yield '{';

  // As per JSON.stringify replacer param documentation, the replacer is called initially
  // on the object itself as the value and undefined as the key.

  const obj = (() => {
    if (typeof replacer === 'function') {
      const obj = Object.assign({}, replacer.call(value, undefined, value));
      for (const key in obj) {
        const value = replacer.call(obj, key, obj[key]);
        if (value === undefined || value instanceof Function) {
          delete obj[key];
          continue;
        }
        obj[key] = value;
      }
      return obj;
    }

    if (Array.isArray(replacer)) {
      const obj = {};
      for (const key in value) {
        if (value[key] === undefined || typeof value[key] === 'function' || !replacer.includes(key)) {
          continue;
        }
        obj[key] = value[key];
      }
      return obj;
    }

    return value;
  })();

  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    yield `"${keys[i]}":`;
    yield* jsonGenerator(jstream, toJSON(obj[keys[i]]), replacer);
    if (i !== keys.length - 1) {
      yield ',';
    }
  }
  yield '}';
}

function* jsonGenerator(jstream, value, replacer) {
  if (Array.isArray(value)) {
    return yield* arrayGenerator(jstream, value, replacer);
  }

  if (value instanceof Promise) {
    jstream.pMode = true;
    const resolved = yield value;
    jstream.pMode = false;
    return yield* jsonGenerator(jstream, resolved, replacer);
  }

  if (value instanceof Readable) {
    if (value.readableObjectMode) {
      jstream.src = new ObjectReader(value, replacer);
      jstream.src.once('end', () => {
        jstream.src = null;
        jstream._read();
      });
      jstream.src.once('error', (err) => jstream.emit('error', err));
      yield '[';
      yield ']';
    } else {
      value.once('end', () => {
        jstream.src = null;
        jstream._read();
      });
      value.once('error', (err) => jstream.emit('error', err));
      jstream.src = value;
      yield '"';
      yield '"';
    }

    return;
  }

  if (typeof value === 'object' && value !== null) {
    return yield* objectGenerator(jstream, value, replacer);
  }

  yield JSON.stringify(value);
}

module.exports = { jsonGenerator };
