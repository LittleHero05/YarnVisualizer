import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as apiImg } from '../api/img';
import { GET as apiRavelry } from '../api/ravelry';
import { basicAuth, clientIp, isAllowedOrigin, isAllowedPath, proxyImage, proxyRavelry, rateLimit } from './ravelry';

const sameOrigin = { 'Sec-Fetch-Site': 'same-origin' };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('ravelry proxy', () => {
  it('only allows the read endpoints the app uses', () => {
    expect(isAllowedPath('/patterns/search.json?query=flax&pc=sweater')).toBe(true);
    expect(isAllowedPath('/patterns/443533.json')).toBe(true);
    expect(isAllowedPath('/yarns/search.json?weight=worsted')).toBe(true);
    expect(isAllowedPath('/yarns/68219.json')).toBe(true);
    expect(isAllowedPath('/current_user.json')).toBe(false);
    expect(isAllowedPath('/patterns/search.json/../../current_user.json')).toBe(false);
    expect(isAllowedPath('//evil.example/patterns/1.json')).toBe(false);
    expect(isAllowedPath('/messages/list.json')).toBe(false);
  });

  it('rejects disallowed paths and reports missing credentials', async () => {
    expect((await proxyRavelry('/current_user.json', 'Basic x')).status).toBe(400);
    expect((await proxyRavelry('/yarns/1.json', '')).status).toBe(503);
  });

  it('forwards with auth, sets CDN caching and serves repeats from memory', async () => {
    const fetchMock = vi.fn(async (_url: string | URL, _init?: RequestInit) => new Response('{"yarn":{}}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const auth = basicAuth('read-abc', 'secret');
    const r1 = await proxyRavelry('/yarns/424242.json', auth);
    const r2 = await proxyRavelry('/yarns/424242.json', auth);
    expect(r1.status).toBe(200);
    expect(await r2.text()).toBe('{"yarn":{}}');
    expect(r1.headers.get('cache-control')).toContain('s-maxage');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]).toEqual(['https://api.ravelry.com/yarns/424242.json', { headers: { Authorization: auth } }]);
  });

  it('does not cache errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string | URL, _init?: RequestInit) => new Response('nope', { status: 500 })));
    const r = await proxyRavelry('/yarns/999.json', 'Basic x');
    expect(r.status).toBe(500);
    expect(r.headers.get('cache-control')).toBe('no-store');
  });

  it('Vercel function reads credentials from the environment', async () => {
    vi.stubEnv('RAVELRY_USERNAME', 'read-env');
    vi.stubEnv('RAVELRY_PASSWORD', 'pw');
    const fetchMock = vi.fn(async (_url: string | URL, _init?: RequestInit) => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const p = encodeURIComponent('/patterns/search.json?query=flax');
    const r = await apiRavelry(new Request(`https://yarn-visualizer.vercel.app/api/ravelry?p=${p}`, { headers: sameOrigin }));
    expect(r.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.ravelry.com/patterns/search.json?query=flax');
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual({ Authorization: basicAuth('read-env', 'pw') });
  });
});

describe('image proxy', () => {
  it('only fetches images from Ravelry\'s CDN', async () => {
    expect((await proxyImage('https://evil.example/x.jpg')).status).toBe(403);
    expect((await proxyImage('http://images4-a.ravelrycache.com/x.jpg')).status).toBe(403);
    expect((await proxyImage('not a url')).status).toBe(400);
    vi.stubGlobal('fetch', vi.fn(async (_url: string | URL, _init?: RequestInit) => new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } })));
    expect((await proxyImage('https://images4-a.ravelrycache.com/x.jpg')).status).toBe(502);
  });
});

