import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { isUntouchedDemoSave } from '../src/demo-save.ts';
import { fixture, proof } from './helpers/capture-save-fixture.mjs';

const cartridge = () => {
  const bytes = new Uint8Array(0x20000);
  bytes.set(fixture(proof, 0, 5).bytes.subarray(0, 0x20000));
  return bytes;
};

test('only an untouched checkpoint counts as the demo, with or without the emulator trailer', async () => {
  const demo = cartridge();
  const demos = new Set([createHash('sha256').update(demo).digest('hex')]);
  assert.equal(await isUntouchedDemoSave(demo, demos), true);

  const withTrailer = new Uint8Array(0x20010);
  withTrailer.set(demo);
  withTrailer.fill(7, 0x20000);
  assert.equal(await isUntouchedDemoSave(withTrailer, demos), true);

  const played = demo.slice();
  played[0x1234] ^= 1;
  assert.equal(await isUntouchedDemoSave(played, demos), false);
});

test('a player save, a blank cartridge and a short backup are never treated as the demo', async () => {
  for (const bytes of [cartridge(), new Uint8Array(0x20000).fill(0xff), new Uint8Array(0x10000), new Uint8Array(0)])
    assert.equal(await isUntouchedDemoSave(bytes), false);
});
