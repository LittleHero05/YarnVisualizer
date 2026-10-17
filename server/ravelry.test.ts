import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as apiRavelry } from '../api/ravelry';
import { basicAuth, isAllowedPath, proxyImage, proxyRavelry } from './ravelry';

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
    const r = await apiRavelry(new Request(`https://example.vercel.app/api/ravelry?p=${p}`));
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
