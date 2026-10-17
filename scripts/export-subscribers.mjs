// Print the email list as CSV.
// Usage: BLOB_READ_WRITE_TOKEN=... npm run export-subscribers > subscribers.csv
// The project's BLOB_READ_WRITE_TOKEN is a sensitive variable, so `vercel env pull` can't fetch it;
// copy a token from Vercel → Storage → swatch-journal-subscribers instead.
import { get, list } from '@vercel/blob';

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('Set BLOB_READ_WRITE_TOKEN (Vercel → Storage → your Blob store → .env.local tab).');
  process.exit(1);
}

const rows = [];
let cursor;
do {
  const page = await list({ prefix: 'subscribers/', cursor });
  for (const b of page.blobs) {
    const res = await get(b.pathname, { access: 'private' });
    if (res?.statusCode !== 200) continue;
    rows.push(JSON.parse(await new Response(res.stream).text()));
  }
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);

rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
console.log('email,source,created_at');
for (const r of rows) console.log([r.email, r.source, r.createdAt].map(esc).join(','));
console.error(`${rows.length} subscribers`);
