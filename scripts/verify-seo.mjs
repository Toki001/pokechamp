import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import sharp from 'sharp';
import { pages, SITE_URL } from '../src/seo/site.mjs';

const readJSON = async path => JSON.parse(await readFile(path, 'utf8'));
const originals = await readJSON('src/data/pokemon_championsdex_full.json');
const packed = await readJSON('src/data/generated/champions.json');
for (const mon of packed.pokemon) {
  assert.deepEqual({ ...mon, moves: mon.moves.map(id => packed.moves[id]) }, originals[mon.pokemon], `Data changed for ${mon.pokemon}`);
}
const meta = await readJSON('src/data/metaroll_stats.json');
for (const mon of meta.doubles) assert.deepEqual(await readJSON(`src/data/generated/meta/${mon.pokemon}.json`), mon);

for (const page of pages) {
  const html = await readFile(`dist${page.path === '/' ? '' : page.path}/index.html`, 'utf8');
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${page.path}: one H1`);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.ok(html.includes(`rel="canonical" href="${SITE_URL}${page.path}"`));
  assert.ok(html.includes(`<title>${page.title.replaceAll('&', '&amp;')}</title>`));
  assert.ok(html.includes('name="description"'));
  assert.ok(!/noindex|REPLACE_WITH_YOUR_CODE|\/src\/assets|<!--app-html-->/.test(html));
  const schema = html.match(/<script id="site-schema" type="application\/ld\+json">(.*?)<\/script>/s);
  assert.ok(schema, `${page.path}: structured data in initial HTML`);
  const graph = JSON.parse(schema[1])['@graph'];
  const website = graph.find(item => item['@type'] === 'WebSite');
  assert.equal(website.name, 'PokéChamp');
  assert.ok(website.alternateName.includes('PokeChamp'));
  assert.ok(graph.some(item => item.logo?.url === `${SITE_URL}/logo.svg`));
  assert.ok(JSON.parse(schema[1])['@graph'].some(item => item.url === `${SITE_URL}${page.path}`));
  for (const image of html.matchAll(/<img\b[^>]*>/g)) assert.match(image[0], /\balt="[^"]+"/, `${page.path}: descriptive image alt`);
  // Check every local resource and navigation link in the static HTML.
  for (const match of html.matchAll(/(?:src|href)="(\/[^"#]*)"/g)) {
    const path = decodeURIComponent(match[1].split('?')[0]);
    if (pages.some(page => page.path === path)) continue;
    await stat(`dist${path}`);
  }
}
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]), pages.map(page => `${SITE_URL}${page.path}`));
assert.match(await readFile('dist/robots.txt', 'utf8'), new RegExp(`Sitemap: ${SITE_URL}/sitemap.xml`));
assert.ok((await readFile('dist/llms.txt', 'utf8')).includes('# PokéChamp'));
assert.equal(await readFile('dist/google711de76d62b8d616.html', 'utf8'), await readFile('public/google711de76d62b8d616.html', 'utf8'));
const ico = await readFile('dist/favicon.ico');
assert.equal(ico.readUInt16LE(0), 0);
assert.equal(ico.readUInt16LE(2), 1);
assert.equal(ico.readUInt16LE(4), 3);
assert.deepEqual([(await sharp('dist/og-image.png').metadata()).width, (await sharp('dist/og-image.png').metadata()).height], [1200, 630]);
for (const size of [192, 512]) assert.equal((await sharp(`dist/favicon-${size}.png`).metadata()).width, size);
assert.equal((await sharp('dist/apple-touch-icon.png').metadata()).width, 180);
const deployment = await readJSON('vercel.json');
assert.ok(!deployment.rewrites.some(rule => rule.source === '/(.*)'), 'Missing URLs must retain a real 404 response');
assert.ok((await readFile('dist/404.html', 'utf8')).includes('Page Not Found'));
assert.ok(!(await readFile('dist/team/index.html', 'utf8')).includes('rel="canonical"'), 'Shared-team shell must not declare the homepage canonical');
console.log('SEO, links, favicon formats, and lossless data round-trip checks passed.');
