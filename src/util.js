'use strict';

function toJSON(value) {
  return value && typeof value.toJSON === 'function' ? value.toJSON() : value;
}

module.exports = { toJSON };