describe('access guard', () => {
  const h = (init: Record<string, string>) => new Headers(init);

  it('allows same-origin requests and allowlisted Origin/Referer hosts', () => {
    expect(isAllowedOrigin(h({ 'Sec-Fetch-Site': 'same-origin' }), '')).toBe(true);
    expect(isAllowedOrigin(h({ Origin: 'http://localhost:5173' }), '')).toBe(true);
    expect(isAllowedOrigin(h({ Referer: 'http://127.0.0.1:4173/?x=1' }), '')).toBe(true);
    expect(isAllowedOrigin(h({ Referer: 'https://yarn-visualizer.vercel.app/' }), '')).toBe(true);
    expect(isAllowedOrigin(h({ Origin: 'https://yarn-visualizer-git-main-someone.vercel.app' }), '')).toBe(true);
  });

  it('rejects foreign origins, cross-site fetches and requests with no headers', () => {
    expect(isAllowedOrigin(h({}), '')).toBe(false);
    expect(isAllowedOrigin(h({ Origin: 'https://evil.example' }), '')).toBe(false);
    expect(isAllowedOrigin(h({ 'Sec-Fetch-Site': 'cross-site', Origin: 'https://evil.example' }), '')).toBe(false);
    expect(isAllowedOrigin(h({ Origin: 'https://other-app.vercel.app' }), '')).toBe(false);
    expect(isAllowedOrigin(h({ Referer: 'https://localhost.evil.example/' }), '')).toBe(false);
  });

  it('accepts extra hosts from ALLOWED_ORIGINS', () => {
    const extra = 'swatchjournal.com, https://www.swatchjournal.com';
    expect(isAllowedOrigin(h({ Origin: 'https://swatchjournal.com' }), extra)).toBe(true);
    expect(isAllowedOrigin(h({ Referer: 'https://www.swatchjournal.com/a' }), extra)).toBe(true);
    expect(isAllowedOrigin(h({ Origin: 'https://evil.example' }), extra)).toBe(false);
    vi.stubEnv('ALLOWED_ORIGINS', 'swatchjournal.com');
    expect(isAllowedOrigin(h({ Origin: 'https://swatchjournal.com' }))).toBe(true);
  });

  it('Vercel functions return an uncached 403 for foreign or headerless requests', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const p = encodeURIComponent('/yarns/1.json');
    for (const headers of [{}, { Origin: 'https://evil.example' }] as Record<string, string>[]) {
      const r = await apiRavelry(new Request(`https://yarn-visualizer.vercel.app/api/ravelry?p=${p}`, { headers }));
      expect(r.status).toBe(403);
      expect(await r.json()).toEqual({ error: 'forbidden_origin' });
      expect(r.headers.get('cache-control')).toBe('no-store');
    }
    const img = await apiImg(new Request('https://yarn-visualizer.vercel.app/api/img?u=https%3A%2F%2Fimages4-a.ravelrycache.com%2Fx.jpg'));
    expect(img.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reads the client IP from proxy headers', () => {
    expect(clientIp(h({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4');
    expect(clientIp(h({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8');
    expect(clientIp(h({}))).toBe('local');
  });

  it('rate limits per key per minute', () => {
    const t = 1_000_000;
    for (let i = 0; i < 60; i++) expect(rateLimit('test:a', 60, t + i)).toBe(0);
    expect(rateLimit('test:a', 60, t + 100)).toBeGreaterThan(0);
    expect(rateLimit('test:b', 60, t + 100)).toBe(0);
    expect(rateLimit('test:a', 60, t + 60_000)).toBe(0);
  });

  it('the 61st /api/ravelry request in a minute gets an uncached 429 with Retry-After', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
    const p = encodeURIComponent('/yarns/61.json');
    const call = () => apiRavelry(new Request(`https://yarn-visualizer.vercel.app/api/ravelry?p=${p}`, { headers: { ...sameOrigin, 'x-forwarded-for': '203.0.113.61' } }));
    for (let i = 0; i < 60; i++) expect((await call()).status).not.toBe(429);
    const r = await call();
    expect(r.status).toBe(429);
    expect(Number(r.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(r.headers.get('cache-control')).toBe('no-store');
  });
});
