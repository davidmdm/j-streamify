'use strict';

const {assert} = require('chai');
const JStream = require('../index');
const {Readable} = require('stream');

const readFromJStream = function readFromJStream(value) {
  const stream = new JStream(value);
  return new Promise((resolve, reject) => {
    let result = '';
    stream.on('data', data => result += data);
    stream.on('error', reject);
    stream.on('end', () => resolve(result));
  });
};

describe('j-streamify tests', () => {

  describe('Primitive types', () => {

    it('number 1 should yield \'1\'', () => {
      return readFromJStream(1).then(result => assert.equal(result, '1'));
    });

    it('boolean true should yield \'true\'', () => {
      return readFromJStream(true).then(result => assert.equal(result, 'true'));
    });

    it('string "string" should yield \'"string"\'', () => {
      return readFromJStream('string').then(result => assert.equal(result, '"string"'));
    });

    it('undefined should not yield anything', () => {
      return readFromJStream(undefined).then(result => assert.equal(result, ''));
    });

    it('null shoudl yield \'null\'', () => {
      return readFromJStream(null).then(result => assert.equal(result, 'null'));
    });

  });

  describe('Promises', () => {

    it('stringify value resolved by promise', () => {
      const value = 'a string to stringify';
      const promise = new Promise(resolve => setTimeout(resolve, 100, value));
      return readFromJStream(promise)
        .then(result => assert.equal(result, JSON.stringify(value)));
    });

  });

  describe('Readable stream', () => {

    it('stringify a readable stream', () => {
      const stream = new Readable();
      const data = ['some data', 'to stringify', 'with funky characters\r', '\n \t" " " ` ` @ '];
      data.forEach(x => stream.push(x));
      stream.push(null);

      return readFromJStream(stream)
        .then(result => assert.equal(result, JSON.stringify(data.join(''))));
    });

    it('Readable streams in objectMode will throw an error', done => {
      const stream = new Readable({ objectMode: true });
      stream.push(1);
      stream.push(true);
      stream.push({});
      stream.push(null);

      readFromJStream(stream)
        .then(() => done(new Error('Reading from objectMode streams is not supported')))
        .catch(err => assert.equal(err.message, 'Readable streams in objectMode are not supported'))
        .then(() => done())
        .catch(done);
    });

  });

  describe('Objects', () => {

    it('empty object should yield "{}"', () => {
      return readFromJStream({}).then(result => assert.equal(result, '{}'));
    });

    it('should stringify regular objects', () => {

      const object = {
        number: 1,
        boolean: true,
        string: 'string',
        undefined: undefined,
        null: null,
      };

      return readFromJStream(object)
        .then(result => assert.equal(result, JSON.stringify(object)));
    });

    it('should strinfify object containing streams and promises', () => {

      const stream = new Readable();
      const data = ['some data', 'to stringify', 'with funky characters\r', '\n \t" " " ` ` @ '];
      data.forEach(x => stream.push(x));
      stream.push(null);

      const value = 'a string to stringify';
      const promise = new Promise(resolve => setTimeout(resolve, 100, value));

      const object = {
        stream,
        promise,
      };

      const expectedObject = JSON.stringify({
        stream: data.join(''),
        promise: value,
      });

      return readFromJStream(object).then(result => assert.equal(result, expectedObject));
    });

  });

  describe('Arrays', () => {

    it('empty array should yield "[]"', () => {
      return readFromJStream([]).then(result => assert.equal(result, '[]'));
    });

    it('should stringify regular arrays', () => {

      const array = [1, true, 'string', undefined, null];

      return readFromJStream(array)
        .then(result => assert.equal(result, JSON.stringify(array)));
    });

    it('should stringify arrays containing streams and promises', () => {

      const stream = new Readable();
      const data = ['some data', 'to stringify', 'with funky characters\r', '\n \t" " " ` ` @ '];
      data.forEach(x => stream.push(x));
      stream.push(null);

      const value = 'a string to stringify';
      const promise = new Promise(resolve => setTimeout(resolve, 100, value));

      const array = [stream, promise];
      const expected = JSON.stringify([data.join(''), value]);

      return readFromJStream(array).then(result => assert.equal(result, expected));
    });

  });

});