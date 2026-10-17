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
export const CDN_CACHE = 'public, max-age=60, s-maxage=600, stale-while-revalidate=3600';
/** Ravelry photos: kept about an hour, then re-fetched (license 2c). */
export const IMG_CACHE = 'public, max-age=3600, s-maxage=3600';
/**
 * Cached copies are keyed on these request headers, so the CDN never hands a copy made for
 * this site to a request that didn't pass the origin check (it reaches the function instead).
 */
export const CACHE_VARY = 'Sec-Fetch-Site, Origin';

// ---------- access guard (license 1i: the proxy is for this app's own pages only) ----------

/** Hosts allowed to call the proxy when the browser doesn't send Sec-Fetch-Site: same-origin. */
const ALLOWED_HOSTS = [/^localhost$/, /^127\.0\.0\.1$/, /^yarn-visualizer\.vercel\.app$/, /^yarn-visualizer-[a-z0-9-]+\.vercel\.app$/];

const hostOf = (value: string | null): string | null => {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
};

/** Same-site requests only: Sec-Fetch-Site, else the Origin/Referer host against the allowlist. */
export function isAllowedOrigin(headers: Headers, extra = process.env.ALLOWED_ORIGINS ?? ''): boolean {
  if (headers.get('sec-fetch-site') === 'same-origin') return true;
  const host = hostOf(headers.get('origin')) ?? hostOf(headers.get('referer'));
  if (!host) return false;
  // ALLOWED_ORIGINS: comma-separated hosts or origins, e.g. "swatchjournal.com,https://www.swatchjournal.com".
  const extraHosts = extra.split(',').map((h) => h.trim().toLowerCase()).filter(Boolean).map((h) => hostOf(h.includes('://') ? h : `https://${h}`));
  return ALLOWED_HOSTS.some((re) => re.test(host)) || extraHosts.includes(host);
}

// Best-effort, fixed-window rate limit. It lives in memory per server instance, so with several
// Vercel instances the real ceiling is higher; Vercel Firewall rate-limit rules are the stronger option.
export const RATE_LIMITS = { ravelry: 60, img: 120, subscribe: 5 } as const;
const WINDOW_MS = 60 * 1000;
const hits = new Map<string, { start: number; count: number }>();
let lastPrune = 0;

export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0].trim() || headers.get('x-real-ip')?.trim() || 'local';
}

/** Seconds to wait if this request is over the limit, else 0. */
export function rateLimit(key: string, limit: number, now = Date.now()): number {
  if (now - lastPrune > WINDOW_MS) {
    for (const [k, v] of hits) if (now - v.start >= WINDOW_MS) hits.delete(k);
    lastPrune = now;
  }
  const h = hits.get(key);
  if (!h || now - h.start >= WINDOW_MS) {
    hits.set(key, { start: now, count: 1 });
    return 0;
  }
  h.count++;
  return h.count > limit ? Math.ceil((h.start + WINDOW_MS - now) / 1000) : 0;
}

/** A 403/429 response if the request shouldn't be served, else null. Never cached. */
export function guard(headers: Headers, route: keyof typeof RATE_LIMITS): Response | null {
  if (!isAllowedOrigin(headers)) return json(403, { error: 'forbidden_origin' });
  const wait = rateLimit(`${route}:${clientIp(headers)}`, RATE_LIMITS[route]);
  if (!wait) return null;
  const r = json(429, { error: 'rate_limited' });
  r.headers.set('Retry-After', String(wait));
  return r;
}

export function basicAuth(username?: string, password?: string): string {
  return username && password ? 'Basic ' + btoa(`${username}:${password}`) : '';
}

export function isAllowedPath(path: string): boolean {
  return ALLOWED_PATHS.some((re) => re.test(path));
}

const json = (status: number, body: unknown, cacheable = false) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...(cacheable ? { 'Cache-Control': CDN_CACHE, Vary: CACHE_VARY } : { 'Cache-Control': 'no-store' }) },
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
      headers: { 'Content-Type': type, 'Cache-Control': IMG_CACHE, Vary: CACHE_VARY },
    });
  } catch {
    return new Response('upstream_unreachable', { status: 502 });
  }
}
