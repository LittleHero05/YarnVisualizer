// Ravelry proxy logic shared by the Vite dev server (server/ravelryProxy.ts) and the
// Vercel functions (api/). Credentials stay server-side; the browser only sees results.

const API = 'https://api.ravelry.com';
const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; status: number; body: string }>();

/** Only the read endpoints the app uses, so the key can't be used for anything else. */
const ALLOWED_PATHS = [
  /^\/patterns\/search\.json(\?|$)/,
  /^\/patterns\/\d+\.json$/,
  /^\/yarns\/search\.json(\?|$)/,
  /^\/yarns\/\d+\.json$/,
];

/** Lets the CDN cache identical requests, which keeps us well inside Ravelry's rate limits. */
export const CDN_CACHE = 'public, max-age=60, s-maxage=600, stale-while-revalidate=86400';

export function basicAuth(username?: string, password?: string): string {
  return username && password ? 'Basic ' + btoa(`${username}:${password}`) : '';
}

export function isAllowedPath(path: string): boolean {
  return ALLOWED_PATHS.some((re) => re.test(path));
}

const json = (status: number, body: unknown, cacheable = false) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': cacheable ? CDN_CACHE : 'no-store' },
  });

/** `path` is the Ravelry path plus query, e.g. "/patterns/search.json?query=flax". */
export async function proxyRavelry(path: string | null, auth: string): Promise<Response> {
  if (!path || !isAllowedPath(path)) return json(400, { error: 'path_not_allowed' });
  if (!auth) return json(503, { error: 'missing_credentials' });
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL_MS) return json(hit.status, hit.body, true);
  try {
    const upstream = await fetch(API + path, { headers: { Authorization: auth } });
    const body = await upstream.text();
    if (upstream.ok) cache.set(path, { at: Date.now(), status: upstream.status, body });
    return json(upstream.status, body, upstream.ok);
  } catch {
    return json(502, { error: 'upstream_unreachable' });
  }
}

/** Image bytes from Ravelry's image CDN, so the browser can sample colors from a canvas. */
export async function proxyImage(rawUrl: string | null): Promise<Response> {
  let url: URL;
  try {
    url = new URL(rawUrl ?? '');
  } catch {
    return new Response('bad url', { status: 400 });
  }
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.ravelrycache.com')) {
    return new Response('host not allowed', { status: 403 });
  }
  try {
    const upstream = await fetch(url);
    const type = upstream.headers.get('content-type') ?? '';
    if (!upstream.ok || !type.startsWith('image/')) return new Response('not an image', { status: 502 });
    return new Response(await upstream.arrayBuffer(), {
      status: 200,
      headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
    });
  } catch {
    return new Response('upstream_unreachable', { status: 502 });
  }
}
