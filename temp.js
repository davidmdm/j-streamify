'use strict';

const { Readable, pipeline } = require('stream');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class SlowReader extends Readable {
  constructor() {
    super();
    this.chunks = ['hello', ' ', 'world', '!', '\n'];
    this.i = 0;
  }

  _read() {
    if (this.i === 3) {
      return this.emit('error', new Error('Banana hammock'));
    }

    sleep(Math.floor(1000 * Math.random())).then(() => {
      if (this.i === this.chunks.length) {
        this.push(null);
      } else {
        this.push(this.chunks[this.i++]);
      }
    });
  }
}

function main() {
  const r = Readable.from(gen(new SlowReader()));
  r.on('data', console.log);
  r.on('error', console.error);
}

main();

// main().then(console.log).catch(console.error);

async function* gen(stream) {
  for await (const chunk of stream) {
    yield chunk.toString();
  }
}

// const r = Readable.from(gen());

// pipeline(new SlowReader(), process.stdout, (err) => {
//   if (err) {
//     console.error(err);
//   }
// });
