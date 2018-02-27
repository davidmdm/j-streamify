# J-Streamify

Stream javascript objects as a json string.
Accepts promises and streams.

(note): versions <= 1.0.5  do not support objectMode streams.

(important!): Circular objects are not supported and will cause memory leaks. 

### Installing
```
npm install j-streamify --save
```

## Examples

use case: Sending file on disk to a legacy api as json:

```javascript
const JStream = require('j-streamify');

const payload = new JStream({
  filename: 'image.png',
  data: fs.createReadStream('path/to/png.png'),
  meta: metaData.find({name: 'image.png'}).then(x => x.data),
});

payload.pipe(request({ uri: '/destination', method: 'POST', json: true });
```

Converting a stream of objects to a stream of an equivalent JSON string:

```javascript
const writeStream = fs.createWriteStream('users.json');
new JStream(knex('users').select('*').stream()).pipe(writeStream);
```


## Tests
From the j-streamify root directory run:
```
npm install 
npm run test
```
This will generate a coverage report inside the root directory in a new directory called coverage

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
