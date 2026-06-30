import fs from 'fs';
import https from 'https';
import path from 'path';

const url = 'https://i.postimg.cc/zLSj2Pfg/logo.png';
const dest = path.join(process.cwd(), 'public', 'logo.png');

console.log('Downloading logo from:', url);
const file = fs.createWriteStream(dest);

https.get(url, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to download logo: Status Code ${response.statusCode}`);
    return;
  }
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Logo downloaded and saved successfully to public/logo.png');
  });
}).on('error', (err) => {
  fs.unlink(dest, () => {});
  console.error('Error downloading logo:', err.message);
});
