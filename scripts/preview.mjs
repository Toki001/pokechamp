import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const configuration = JSON.parse(await readFile('vercel.json', 'utf8'));
const root = resolve('dist');
const argument = (name, fallback) => process.argv[process.argv.indexOf(name) + 1] || fallback;
const host = process.argv.includes('--host') ? argument('--host', '127.0.0.1') : '127.0.0.1';
const port = Number(process.argv.includes('--port') ? argument('--port', '4173') : '4173');
const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${host}:${port}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.length > 1 && pathname.endsWith('/')) {
      response.writeHead(308, { Location: pathname.replace(/\/+$/, '') + url.search });
      response.end(); return;
    }
    const redirect = configuration.redirects.find(rule => rule.source === pathname);
    if (redirect) { response.writeHead(308, { Location: redirect.destination + url.search }); response.end(); return; }
    const rewrite = configuration.rewrites.find(rule => rule.source === pathname || rule.source === '/team/:teamId' && /^\/team\/[^/]+$/.test(pathname));
    pathname = rewrite?.destination || (pathname === '/' ? '/index.html' : pathname);
    let file = resolve(root, `.${pathname}`);
    if (!file.startsWith(root + sep)) { response.writeHead(400); response.end(); return; }
    let status = 200;
    try { if (!(await stat(file)).isFile()) throw new Error('Not a file'); }
    catch { file = resolve(root, '404.html'); status = 404; }
    const body = await readFile(file);
    const headers = { 'Content-Type': contentTypes[extname(file)] || 'application/octet-stream', 'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' };
    if (request.headers['accept-encoding']?.includes('gzip') && /\.(html|js|css|json|svg|xml|txt)$/.test(file)) {
      headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding';
      response.writeHead(status, headers); response.end(request.method === 'HEAD' ? undefined : gzipSync(body));
    } else { response.writeHead(status, headers); response.end(request.method === 'HEAD' ? undefined : body); }
  } catch { response.writeHead(500); response.end('Preview request failed'); }
}).listen(port, host, () => console.log(`Production preview: http://${host}:${port}`));
