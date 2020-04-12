'use strict';

function toJSON(value) {
  const ret = value && typeof value.toJSON === 'function' ? value.toJSON() : value;
  return ret;
}

module.exports = { toJSON };
