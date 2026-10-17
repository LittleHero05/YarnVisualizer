import type { Plugin } from 'vite';
import type { ServerResponse } from 'node:http';
import { basicAuth, proxyImage, proxyRavelry } from './ravelry.js';

// Dev-server version of the Vercel functions in api/: same URLs, same shared logic.
//   /api/ravelry?p=<ravelry path + query>
//   /api/img?u=<image url>

export function ravelryProxy(username?: string, password?: string): Plugin {
  const auth = basicAuth(username, password);
  return {
    name: 'ravelry-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const u = new URL(req.url ?? '/', 'http://localhost');
        if (u.pathname === '/api/ravelry') return void proxyRavelry(u.searchParams.get('p'), auth).then((r) => send(res, r));
        if (u.pathname === '/api/img') return void proxyImage(u.searchParams.get('u')).then((r) => send(res, r));
        next();
      });
    },
  };
}

async function send(res: ServerResponse, r: Response) {
  res.statusCode = r.status;
  r.headers.forEach((v, k) => res.setHeader(k, v));
  res.end(Buffer.from(await r.arrayBuffer()));
}
