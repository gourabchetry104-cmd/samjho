// Local dev server: node server.js  ->  http://localhost:3000  (also serves /api/teach)
const http = require('http');
const fs = require('fs');
const path = require('path');

try { // tiny .env loader
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n').forEach((l) => {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch (e) { /* no .env */ }

const handler = require('./api/teach.js');
const PUB = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

http.createServer((req, res) => {
  if (req.url.startsWith('/api/teach')) {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 6e6) req.destroy(); });
    req.on('end', () => {
      try { req.body = body ? JSON.parse(body) : {}; } catch (e) { req.body = {}; }
      res.status = (c) => { res.statusCode = c; return res; };
      res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
      handler(req, res);
    });
    return;
  }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(PUB, p));
  if (!file.startsWith(PUB)) { res.statusCode = 403; return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
}).listen(process.env.PORT || 3000, () => console.log('Samjho running on http://localhost:' + (process.env.PORT || 3000)));
