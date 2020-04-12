'use strict';

const { Readable } = require('stream');

const { toJSON } = require('./util');

async function* arrayGenerator(value, replacer) {
  const arr =
    typeof replacer === 'function'
      ? replacer.call(value, '', value).map((x, i, a) => {
          const value = replacer.call(a, i.toString(), x);
          if (value === undefined || typeof value === 'function') {
            return null;
          }
          return value;
        })
      : value.map((x) => (x === undefined || typeof x === 'function' ? null : x));

  yield '[';

  for (let i = 0; i < arr.length; i++) {
    yield* jsonGenerator(toJSON(arr[i]), replacer);
    if (i !== arr.length - 1) {
      yield ',';
    }
  }
  yield ']';
}

async function* objectGenerator(value, replacer) {
  yield '{';

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
    yield* jsonGenerator(toJSON(obj[keys[i]]), replacer);
    if (i !== keys.length - 1) {
      yield ',';
    }
  }
  yield '}';
}

async function* jsonGenerator(value, replacer) {
  if (Array.isArray(value)) {
    return yield* arrayGenerator(value, replacer);
  }

  if (value instanceof Promise) {
    return yield* jsonGenerator(await value, replacer);
  }

  if (value instanceof Readable) {
    if (value.readableObjectMode) {
      yield '[';
      let first = true;
      for await (const elem of value) {
        if (first) {
          first = false;
        } else {
          yield ',';
        }
        if (elem === undefined || typeof elem === 'function') {
          yield 'null';
        } else {
          yield* jsonGenerator(elem, replacer);
        }
      }
      yield ']';
    } else {
      yield '"';
      for await (const chunk of value) {
        yield JSON.stringify(chunk.toString()).slice(1, -1);
      }
      yield '"';
    }
    return;
  }

  if (typeof value === 'object' && value !== null) {
    return yield* objectGenerator(value, replacer);
  }

  if (value === undefined || typeof value === 'function') {
    return;
  }

  yield JSON.stringify(value);
}

module.exports = { jsonGenerator };
