import { put } from '@vercel/blob';
import { guard } from './ravelry.js';

// Email list signups ("more tools like this"). Each address is one private blob,
// keyed by a hash of the address so repeat signups overwrite instead of duplicating.
// Export the list with `npm run export-subscribers`.

export type SaveSubscriber = (pathname: string, body: string) => Promise<void>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const blobSave: SaveSubscriber = async (pathname, body) => {
  await put(pathname, body, { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json' });
};

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function handleSubscribe(
  request: Request,
  save: SaveSubscriber | null = process.env.BLOB_READ_WRITE_TOKEN ? blobSave : null,
): Promise<Response> {
  if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
  const blocked = guard(request.headers, 'subscribe');
  if (blocked) return blocked;
  let data: { email?: unknown; website?: unknown; source?: unknown };
  try {
    data = await request.json();
  } catch {
    return reply(400, { error: 'bad_request' });
  }
  // Honeypot: real people never fill the hidden "website" field.
  if (typeof data.website === 'string' && data.website.trim()) return reply(200, { ok: true });
  const email = normalizeEmail(data.email);
  if (!email) return reply(400, { error: 'invalid_email' });
  if (!save) return reply(503, { error: 'not_configured' });
  const source = typeof data.source === 'string' ? data.source.slice(0, 40) : 'site';
  try {
    await save(`subscribers/${await sha256(email)}.json`, JSON.stringify({ email, source, createdAt: new Date().toISOString() }));
  } catch {
    return reply(502, { error: 'storage_failed' });
  }
  return reply(200, { ok: true });
}
