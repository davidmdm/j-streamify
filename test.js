'use strict';

const JStream = require('./index');
const fs = require('fs');
const b64 = require('base64-stream');

const stream = fs.createReadStream('./image.png').pipe(b64.encode());
const textStream = fs.createReadStream('./text.txt');

const replacer = function (key, value) {
  if (key === 'text' && value) {
    return fs.createReadStream(value);
  }
  return undefined;
};

const r = new JStream(//[
  {
    a: 1,
    b: true,
    c: 'c value',
    promise: Promise.resolve({ x: 1 }),
    stream,
    text: './text.txt',
    fn: function () {
      return 2;
    },
  }//,
  //Promise.resolve("string"),
/*]*/, replacer);

let x = '';
r.on('data', data => console.log(data.toString()));
// r.on('end', () => {
//
//   try {
//     const json = JSON.parse(x);
//     console.log(x)
//   } catch(err) {
//     console.log(err);
//     console.log(x);
//   }
//
//
// });