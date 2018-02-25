# J-Streamify

Stream javascript objects as a json string.
Accepts promises and streams.

(note): Does not work with objectMode streams, or objects with circular references.

### Installing
```
npm install j-streamify --save
```

## Examples

Common use case: Sending file on disk to an api as json:

```javascript
const JStream = require('j-streamify');

const payload = new JStream({
  filename: 'image.png',
  data: fs.createReadStream('path/to/png.png'),
  meta: metaData.find({name: 'image.png'}).then(x => x.data),
});

payload.pipe(request/({ uri: '/destination', method: 'POST', json: true });
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
