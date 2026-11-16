import assert from 'node:assert/strict';
import test from 'node:test';
import { CAPTURE_BOOT_INTENT_KEY, verifyCaptureNativeSave, readCaptureBootPolicy,
  writeCaptureBootIntent, clearCaptureBootIntent, captureBlocksSnapshots } from '../src/capture-persistence.ts';

import { proof, fixture } from './helpers/capture-save-fixture.mjs';
const intent = { ...proof, version: 1, romSha256: 'a'.repeat(64), stage: 'begin' };

test('exact complete native transaction works in either rotated slot, including RTC trailer and counter rollover', () => {
  for (const counter of [0, 7, 0xffffffff]) for (const slot of [0, 1]) for (const rotation of [0, 5, 13]) {
    const expected = { ...proof, saveCounter: counter };
    const { bytes } = fixture(expected, slot, rotation);
    assert.deepEqual(verifyCaptureNativeSave(bytes, expected), { ...expected, slot });
    const rtc = new Uint8Array(0x20010); rtc.set(bytes);
    assert.deepEqual(verifyCaptureNativeSave(rtc, expected), { ...expected, slot });
  }
});

test('every corrupted payload sector, missing/duplicate footer and mixed counter fails closed', () => {
  for (let id = 0; id < 14; id++) for (const corruption of ['payload', 'missing', 'duplicate', 'counter', 'signature']) {
    const { bytes, view, positions } = fixture();
    const at = positions[id];
    if (corruption === 'payload') bytes[at + 16] ^= 1;
    if (corruption === 'missing') view.setUint16(at + 0xff4, 99, true);
    if (corruption === 'duplicate') view.setUint16(at + 0xff4, (id + 1) % 14, true);
    if (corruption === 'counter') view.setUint32(at + 0xffc, proof.saveCounter - 1, true);
    if (corruption === 'signature') view.setUint32(at + 0xff8, 0, true);
    assert.equal(verifyCaptureNativeSave(bytes, proof), undefined, `${id}:${corruption}`);
  }
});

test('fresh counter alone is insufficient: identity, schema and exact attempt/unlock state are bound', () => {
  for (const field of ['trainerId', 'attempts', 'unlocks', 'saveCounter']) {
    assert.equal(verifyCaptureNativeSave(fixture().bytes, { ...proof, [field]: proof[field] + 1 }), undefined, field);
  }
  const { bytes, view, positions, seal } = fixture();
  view.setUint16(positions[2] + 0x266, 0, true); seal(2); //0x40f3, with valid checksum.
  assert.equal(verifyCaptureNativeSave(bytes, proof), undefined);
  assert.equal(verifyCaptureNativeSave(fixture().bytes, { ...proof, unlocks: 0x3fff }), undefined);
});

test('reserved high mask bits stay opaque; orphan low unlock bits and ambiguous duplicate transactions are rejected', () => {
  const { bytes, view, positions, seal } = fixture();
  view.setUint16(positions[2] + 0x268, proof.attempts | 0xc000, true);
  view.setUint16(positions[2] + 0x26a, proof.unlocks | 0x8000, true); seal(2);
  assert.ok(verifyCaptureNativeSave(bytes, proof));
  view.setUint16(positions[2] + 0x26a, proof.unlocks | 2, true); seal(2);
  assert.equal(verifyCaptureNativeSave(bytes, proof), undefined);
  const duplicate = fixture().bytes;
  duplicate.set(fixture(proof, 0).bytes.subarray(0, 14 * 0x1000), 0);
  assert.equal(verifyCaptureNativeSave(duplicate, proof), undefined);
});

test('reads exact typed-array view and rejects incompatible buffers/proofs', () => {
  const outer = new Uint8Array(0x20020); outer.set(fixture().bytes, 7);
  assert.ok(verifyCaptureNativeSave(outer.subarray(7, 7 + 0x20000), proof));
  for (const size of [0, 0x1ffff, 0x20001, 0x20020]) assert.equal(verifyCaptureNativeSave(new Uint8Array(size), proof), undefined);
  for (const bad of [NaN, -1, 1.5, 0x100000000]) assert.equal(verifyCaptureNativeSave(fixture().bytes, { ...proof, saveCounter: bad }), undefined);
});

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}

test('boot intent forces native Continue across reloads and ROM revisions until the matching transaction clears it', () => {
  const store = storage();
  assert.deepEqual(readCaptureBootPolicy(store), { forceCartridge: false });
  writeCaptureBootIntent(store, intent);
  assert.deepEqual(readCaptureBootPolicy(store).intent, intent);
  assert.equal(readCaptureBootPolicy(store).forceCartridge, true);
  const newer = { ...intent, stage: 'result', saveCounter: 8 };
  writeCaptureBootIntent(store, newer);
  assert.throws(() => clearCaptureBootIntent(store, intent), /changed/);
  assert.deepEqual(readCaptureBootPolicy(store).intent, newer);
  clearCaptureBootIntent(store, newer);
  assert.equal(readCaptureBootPolicy(store).forceCartridge, false);
});

test('unavailable, malformed or silently failed intent storage never acknowledges snapshot safety', () => {
  const store = storage();
  for (const raw of ['broken', '{}', JSON.stringify({ ...intent, version: 2 }), JSON.stringify({ ...intent, romSha256: 'wrong' })]) {
    store.setItem(CAPTURE_BOOT_INTENT_KEY, raw);
    assert.equal(readCaptureBootPolicy(store).forceCartridge, true);
    assert.equal(readCaptureBootPolicy(store).intent, undefined);
  }
  const denied = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  assert.equal(readCaptureBootPolicy(denied).forceCartridge, true);
  assert.throws(() => writeCaptureBootIntent(denied, intent), /denied/);
  assert.throws(() => writeCaptureBootIntent({ ...store, setItem() {} }, intent), /not stored/);
  assert.throws(() => writeCaptureBootIntent(store, { ...intent, attempts: -1 }), /Invalid/);
});

test('pending, armed, active, settling and failed encounters exclude every CPU snapshot path', () => {
  for (const phase of [1, 2, 3, 4, 6]) assert.equal(captureBlocksSnapshots(phase), true);
  for (const phase of [undefined, 0, 5]) assert.equal(captureBlocksSnapshots(phase), false);
});
