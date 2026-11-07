import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const source = await readFile(new URL('../dist/server/index.js', import.meta.url), 'utf8');
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const { files, cartridge } = JSON.parse(await readFile(new URL('../artifacts/sites-worker-build.json', import.meta.url), 'utf8'));
let checked = 0;
function checkIsolation(response) {
  assert.equal(response.headers.get('Cross-Origin-Opener-Policy'), 'same-origin');
  assert.equal(response.headers.get('Cross-Origin-Embedder-Policy'), 'require-corp');
  assert.equal(response.headers.get('Cross-Origin-Resource-Policy'), 'same-origin');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
}
for (const [path, expected] of Object.entries(files)) {
  for (const encoding of ['gzip', 'identity', 'gzip;q=0, *;q=1']) {
    const response = await worker.fetch(new Request(`https://release.test${path}?qa=1`, { headers: { 'Accept-Encoding': encoding } }));
    assert.equal(response.status, 200);
    checkIsolation(response);
    assert.equal(response.headers.get('Content-Type'), expected.type);
    const raw = Buffer.from(await response.arrayBuffer());
    assert.equal(Number(response.headers.get('Content-Length')), raw.length);
    const compressed = encoding === 'gzip';
    assert.equal(response.headers.get('Content-Encoding'), compressed ? 'gzip' : null);
    const bytes = compressed ? gunzipSync(raw) : raw;
    assert.equal(bytes.length, expected.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256);
    checked++;
  }
  const head = await worker.fetch(new Request(`https://release.test${path}`, { method: 'HEAD', headers: { 'Accept-Encoding': 'gzip' } }));
  assert.equal(head.status, 200);
  checkIsolation(head);
  assert.equal((await head.arrayBuffer()).byteLength, 0);
}
const root = await worker.fetch(new Request('https://release.test/'));
assert.match(await root.text(), /Taichung/);
for (const path of ['/missing.wasm', '/__proto__', '/_headers']) {
  const response = await worker.fetch(new Request(`https://release.test${path}`));
  assert.equal(response.status, 404);
  checkIsolation(response);
}
assert.equal((await worker.fetch(new Request('https://release.test/', { method: 'POST' }))).status, 405);
assert.equal(files['/roms/taichung-firered.gba'].sha256, cartridge.sha256);
console.log(`Validated ${checked} complete asset responses plus HEAD, routing and error handling. ROM ${cartridge.sha256}.`);
