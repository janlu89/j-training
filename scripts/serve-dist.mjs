// Serves the production build like GitHub Pages: under /j-training/, unknown paths answered with
// index.html (the 404.html fallback of the deploy). Used by the PWA end-to-end tests.
// Usage: node scripts/serve-dist.mjs [port]
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';

const ROOT = join(import.meta.dirname, '..', 'dist', 'j-training', 'browser');
const BASE = '/j-training/';
const PORT = Number(process.argv[2] ?? 4400);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/** The file for a URL path, or undefined when it does not exist or leaves the build folder. */
async function fileFor(pathname) {
  const relative = decodeURIComponent(pathname.slice(BASE.length)) || 'index.html';
  const path = normalize(join(ROOT, relative));
  if (!path.startsWith(ROOT + sep)) {
    return undefined;
  }
  try {
    return (await stat(path)).isFile() ? path : undefined;
  } catch {
    return undefined;
  }
}

createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost');
  if (!pathname.startsWith(BASE)) {
    response.writeHead(302, { location: BASE }).end();
    return;
  }
  const file = (await fileFor(pathname)) ?? join(ROOT, 'index.html');
  response.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-cache',
  });
  createReadStream(file).pipe(response);
}).listen(PORT, () => console.log(`Serving ${ROOT} at http://localhost:${PORT}${BASE}`));
