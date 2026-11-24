import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { downloadPreviewSave, isTaichungSnapshot } from '../src/preview-save.ts';
import { fixture } from './helpers/capture-save-fixture.mjs';

const romHash = 'a'.repeat(64);
const romBytes = 16 * 1024 * 1024;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const metadata = bytes => ({
  sha256: romHash, bytes: romBytes, playtestSave: { version: 1, bytes: bytes.length, sha256: hash(bytes) },
});

test('the optional seed is read only from a matched preview build', async () => {
  const { bytes } = fixture();
  const build = metadata(bytes);
  let requests = 0;
  const fetchSave = async (path, options) => {
    requests++;
    assert.equal(path, '/roms/playtest-post-intro.sav');
    assert.equal(options.cache, 'no-cache');
    return new Response(bytes);
  };
  for (const candidate of [undefined, {}, { ...build, sha256: 'b'.repeat(64) }, { ...build, bytes: 4096 },
    { ...build, playtestSave: { ...build.playtestSave, bytes: 0x10000 } }]) {
    assert.equal(await downloadPreviewSave(candidate, romHash, romBytes, fetchSave), undefined);
  }
  assert.equal(requests, 0);
  assert.deepEqual(await downloadPreviewSave(build, romHash, romBytes, fetchSave), bytes);
});

test('a corrupt, unavailable or mismatched SRAM payload cannot become a preview save', async () => {
  const valid = fixture().bytes;
  const corrupt = new Uint8Array(valid.length);
  assert.equal(await downloadPreviewSave(metadata(corrupt), romHash, romBytes, async () => new Response(corrupt)), undefined);
  const other = valid.slice();
  other[other.length - 1] ^= 1;
  assert.equal(await downloadPreviewSave(metadata(valid), romHash, romBytes, async () => new Response(other)), undefined);
  assert.equal(await downloadPreviewSave(metadata(valid), romHash, romBytes, async () => new Response('', { status: 404 })), undefined);
});

test('current, legacy and historical Taichung snapshots are identified inside the mounted directory', () => {
  for (const path of ['/autosave/taichung-firered_auto.ss', '/autosave/taichung-firered-a123456789abcdef_auto.ss']) {
    assert.equal(isTaichungSnapshot(path, '/autosave'), true);
  }
  for (const path of ['/elsewhere/taichung-firered_auto.ss', '/autosave/other-firered_auto.ss',
    '/autosave/taichung-firered-bad_auto.ss', '/autosave/taichung-firered.sav']) {
    assert.equal(isTaichungSnapshot(path, '/autosave'), false);
  }
});
