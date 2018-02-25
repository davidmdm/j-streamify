'use strict';

const {assert} = require('chai');
const JStream = require('../index');
const {Readable} = require('stream');

const JStream2Promise = function readFromJStream(value, replacer) {
  const stream = new JStream(value, replacer);
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
      return JStream2Promise(1).then(result => assert.equal(result, '1'));
    });

    it('boolean true should yield \'true\'', () => {
      return JStream2Promise(true).then(result => assert.equal(result, 'true'));
    });

    it('string "string" should yield \'"string"\'', () => {
      return JStream2Promise('string').then(result => assert.equal(result, '"string"'));
    });

    it('undefined should not yield anything', () => {
      return JStream2Promise(undefined).then(result => assert.equal(result, ''));
    });

    it('null should yield \'null\'', () => {
      return JStream2Promise(null).then(result => assert.equal(result, 'null'));
    });

    it('functions should yield empty string', () => {
      return JStream2Promise(function () {
      }).then(result => assert.equal(result, ''));
    })

  });

  describe('Promises', () => {

    it('stringify value resolved by promise', () => {
      const value = 'a string to stringify';
      const promise = new Promise(resolve => setTimeout(resolve, 10, value));
      return JStream2Promise(promise)
        .then(result => assert.equal(result, JSON.stringify(value)));
    });

    it('should emit error if promise fails', done => {

      const promise = new Promise((_, reject) => setTimeout(reject, 10, new Error('Promise failed')));
      JStream2Promise(promise)
        .then(() => done(new Error('Should not resolve')))
        .catch(err => assert.equal(err.message, 'Promise failed'))
        .then(() => done())
        .catch(done);
    })

  });

  describe('Readable stream', () => {

    it('stringify a readable stream', () => {
      const stream = new Readable();
      const data = ['some data', 'to stringify', 'with funky characters\r', '\n \t" " " ` ` @ '];
      data.forEach(x => stream.push(x));
      stream.push(null);

      return JStream2Promise(stream)
        .then(result => assert.equal(result, JSON.stringify(data.join(''))));
    });

    it('Readable streams in objectMode will throw an error', done => {
      const stream = new Readable({objectMode: true});
      stream.push(1);
      stream.push(true);
      stream.push({});
      stream.push(null);

      JStream2Promise(stream)
        .then(() => done(new Error('Reading from objectMode streams is not supported')))
        .catch(err => assert.equal(err.message, 'Readable streams in objectMode are not supported'))
        .then(() => done())
        .catch(done);
    });

    it('emits error if underlying readable stream does', done => {

      const stream = new Readable({
        read() {
          this.emit('error', new Error('src stream error'));
        },
      });

      JStream2Promise(stream)
        .then(() => done(new Error('Should fail when stream resource emits error')))
        .catch(err => assert.equal(err.message, 'src stream error'))
        .then(() => done())
        .catch(done);
    })

  });

  describe('Objects', () => {

    it('empty object should yield "{}"', () => {
      return JStream2Promise({}).then(result => assert.equal(result, '{}'));
    });

    it('should stringify regular objects', () => {

      const object = {
        number: 1,
        boolean: true,
        string: 'string',
        undefined: undefined,
        null: null,
      };

      return JStream2Promise(object)
        .then(result => assert.equal(result, JSON.stringify(object)));
    });

    it('should ignore keys that contain functions', () => {

      const object = {
        a: 1,
        fn: () => {
        },
        b: 2,
      };

      return JStream2Promise(object)
        .then(result => assert.equal(result, JSON.stringify({a: 1, b: 2})));

    });

    it('should strinfify object containing streams and promises', () => {

      const stream = new Readable();
      const data = ['some data', 'to stringify', 'with funky characters\r', '\n \t" " " ` ` @ '];
      data.forEach(x => stream.push(x));
      stream.push(null);

      const value = 'a string to stringify';
      const promise = new Promise(resolve => setTimeout(resolve, 10, value));

      const object = {
        stream,
        promise,
      };

      const expectedObject = JSON.stringify({
        stream: data.join(''),
        promise: value,
      });

      return JStream2Promise(object).then(result => assert.equal(result, expectedObject));
    });

  });

  describe('Arrays', () => {

    it('empty array should yield "[]"', () => {
      return JStream2Promise([]).then(result => assert.equal(result, '[]'));
    });

    it('should stringify regular arrays', () => {

      const array = [1, true, 'string', undefined, null];

      return JStream2Promise(array)
        .then(result => assert.equal(result, JSON.stringify(array)));
    });

    it('should stringify arrays containing streams and promises', () => {

      const stream = new Readable();
      const data = ['some data', 'to stringify', 'with funky characters\r', '\n \t" " " ` ` @ '];
      data.forEach(x => stream.push(x));
      stream.push(null);

      const value = 'a string to stringify';
      const promise = new Promise(resolve => setTimeout(resolve, 10, value));

      const array = [stream, promise];
      const expected = JSON.stringify([data.join(''), value]);

      return JStream2Promise(array).then(result => assert.equal(result, expected));
    });

  });

  describe('Stringify with a replacer', () => {

    describe('Array replacer', () => {

      it('partial match of keys and array', () => {
        const object = {a: 1, b: 2, c: 3};
        return JStream2Promise(object, ['a'])
          .then(result => assert.equal(result, JSON.stringify({a: 1})));
      });

      it('No match of keys and arrays', () => {
        const object = {a: 1, b: 2, c: 3};
        return JStream2Promise(object, ['d', 'e', 'f'])
          .then(result => assert.equal(result, '{}'));
      });

    });

    //describe()

  });

});
