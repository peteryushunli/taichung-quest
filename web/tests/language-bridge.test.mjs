import assert from 'node:assert/strict';
import test from 'node:test';
import { NativeLanguageBridge, parseLanguageBridgeMetadata } from '../src/language-bridge.ts';

const sha256 = 'a'.repeat(64);
const metadata = { version: 1, size: 32, address: 0x0203f468, magicA: 0x414c4354, magicB: 0x3130474e };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const words = (heap) => new Uint32Array(heap.buffer);

function initialize(heap, offset = 64, { active = 1, flags = 3, requested = 0, requestSequence = 0, ackSequence = 0, result = 0 } = {}) {
  const view = words(heap);
  const base = offset / 4;
  view.set([metadata.magicA, metadata.magicB, 0x00200001, metadata.address, 1, 0, requestSequence, ackSequence], base);
  view[base + 5] = active | requested << 8 | flags << 16 | result << 24;
  return heap;
}

function acknowledge(heap, { active, result, sequence, offset = 64 }) {
  const view = words(heap);
  const base = offset / 4;
  view[base + 5] = active | 3 << 16 | result << 24;
  Atomics.store(view, base + 7, sequence);
}

async function until(condition) {
  const deadline = Date.now() + 2500;
  while (!condition()) {
    if (Date.now() >= deadline) assert.fail('Timed out waiting for bridge state.');
    await sleep(10);
  }
}

function fixture(t, options = {}) {
  let heap = initialize(new Uint8Array(new SharedArrayBuffer(512)), 64, options);
  const published = [];
  const states = [];
  const tickOffsets = new Set([64]);
  const ticker = setInterval(() => {
    for (const offset of tickOffsets) Atomics.add(words(heap), (offset + 16) / 4, 1);
  }, 10);
  const bridge = new NativeLanguageBridge({ getHeap: () => heap, metadata, onNativeLanguage: (language) => published.push(language), onState: (state) => states.push(state) });
  t.after(() => { clearInterval(ticker); bridge.stop(); });
  return { bridge, published, states, tickOffsets, get heap() { return heap; }, set heap(value) { heap = value; }, stopTicks() { clearInterval(ticker); } };
}

test('metadata must match the exact ROM digest, byte count and supported EWRAM contract', () => {
  const build = { sha256, bytes: 16777216, languageBridge: metadata };
  assert.deepEqual(parseLanguageBridgeMetadata(build, sha256, 16777216), metadata);
  for (const candidate of [null, {}, { ...build, sha256: 'b'.repeat(64) }, { ...build, bytes: 1 }, ...[{ address: 0x08000000 }, { address: 0x02000001 }, { version: 2 }, { size: 64 }, { magicB: 0 }].map((change) => ({ ...build, languageBridge: { ...metadata, ...change } }))]) {
    assert.equal(parseLanguageBridgeMetadata(candidate, sha256, 16777216), undefined);
  }
});

test('a frozen ROM/snapshot copy cannot attach or receive a language write', async (t) => {
  const f = fixture(t);
  f.stopTicks();
  const before = f.heap.slice();
  void f.bridge.start();
  await sleep(250);
  assert.equal(f.bridge.currentState.phase, 'discovering');
  assert.equal(f.bridge.request(2), false);
  assert.deepEqual(f.heap, before);
});

