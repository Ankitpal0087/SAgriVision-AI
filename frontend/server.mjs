import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const contentTypes = { '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const cropRecommendationRoot = path.join(root, 'crop-recommendation');

function safePath(requestUrl) {
  const requested = decodeURIComponent(new URL(requestUrl, `http://localhost:${port}`).pathname);
  if (requested === '/crop-recommendation' || requested === '/crop-recommendation/') return path.join(cropRecommendationRoot, 'index.html');
  if (requested.startsWith('/crop-recommendation/')) {
    const cropRelative = requested.slice('/crop-recommendation/'.length);
    const cropResolved = path.resolve(cropRecommendationRoot, cropRelative);
    if (!cropResolved.startsWith(`${cropRecommendationRoot}${path.sep}`)) return null;
    return path.extname(cropResolved) ? cropResolved : path.join(cropRecommendationRoot, 'index.html');
  }
  const relative = requested === '/' ? 'home.html' : requested.replace(/^\/+/, '');
  const resolved = path.resolve(root, relative);
  return resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
}

const server = http.createServer(async (request, response) => {
  const filePath = safePath(request.url || '/');
  if (!filePath) { response.writeHead(403); response.end('Forbidden'); return; }
  try {
    const body = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(port, () => console.log(`SAgriVision AI frontend running at http://localhost:${port}`));
