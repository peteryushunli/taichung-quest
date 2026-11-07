import assert from 'node:assert/strict';
import test from 'node:test';
import { NativeNavigationBridge, NavigationFreshness, parseNavigationMetadata, readNavigationSnapshot } from '../src/navigation-bridge.ts';

const sha256 = 'a'.repeat(64);
const fingerprint = 'b'.repeat(64);
const metadata = { version: 1, size: 48, address: 0x0203e000, magicA: 0x414e4354, magicB: 0x31303056 };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function initialize(heap, offset = 64) {
  const words = new Uint32Array(heap.buffer, offset, 12);
  words.set([metadata.magicA, metadata.magicB, 0x00300001, metadata.address, 2, 1, 79, 30 | 66 << 16, 43 | 2 << 16 | 1 << 24, 40 | 72 << 16, 0, 0]);
  return heap;
}
const packet = () => readNavigationSnapshot(initialize(new Uint8Array(new SharedArrayBuffer(512))), 64, metadata);

test('navigation metadata binds the exact ROM, EWRAM packet and authored geometry', () => {
  const build = { sha256, bytes: 16777216, navigationBridge: metadata, minimap: { schemaVersion: 1, geometryFingerprintSha256: fingerprint } };
  assert.deepEqual(parseNavigationMetadata(build, sha256, 16777216, fingerprint), metadata);
  for (const value of [null, {}, { ...build, sha256: 'c'.repeat(64) }, { ...build, bytes: 1 }, { ...build, minimap: undefined }, { ...build, minimap: { schemaVersion: 2, geometryFingerprintSha256: fingerprint } }, { ...build, minimap: { schemaVersion: 1, geometryFingerprintSha256: 'c'.repeat(64) } }, ...[{ address: 0x08000000 }, { address: 0x0203fff0 }, { address: 0x02000001 }, { version: 2 }, { size: 32 }, { magicA: 0 }].map((change) => ({ ...build, navigationBridge: { ...metadata, ...change } }))]) {
    assert.equal(parseNavigationMetadata(value, sha256, 16777216, fingerprint), undefined);
  }
});

test('coherent read rejects incomplete sequences, wrong identities and reserved bits', () => {
  const heap = initialize(new Uint8Array(new SharedArrayBuffer(512)));
  assert.deepEqual(readNavigationSnapshot(heap, 64, metadata), { sequence: 2, frame: 1, flags: 79, x: 30, y: 66, mapGroup: 43, mapNumber: 0, facing: 2, mapType: 1, width: 40, height: 72, contextFlags: 0 });
  const words = new Uint32Array(heap.buffer, 64, 12);
  for (const [index, value] of [[0, 0], [1, 0], [2, 0x00300002], [3, metadata.address + 4], [4, 0], [4, 3], [5, 0], [6, 128], [10, 0x10000], [11, 1]]) {
    const previous = words[index]; words[index] = value;
    assert.equal(readNavigationSnapshot(heap, 64, metadata), undefined, `word ${index}`);
    words[index] = previous;
  }
  assert.equal(readNavigationSnapshot(new Uint8Array(512), 64, metadata), undefined);
  for (const offset of [-4, 65, 468, NaN]) assert.equal(readNavigationSnapshot(heap, offset, metadata), undefined);
  words[7] = 0xffffffff;
  words[8] = 0x0000ffff;
  words[9] = 0;
  words[10] = 0x800;
  const hidden = readNavigationSnapshot(heap, 64, metadata);
  assert.equal(hidden.x, -1);
  assert.equal(hidden.y, -1);
  assert.equal(hidden.contextFlags, 0x800); // Hidden packets still prove native liveness.
});

test('sequence changing during the copy cannot produce a mixed sample', () => {
  const heap = initialize(new Uint8Array(new SharedArrayBuffer(512)));
  const original = Atomics.load;
  let reads = 0;
  try {
    Atomics.load = (words, index) => {
      if (index === 20 && ++reads === 3) return 4;
      return original(words, index);
    };
    assert.equal(readNavigationSnapshot(heap, 64, metadata), undefined);
  } finally { Atomics.load = original; }
});

