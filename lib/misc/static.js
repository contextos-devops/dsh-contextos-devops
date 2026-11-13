// 外部辅助：静态资源前缀路由（monaco/xterm/three/leaflet）。
import fsp from 'node:fs';
import path from 'node:path';

export const STATIC_MIME = {
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.map': 'application/json',
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
};

export const makeStatic = (prefix, root) => (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname);
      const rel = pathname.slice(prefix.length).replace(/^\/+/, '');
      const file = path.normalize(path.join(root, rel));
      if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
      const data = fsp.readFileSync(file);
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, { 'content-type': STATIC_MIME[ext] || 'application/octet-stream', 'cache-control': 'public, max-age=3600' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  };

