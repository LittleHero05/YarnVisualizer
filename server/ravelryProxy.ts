import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Dev-server middleware that keeps Ravelry credentials server-side.
//   /api/ravelry/<path>  → https://api.ravelry.com/<path> with Basic auth, cached in memory
//   /api/img?u=<url>     → image bytes from *.ravelrycache.com, so the browser can sample colors from a canvas
// The same handler shape can be moved into a serverless function for production.

const API = 'https://api.ravelry.com';
const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; status: number; body: string }>();

export function ravelryProxy(username?: string, password?: string): Plugin {
  const auth = username && password ? 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64') : '';

  async function handleApi(path: string, res: ServerResponse) {
    if (!auth) {
      return send(res, 503, JSON.stringify({ error: 'missing_credentials' }), 'application/json');
    }
    const hit = cache.get(path);
    if (hit && Date.now() - hit.at < TTL_MS) return send(res, hit.status, hit.body, 'application/json');
    try {
      const upstream = await fetch(API + path, { headers: { Authorization: auth } });
      const body = await upstream.text();
      if (upstream.ok) cache.set(path, { at: Date.now(), status: upstream.status, body });
      send(res, upstream.status, body, 'application/json');
    } catch {
      send(res, 502, JSON.stringify({ error: 'upstream_unreachable' }), 'application/json');
    }
  }

  async function handleImg(rawUrl: string | null, res: ServerResponse) {
    let url: URL;
    try {
      url = new URL(rawUrl ?? '');
    } catch {
      return send(res, 400, 'bad url', 'text/plain');
    }
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.ravelrycache.com')) {
      return send(res, 403, 'host not allowed', 'text/plain');
    }
    try {
      const upstream = await fetch(url);
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.statusCode = upstream.status;
      res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.end(buf);
    } catch {
      send(res, 502, 'upstream_unreachable', 'text/plain');
    }
  }

  return {
    name: 'ravelry-proxy',
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const u = new URL(req.url ?? '/', 'http://localhost');
        if (u.pathname.startsWith('/api/ravelry/')) {
          return void handleApi(u.pathname.slice('/api/ravelry'.length) + u.search, res);
        }
        if (u.pathname === '/api/img') return void handleImg(u.searchParams.get('u'), res);
        next();
      });
    },
  };
}

function send(res: ServerResponse, status: number, body: string, type: string) {
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  res.end(body);
}
