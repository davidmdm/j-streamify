'use strict';

const JStream = require('./index');
const fs = require('fs');
const b64 = require('base64-stream');

const stream = fs.createReadStream('./davidJaconInn.png').pipe(b64.encode());

const r = new JStream([
    {
        a: 1,
        b: true,
        c: 'c value',
        promise: Promise.resolve({ x: 1 }),
        stream,
    },
    3,
    Promise.resolve("string")
]);

let x = '';
r.on('data', data => x += data);
r.on('end', () => {

    const json = JSON.parse(x);
    console.log(x)

});