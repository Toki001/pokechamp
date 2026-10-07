import sharp from 'sharp';
import fs from 'fs';

async function generateFavicon() {
  try {
    const svgBuffer = fs.readFileSync('./public/favicon.svg');
    await sharp(svgBuffer)
      .resize(48, 48)
      .toFormat('png')
      .toFile('./public/favicon.ico'); // Outputting as PNG data but naming it .ico works for most browsers and Google Search
    console.log('Favicon successfully generated at ./public/favicon.ico');
  } catch (error) {
    console.error('Error generating favicon:', error);
  }
}

generateFavicon();
