import type { Plugin } from 'vite';
import type { IncomingHttpHeaders, ServerResponse } from 'node:http';
import { basicAuth, guard, proxyImage, proxyRavelry } from './ravelry.js';
import { handleSubscribe } from './subscribe.js';

// Dev-server version of the Vercel functions in api/: same URLs, same shared logic.
//   /api/ravelry?p=<ravelry path + query>
//   /api/img?u=<image url>
//   POST /api/subscribe

export function ravelryProxy(username?: string, password?: string): Plugin {
  const auth = basicAuth(username, password);
  return {
    name: 'ravelry-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const u = new URL(req.url ?? '/', 'http://localhost');
        if (u.pathname === '/api/subscribe') {
          const chunks: Buffer[] = [];
          req.on('data', (c: Buffer) => chunks.push(c));
          req.on('end', () => {
            const body = req.method === 'POST' ? Buffer.concat(chunks) : undefined;
            const request = new Request(u.href, { method: req.method, headers: toHeaders(req.headers), body });
            void handleSubscribe(request).then((r) => send(res, r));
          });
          return;
        }
        const route = u.pathname === '/api/ravelry' ? 'ravelry' : u.pathname === '/api/img' ? 'img' : null;
        if (!route) return next();
        const blocked = guard(toHeaders(req.headers), route);
        if (blocked) return void send(res, blocked);
        if (route === 'ravelry') return void proxyRavelry(u.searchParams.get('p'), auth).then((r) => send(res, r));
        void proxyImage(u.searchParams.get('u')).then((r) => send(res, r));
      });
    },
  };
}

function toHeaders(h: IncomingHttpHeaders): Headers {
  const out = new Headers();
  for (const [k, v] of Object.entries(h)) if (v !== undefined) out.set(k, Array.isArray(v) ? v.join(', ') : v);
  return out;
}

async function send(res: ServerResponse, r: Response) {
  res.statusCode = r.status;
  r.headers.forEach((v, k) => res.setHeader(k, v));
  res.end(Buffer.from(await r.arrayBuffer()));
}
