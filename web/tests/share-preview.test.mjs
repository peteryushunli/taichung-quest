import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url));
const json = async (path) => JSON.parse(await read(path));
const html = String(await read('index.html'));
const meta = (name) => html.match(new RegExp(`<meta (?:name|property)="${name}" content="([^"]*)"`))?.[1];

test('a shared link has the released title and counts the places in the city', async () => {
  const [landmarks, sights, boulevard] = await Promise.all(
    ['landmarks', 'sights', 'boulevard-preview'].map((file) => json(`src/data/${file}.json`)));
  const places = landmarks.length + sights.length + boulevard.extraSights.length;
  for (const name of ['description', 'og:description']) assert.match(meta(name), new RegExp(`\\b${places} real places\\b`));
  assert.match(String(await read('scripts/social-card.html')), new RegExp(`>${places} real places`));
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
