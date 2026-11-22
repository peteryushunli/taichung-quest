import assert from 'node:assert/strict';
import test from 'node:test';
import { hasReadableFireRedSave } from '../src/firered-save.ts';
import { fixture, proof } from './helpers/capture-save-fixture.mjs';

test('a blank or interrupted backup cannot replace a save merely by matching its size', () => {
  for (const size of [0x10000, 0x10010, 0x20000, 0x20010]) {
    assert.equal(hasReadableFireRedSave(new Uint8Array(size)), false);
    assert.equal(hasReadableFireRedSave(new Uint8Array(size).fill(0xff)), false);
  }
  const { bytes, view, positions } = fixture();
  view.setUint32(positions[3] + 0xffc, proof.saveCounter - 1, true);
  assert.equal(hasReadableFireRedSave(bytes), false);
});

test('one intact FireRed slot is sufficient, including older saves and emulator trailers', () => {
  const older = fixture({ ...proof, saveCounter: 0 }, 0, 13);
  older.view.setUint16(older.positions[2] + 0x266, 0, true);
  older.seal(2);
  assert.equal(hasReadableFireRedSave(older.bytes.subarray(0, 0x10000)), true);
  assert.equal(hasReadableFireRedSave(older.bytes.subarray(0, 0x10010)), true);

  const newer = fixture(proof, 1, 5);
  const trailer = new Uint8Array(0x20010);
  trailer.set(older.bytes);
  trailer.set(newer.bytes.subarray(0xe000), 0xe000);
  trailer[newer.positions[5]] ^= 1;
  assert.equal(hasReadableFireRedSave(trailer), true);
  trailer[older.positions[5]] ^= 1;
  assert.equal(hasReadableFireRedSave(trailer), false);
  assert.equal(hasReadableFireRedSave(newer.bytes), true);
  assert.equal(hasReadableFireRedSave(newer.bytes.subarray(0, 0x10000)), false);
});
