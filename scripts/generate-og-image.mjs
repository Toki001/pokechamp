import sharp from 'sharp';
// Code-native brand artwork: no external fonts or remote image dependencies.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#0b0c10"/><circle cx="1060" cy="80" r="320" fill="#131c2c"/><circle cx="160" cy="315" r="86" fill="#13141c" stroke="#0ea5e9" stroke-width="10"/><path d="M74 315h55m62 0h55" stroke="#0ea5e9" stroke-width="10"/><circle cx="160" cy="315" r="30" fill="#13141c" stroke="#0ea5e9" stroke-width="10"/>
<text x="290" y="290" font-family="Arial, sans-serif" font-size="92" font-weight="bold" fill="#ffffff">Poké<tspan fill="#38bdf8">Champ</tspan></text>
<text x="295" y="360" font-family="Arial, sans-serif" font-size="34" fill="#cbd5e1">Competitive Pokémon Team Builder</text><text x="295" y="415" font-family="Arial, sans-serif" font-size="28" fill="#38bdf8">Build. Share. Analyze.</text><rect x="80" y="550" width="1040" height="4" rx="2" fill="#0ea5e9"/></svg>`;
await sharp(Buffer.from(svg)).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile('public/og-image.png');
console.log('Generated 1200×630 Open Graph PNG.');
