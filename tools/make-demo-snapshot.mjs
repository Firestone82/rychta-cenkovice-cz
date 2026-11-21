// Captures the data of a running API into web/demo, for the static showcase on GitHub Pages.
//
//   node tools/make-demo-snapshot.mjs --media <RC_MEDIA_DIR> [--api http://localhost:8080]
//
// Reads RC_ADMIN_EMAIL and RC_ADMIN_PASSWORD. Photos are copied in sizes up to MAX_WIDTH only,
// so the repository stays small. Needs `npm install` in api/ (for sharp).
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const MAX_WIDTH = 960;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sharp = createRequire(join(root, 'api/package.json'))('sharp');

const { values } = parseArgs({
  options: { api: { type: 'string', default: 'http://localhost:8080' }, media: { type: 'string' } },
});
if (!values.media) throw new Error('--media <folder> is required');
const base = `${values.api}/api/v1`;
const out = join(root, 'web/demo');

async function call(path, init = {}) {
  const response = await fetch(base + path, init);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

const session = await call('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'rychta-web' },
  body: JSON.stringify({
    email: process.env.RC_ADMIN_EMAIL,
    password: process.env.RC_ADMIN_PASSWORD,
  }),
});
const admin = (path) => call(path, { headers: { Authorization: `Bearer ${session.access_token}` } });

const photos = [];
for (let offset = 0; ; ) {
  const page = await admin(`/admin/photos?offset=${offset}`);
  photos.push(...page.items);
  offset += page.items.length;
  if (page.items.length === 0 || offset >= page.total) break;
}

await rm(join(out, 'media'), { recursive: true, force: true });
await mkdir(join(out, 'media'), { recursive: true });
const kept = photos.filter((photo) => photo.file);
for (const photo of kept) {
  const widths = photo.widths.filter((w) => w <= MAX_WIDTH);
  if (widths.length === 0) widths.push(Math.min(...photo.widths));
  const largest = Math.max(...widths);
  for (const width of widths) {
    await sharp(join(values.media, `${photo.file}-${width}.jpg`))
      .jpeg({ quality: width <= 480 ? 72 : 74, mozjpeg: true })
      .toFile(join(out, 'media', `${photo.file}-${width}.jpg`));
  }
  photo.height = Math.round((photo.height * largest) / photo.width);
  photo.width = largest;
  photo.widths = widths;
}

const apartments = (await admin('/admin/apartments')).items;
for (const apartment of apartments) {
  apartment.cover = kept.find((photo) => photo.id === apartment.cover?.id) ?? null;
}

const snapshot = {
  date: new Date().toISOString().slice(0, 10),
  apartments,
  photos: kept,
  bookings: (await admin('/admin/bookings?order=created')).items,
  messages: (await admin('/admin/messages?status=all')).items,
  users: (await admin('/admin/users')).items,
  channels: (await admin('/admin/channels')).items,
};
await writeFile(join(out, 'data.json'), JSON.stringify(snapshot));
console.log(`${apartments.length} apartments, ${kept.length} photos, ${snapshot.bookings.length} bookings`);
