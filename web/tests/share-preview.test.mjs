import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url));
const html = String(await read('index.html'));
const meta = (name) => html.match(new RegExp(`<meta (?:name|property)="${name}" content="([^"]*)"`))?.[1];

test('a shared link has the released title and makes no claim that a new landmark would outdate', async () => {
  assert.equal(meta('og:description'), meta('description'));
  assert.doesNotMatch(meta('description'), /\d|\b(ten|twelve|twenty)\b/i);
  assert.doesNotMatch(String(await read('scripts/social-card.html')), /\d+ (real )?(places|landmarks|gyms)/i);
  assert.equal(meta('og:title'), html.match(/<title>([^<]+)<\/title>/)[1]);
  assert.doesNotMatch(html, /preview<\/title>/i);
});

test('the preview image is the published file at its declared size', async () => {
  assert.equal(meta('twitter:card'), 'summary_large_image');
  const image = new URL(meta('og:image'));
  assert.equal(image.origin, new URL(meta('og:url')).origin);
  const png = await read(`public${image.pathname}`);
  assert.equal(png.toString('latin1', 1, 4), 'PNG');
  assert.equal(String(png.readUInt32BE(16)), meta('og:image:width'));
  assert.equal(String(png.readUInt32BE(20)), meta('og:image:height'));
});
