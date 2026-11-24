import assert from 'node:assert/strict';
import test from 'node:test';
import { NativeBadgeBridge, parseBadgeMetadata, readBadgeSnapshot } from '../src/badge-bridge.ts';
const metadata = { version: 1, size: 32, address: 0x0203f020, magicA: 0x44424354, magicB: 0x31303047 };
const sha = 'a'.repeat(64);
function fixture() {
  const heap = new Uint8Array(new SharedArrayBuffer(1024));
  const words = new Uint32Array(heap.buffer, 160, 8);
  words.set([metadata.magicA, metadata.magicB, 0x00200001, metadata.address, 2, 1, 32 | 1 << 16 | 5 << 24, 1 | 1 << 8]);
  return { anchor: { heap, offset: 128, address: metadata.address - 32 }, words,
    tick() { words[4] += 2; words[5]++; } };
}

test('badge metadata binds exact ROM, implemented header and aligned bounded symbol', () => {
  const build = { sha256: sha, bytes: 16, badgeBridge: metadata };
  assert.deepEqual(parseBadgeMetadata(build, sha, 16), metadata);
  for (const change of [{ sha256: 'b'.repeat(64) }, { bytes: 17 }, { badgeBridge: undefined },
    ...[{ version: 2 }, { size: 48 }, { magicA: 0 }, { address: metadata.address + 1 }, { address: 0x0203fff0 }].map(p => ({ badgeBridge: { ...metadata, ...p } }))])
    assert.equal(parseBadgeMetadata({ ...build, ...change }, sha, 16), undefined);
});

test('anchored reads validate collection/award and never search a mirror or write bytes', () => {
  const f = fixture(); const before = f.anchor.heap.slice();
  assert.equal(readBadgeSnapshot(f.anchor, metadata).selectedGym, 5);
  assert.deepEqual(f.anchor.heap, before);
  assert.equal(readBadgeSnapshot({ ...f.anchor, offset: 132 }, metadata), undefined);
  for (const [index, value] of [[0, 0], [2, 0x00200002], [3, metadata.address + 4], [4, 3], [5, 0],
    [6, 0x400 | 1 << 16 | 5 << 24], [6, 3 << 16 | 5 << 24], [6, 1 << 16 | 10 << 24], [6, 2 << 16 | 5 << 24],
    [7, 2 | 1 << 8], [7, 1], [7, 1 | 3 << 8], [7, 0x10000 | 1 << 8 | 1]]) {
    const previous = f.words[index]; f.words[index] = value;
    assert.equal(readBadgeSnapshot(f.anchor, metadata), undefined, `invalid word${index}:${value}`); f.words[index] = previous;
  }
  f.words[6] = 32 | 2 << 16 | 5 << 24;
  assert.equal(readBadgeSnapshot(f.anchor, metadata).scene, 2); // Historical bit32 stays owned.
  f.words[6] = 255 << 24; f.words[7] = 0;
  assert.equal(readBadgeSnapshot(f.anchor, metadata).scene, 0);
  assert.equal(readBadgeSnapshot({ ...f.anchor, heap: new Uint8Array(1024) }, metadata), undefined);
});

test('scene requires advancing native frames, clears on fade/menu/pause/reset and expires a frozen frame', async () => {
  const f = fixture(); let active = true, anchor = f.anchor; const states = [];
  const bridge = new NativeBadgeBridge({ metadata, getAnchor: () => anchor, isActive: () => active, onState: s => states.push(s) });
  bridge.refresh(); assert.equal(states.at(-1).snapshot, undefined);
  f.tick(); bridge.refresh(); assert.equal(states.at(-1).snapshot.selectedGym, 5);
  f.words[7] &= ~1; bridge.refresh(); assert.equal(states.at(-1).snapshot, undefined); // Native fade hides immediately.
  f.words[7] |= 1; f.tick(); bridge.refresh(); assert.ok(states.at(-1).snapshot);
  active = false; bridge.refresh(); assert.equal(states.at(-1).snapshot, undefined);
  active = true; bridge.refresh(); assert.equal(states.at(-1).snapshot, undefined);
  f.tick(); bridge.refresh(); assert.ok(states.at(-1).snapshot);
  const next = fixture(); anchor = next.anchor; bridge.refresh(); assert.equal(states.at(-1).snapshot, undefined);
  next.tick(); bridge.refresh(); assert.ok(states.at(-1).snapshot);
  next.words[6] = 255 << 24; next.words[7] = 0; next.tick(); bridge.refresh(); assert.equal(states.at(-1).snapshot, undefined);
  next.words[6] = 32 | 2 << 16 | 5 << 24; next.words[7] = 1 | 2 << 8; next.tick(); bridge.refresh();
  assert.equal(states.at(-1).snapshot.scene, 2); assert.equal(states.at(-1).snapshot.language, 2);
  await new Promise(resolve => setTimeout(resolve, 270)); bridge.refresh(); assert.equal(states.at(-1).snapshot, undefined);
  bridge.stop(); assert.equal(states.at(-1).snapshot, undefined);
});
