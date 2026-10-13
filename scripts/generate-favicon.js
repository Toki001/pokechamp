import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';

const svg = await readFile(new URL('../public/favicon.svg', import.meta.url));
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(size => sharp(svg).resize(size, size).png().toBuffer()));
// A genuine ICO directory with a PNG payload for each supported size.
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
images.forEach((image, index) => {
  const entry = 6 + index * 16;
  header[entry] = sizes[index];
  header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(image.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
await writeFile(new URL('../public/favicon.ico', import.meta.url), Buffer.concat([header, ...images]));
for (const [name, size] of [['apple-touch-icon', 180], ['favicon-192', 192], ['favicon-512', 512]]) {
  await sharp(svg).resize(Math.round(size * 0.7)).extend({ top: Math.floor(size * 0.15), bottom: Math.ceil(size * 0.15), left: Math.floor(size * 0.15), right: Math.ceil(size * 0.15), background: '#0b0c10' }).png().toFile(`public/${name}.png`);
}
console.log('Generated ICO, Apple touch icon, and manifest icons.');
