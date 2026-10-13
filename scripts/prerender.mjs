import { createServer } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pages, SITE_URL, OG_IMAGE, getRouteConfig, getSchema } from '../src/seo/site.mjs';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error' });
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
try {
  const { render } = await server.ssrLoadModule('/src/entry-server.tsx');
  const template = await readFile('dist/index.html', 'utf8');
  const manifest = JSON.parse(await readFile('dist/.vite/manifest.json', 'utf8'));
  const assets = Object.fromEntries(Object.entries(manifest).filter(([, entry]) => entry.file).map(([key, entry]) => [`/${key}`, `/${entry.file}`]));
  for (const path of [...pages.map(page => page.path), '/team/shared', '/404']) {
    const config = getRouteConfig(path);
    const dynamic = path === '/team/shared';
    const unknown = path === '/404';
    let html = template.replace(/<title>.*?<\/title>/, `<title>${escape(config.title)}</title>`)
      .replace(/(<meta name="description" content=")[^"]*/, `$1${escape(config.description)}`)
      .replace(/(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*/g, `$1${escape(config.title)}`)
      .replace(/(<meta (?:property="og:description"|name="twitter:description") content=")[^"]*/g, `$1${escape(config.description)}`)
      .replace(/(<meta property="og:url" content=")[^"]*/, `$1${SITE_URL}${config.path}`)
      .replace(/(<link rel="canonical" href=")[^"]*/, `$1${SITE_URL}${config.path}`)
      .replace('<!--seo-schema-->', dynamic || unknown ? '' : `<script id="site-schema" type="application/ld+json">${JSON.stringify(getSchema(path)).replaceAll('<', '\\u003c')}</script>`)
      .replace('<!--app-html-->', dynamic ? '' : render(path));
    if (dynamic || unknown) html = html.replace(/\s*<link rel="canonical"[^>]+>/, '').replace(/\s*<meta property="og:url"[^>]+>/, '');
    // SSR module URLs point at source assets; map them to Vite's hashed build files.
    for (const [source, destination] of Object.entries(assets)) html = html.replaceAll(encodeURI(source), encodeURI(destination));
    const output = path === '/' ? 'dist/index.html' : unknown ? 'dist/404.html' : dynamic ? 'dist/team/index.html' : `dist${path}/index.html`;
    await mkdir(output.slice(0, output.lastIndexOf('/')), { recursive: true });
    await writeFile(output, html);
  }
  await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(page => `  <url><loc>${SITE_URL}${page.path}</loc></url>`).join('\n')}\n</urlset>\n`);
  await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  console.log(`Prerendered ${pages.length} public pages, shared-team shell, and 404 page. OG: ${OG_IMAGE}`);
} finally {
  await server.close();
}