test('selects the sole advancing packet among frozen copies and writes only its request fields', async (t) => {
  const f = fixture(t);
  initialize(f.heap, 160); // A frozen, otherwise identical snapshot copy.
  void f.bridge.start();
  await until(() => f.bridge.currentState.phase === 'ready');
  f.stopTicks();
  assert.deepEqual(f.published, [1]);
  const before = f.heap.slice();
  assert.equal(f.bridge.request(9), false);
  assert.equal(f.bridge.request(2), true);
  assert.equal(f.bridge.request(1), false);
  assert.equal(f.heap[64 + 21], 2);
  assert.equal(words(f.heap)[(64 + 24) / 4], 1);
  const changed = [...f.heap.keys()].filter((index) => before[index] !== f.heap[index]);
  assert.ok(changed.length > 0);
  assert.ok(changed.every((index) => index === 85 || (index >= 88 && index <= 91)));
  assert.deepEqual(f.heap.slice(160, 192), before.slice(160, 192));
  await sleep(250);
  assert.equal(f.bridge.currentState.phase, 'pending');
  assert.deepEqual(f.published, [1]); // No premature success while native is busy.
  acknowledge(f.heap, { active: 2, result: 1, sequence: 1 });
  await until(() => f.bridge.currentState.phase === 'ready');
  assert.deepEqual(f.published, [1, 2]);
});

test('an explicit native re-selection wins even when its language equals the previous native value', async (t) => {
  const f = fixture(t);
  void f.bridge.start();
  await until(() => f.bridge.currentState.phase === 'ready');
  assert.equal(f.bridge.request(2), true);
  acknowledge(f.heap, { active: 1, result: 2, sequence: 1 });
  await until(() => f.bridge.currentState.phase === 'ready');
  assert.deepEqual(f.published, [1, 1]);
  assert.equal(f.bridge.currentState.activeLanguage, 1);
});

test('startup language zero never accepts a browser preference', async (t) => {
  const f = fixture(t, { active: 0, flags: 0 });
  void f.bridge.start();
  await until(() => f.bridge.currentState.phase === 'startup');
  assert.equal(f.bridge.request(2), false);
  assert.equal(f.heap[85], 0);
  assert.deepEqual(f.published, []);
  words(f.heap)[(64 + 20) / 4] = 1 | 3 << 16;
  await until(() => f.bridge.currentState.phase === 'ready');
  assert.deepEqual(f.published, [1]);
});

test('an outstanding request restored from a snapshot is observed rather than overwritten', async (t) => {
  const f = fixture(t, { requested: 2, requestSequence: 7, ackSequence: 6 });
  void f.bridge.start();
  await until(() => f.bridge.currentState.phase === 'pending');
  assert.equal(f.bridge.request(1), false);
  assert.equal(words(f.heap)[(64 + 24) / 4], 7);
  acknowledge(f.heap, { active: 2, result: 1, sequence: 7 });
  await until(() => f.bridge.currentState.phase === 'ready');
  assert.deepEqual(f.published, [2]);
});

test('more than one advancing candidate fails closed', async (t) => {
  const f = fixture(t);
  initialize(f.heap, 160);
  f.tickOffsets.add(160);
  void f.bridge.start();
  await until(() => f.bridge.currentState.phase === 'unavailable');
  assert.equal(f.bridge.request(2), false);
  assert.equal(f.heap[85], 0);
  assert.equal(f.heap[181], 0);
});

test('sequence wraps without publishing zero and a replaced heap requires a new liveness probe', async (t) => {
  const f = fixture(t, { requestSequence: 0xffffffff, ackSequence: 0xffffffff });
  void f.bridge.start();
  await until(() => f.bridge.currentState.phase === 'ready');
  assert.equal(f.bridge.request(2), true);
  assert.equal(words(f.heap)[(64 + 24) / 4], 1);
  acknowledge(f.heap, { active: 2, result: 1, sequence: 1 });
  await until(() => f.bridge.currentState.phase === 'ready');
  const oldHeap = f.heap;
  const oldRequest = words(oldHeap)[(64 + 24) / 4];
  f.heap = initialize(new Uint8Array(new SharedArrayBuffer(512)), 64, { active: 1 });
  assert.equal(f.bridge.request(2), false);
  assert.equal(words(oldHeap)[(64 + 24) / 4], oldRequest);
  assert.equal(words(f.heap)[(64 + 24) / 4], 0);
  await until(() => f.bridge.currentState.phase === 'ready');
  assert.equal(f.bridge.currentState.activeLanguage, 1);
  f.bridge.stop();
  assert.equal(f.bridge.request(2), false);
});
