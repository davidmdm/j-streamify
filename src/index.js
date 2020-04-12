'use strict';

const { Readable } = require('stream');

const { toJSON } = require('./util');
const { jsonGenerator } = require('./generators');

function jStream(obj, fn) {
  const value = toJSON(obj);
  const replacer = typeof fn === 'function' || Array.isArray(fn) ? fn : (_, x) => x;
  return Readable.from(jsonGenerator(value, replacer));
}

module.exports = { jStream };
