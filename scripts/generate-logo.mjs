import { writeFile } from 'node:fs/promises';

// A crowned battle ball: a compact mark for competitive team building.
// The mark and wordmark share this artwork; the unrelated root logo.svg is never read.
const mark = `<defs>
<linearGradient id="champ-blue" x1="20" y1="32" x2="76" y2="90" gradientUnits="userSpaceOnUse"><stop stop-color="#38bdf8"/><stop offset="1" stop-color="#0284c7"/></linearGradient>
<clipPath id="ball-interior"><circle cx="48" cy="61" r="26"/></clipPath>
</defs>
<path d="M25 22 20 5 35 13 48 2 61 13 76 5 71 22Z" fill="#fbbf24"/>
<circle cx="48" cy="61" r="28" fill="#0b0c10"/>
<rect x="22" y="35" width="52" height="22" fill="url(#champ-blue)" clip-path="url(#ball-interior)"/>
<circle cx="48" cy="61" r="28" fill="none" stroke="url(#champ-blue)" stroke-width="8"/>
<circle cx="48" cy="61" r="10" fill="#0b0c10" stroke="#e0f2fe" stroke-width="5"/>
<circle cx="48" cy="61" r="3.5" fill="#38bdf8"/>`;

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">${mark}</svg>\n`;
const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 96" width="420" height="96" role="img" aria-labelledby="logo-title logo-description">
<title id="logo-title">PokéChamp</title><desc id="logo-description">A clean blue battle ball beneath a floating gold crown beside the PokéChamp wordmark.</desc>
${mark}
<text x="106" y="67" fill="#f8fafc" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="900" letter-spacing="-2">Poké<tspan fill="#38bdf8">Champ</tspan></text>
</svg>\n`;
await writeFile('public/logo.svg', logo);
await writeFile('public/favicon.svg', favicon);
console.log('Generated the PokéChamp wordmark and crowned-ball favicon.');