test('freshness requires advancement, expires frozen frames and resets on rewind/wrap/pause', () => {
  const f = new NavigationFreshness();
  const p = packet();
  assert.equal(f.observe(p, 0), false);
  assert.equal(f.observe(p, 100), false);
  assert.equal(f.observe({ ...p, frame: 2, sequence: 4 }, 200), true);
  assert.equal(f.observe({ ...p, frame: 2, sequence: 4 }, 1100), true);
  assert.equal(f.observe({ ...p, frame: 2, sequence: 4 }, 1200), false);
  assert.equal(f.observe({ ...p, frame: 3, sequence: 6 }, 1300), true);
  assert.equal(f.observe(p, 1400), false);
  assert.equal(f.observe({ ...p, frame: 2, sequence: 4 }, 1500), true);
  f.reset();
  assert.equal(f.observe({ ...p, frame: 0xffffffff, sequence: 0xfffffffe }, 1600), false);
  assert.equal(f.observe(p, 1700), false);
  assert.equal(f.observe({ ...p, frame: 2, sequence: 4 }, 1800), true);
  assert.equal(f.observe({ ...p, frame: 3, sequence: 4 }, 1900), false); // Impossible unchanged publication sequence.
});

async function until(condition) {
  const end = Date.now() + 3000;
  while (!condition()) { if (Date.now() > end) assert.fail('Navigation state timed out'); await sleep(10); }
}
function fixture(t, offsets = [64]) {
  let heap = initialize(new Uint8Array(new SharedArrayBuffer(512)));
  let active = true;
  for (const offset of offsets) initialize(heap, offset);
  const states = [];
  const tickOffsets = new Set(offsets);
  const ticker = setInterval(() => {
    for (const offset of tickOffsets) {
      const words = new Uint32Array(heap.buffer, offset, 12);
      Atomics.add(words, 4, 1); Atomics.add(words, 5, 1); Atomics.add(words, 4, 1);
    }
  }, 10);
  const bridge = new NativeNavigationBridge({ metadata, getHeap: () => heap, isActive: () => active, onState: (state) => states.push(state) });
  t.after(() => { clearInterval(ticker); bridge.stop(); });
  return { bridge, states, tickOffsets, get heap() { return heap; }, replaceHeap() { heap = initialize(new Uint8Array(new SharedArrayBuffer(512))); }, setActive(value) { active = value; bridge.refresh(); }, stopTicks() { clearInterval(ticker); } };
}

test('attaches only to an advancing packet, reads without writes and expires a frozen allocation', async (t) => {
  const f = fixture(t);
  initialize(f.heap, 160); // Static ROM/snapshot copy with identical valid header.
  void f.bridge.start();
  await until(() => f.bridge.currentState.phase === 'live');
  f.stopTicks();
  const before = f.heap.slice();
  f.bridge.refresh();
  assert.deepEqual(f.heap, before);
  await until(() => f.bridge.currentState.phase !== 'live');
  assert.equal(f.bridge.currentState.snapshot, undefined);
});

test('a frozen allocation is rediscovered when EWRAM moves inside the same heap', async (t) => {
  const f = fixture(t);
  void f.bridge.start();
  await until(() => f.bridge.currentState.phase === 'live');
  initialize(f.heap, 160);
  new Uint32Array(f.heap.buffer)[(160 + 28) / 4] = 20 | 66 << 16;
  f.tickOffsets.clear(); f.tickOffsets.add(160);
  await until(() => f.bridge.currentState.snapshot?.x === 20);
});

test('two advancing packets are ambiguous and never expose a location', async (t) => {
  const f = fixture(t, [64, 160]);
  void f.bridge.start();
  await until(() => f.bridge.currentState.phase === 'unavailable');
  assert.equal(f.states.some((state) => state.snapshot), false);
});

test('browser pause clears immediately; replaced shared heap must prove freshness again', async (t) => {
  const f = fixture(t);
  void f.bridge.start();
  await until(() => f.bridge.currentState.phase === 'live');
  f.setActive(false);
  assert.deepEqual(f.bridge.currentState, { phase: 'hidden' });
  f.setActive(true);
  assert.equal(f.bridge.currentState.phase, 'hidden');
  await until(() => f.bridge.currentState.phase === 'live');
  f.replaceHeap();
  f.bridge.refresh();
  assert.equal(f.bridge.currentState.snapshot, undefined);
  await until(() => f.bridge.currentState.phase === 'live');
  const words = new Uint32Array(f.heap.buffer, 64, 12);
  Atomics.store(words, 10, 0x8000); // Unknown busy context is always hidden.
  f.bridge.refresh();
  assert.equal(f.bridge.currentState.phase, 'hidden');
});
