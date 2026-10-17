import { describe, expect, it, vi } from 'vitest';
import { handleSubscribe, normalizeEmail } from './subscribe';

const req = (body: unknown, headers: Record<string, string> = { 'Sec-Fetch-Site': 'same-origin', 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}` }) =>
  new Request('https://yarn-visualizer.vercel.app/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('email signup', () => {
  it('normalizes and validates addresses', () => {
    expect(normalizeEmail('  Isa@Example.COM ')).toBe('isa@example.com');
    expect(normalizeEmail('nope')).toBeNull();
    expect(normalizeEmail('a@b')).toBeNull();
    expect(normalizeEmail(42)).toBeNull();
  });

  it('stores one private record per address, keyed by hash', async () => {
    const save = vi.fn(async (_p: string, _b: string) => {});
    const r = await handleSubscribe(req({ email: 'Knitter@Example.com', source: 'footer' }), save);
    expect(r.status).toBe(200);
    const [path, body] = save.mock.calls[0];
    expect(path).toMatch(/^subscribers\/[0-9a-f]{64}\.json$/);
    expect(path).not.toContain('knitter');
    expect(JSON.parse(body)).toMatchObject({ email: 'knitter@example.com', source: 'footer' });
    await handleSubscribe(req({ email: 'knitter@example.com' }), save);
    expect(save.mock.calls[1][0]).toBe(path);
  });

  it('rejects bad input, other sites and bots', async () => {
    const save = vi.fn(async () => {});
    expect((await handleSubscribe(req({ email: 'bad' }), save)).status).toBe(400);
    expect((await handleSubscribe(req('{not json'), save)).status).toBe(400);
    expect((await handleSubscribe(req({ email: 'a@example.com' }, { Origin: 'https://evil.example' }), save)).status).toBe(403);
    const bot = await handleSubscribe(req({ email: 'a@example.com', website: 'spam.biz' }), save);
    expect(bot.status).toBe(200);
    expect(save).not.toHaveBeenCalled();
  });

  it('reports when storage is not configured', async () => {
    expect((await handleSubscribe(req({ email: 'a@example.com' }), null)).status).toBe(503);
  });

  it('rate limits repeated signups from one address', async () => {
    const save = vi.fn(async () => {});
    const h = { 'Sec-Fetch-Site': 'same-origin', 'x-forwarded-for': '10.9.9.9' };
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push((await handleSubscribe(req({ email: `p${i}@example.com` }, h), save)).status);
    expect(codes.slice(0, 5).every((c) => c === 200)).toBe(true);
    expect(codes[5]).toBe(429);
  });
});
