#!/usr/bin/env bun
import { resolve, extname, normalize } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = resolve(import.meta.dir);
const PORT = Number(process.env.PORT || 3000);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = decodeURIComponent(url.pathname);
    if (path === '/' || path === '') path = '/ponypen.html';
    const safe = normalize(path).replace(/^\/+/, '');
    const file = resolve(ROOT, safe);
    if (!file.startsWith(ROOT) || !existsSync(file)) return new Response('Not found', { status: 404 });
    const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
    return new Response(Bun.file(file), { headers: { 'content-type': type } });
  },
});

console.log(`PonyPen web shell at http://localhost:${PORT}/`);
