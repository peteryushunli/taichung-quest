import assert from 'node:assert/strict';
import test from 'node:test';
import { parseEncounterMetadata, readEncounterSnapshot, writeEncounterAcknowledgement,
  NativeEncounterBridge } from '../src/encounter-bridge.ts';
import { EncounterSaveSpeed } from '../src/encounter-save-speed.ts';

const metadata = { version: 1, size: 64, address: 0x0203f560, magicA: 0x4e454354, magicB: 0x31525443 };
const sha = 'b'.repeat(64);
const offset = 128;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(condition, ms = 1200) {
  const deadline = Date.now() + ms;
  while (!condition()) { assert.ok(Date.now() < deadline, 'bounded condition timed out'); await sleep(5); }
}
function fixture(target = offset) {
  const heap = new Uint8Array(new SharedArrayBuffer(4096));
  const view = new DataView(heap.buffer);
  const u32 = (at, value) => view.setUint32(target + at, value, true);
  u32(0, metadata.magicA); u32(4, metadata.magicB); u32(8, 0x00400001); u32(12, metadata.address);
  u32(16, 2); u32(20, 10); u32(24, 1); u32(32, 1); //first site attempted, locked.
  view.setUint16(target + 36, 131, true);
  view.setUint8(target + 38, 0); view.setUint8(target + 39, 1);
  view.setUint8(target + 40, 3); view.setUint8(target + 42, 1);
  u32(48, 8); u32(52, 0x12345678);
  return { heap, view, u32, tick() { u32(16, view.getUint32(target + 16, true) + 2); u32(20, view.getUint32(target + 20, true) + 1); } };
}

test('metadata binds exact cartridge digest, length, header, size and aligned native address', () => {
  const build = { sha256: sha, bytes: 0x1000000, encounterBridge: metadata };
  assert.deepEqual(parseEncounterMetadata(build, sha, 0x1000000), metadata);
  for (const patch of [{ sha256: 'c'.repeat(64) }, { bytes: 1 }, { encounterBridge: undefined },
    { encounterBridge: { ...metadata, version: 2 } }, { encounterBridge: { ...metadata, size: 48 } },
    { encounterBridge: { ...metadata, magicB: 0 } }, { encounterBridge: { ...metadata, address: metadata.address + 1 } },
    { encounterBridge: { ...metadata, address: 0x0203fff0 } }])
    assert.equal(parseEncounterMetadata({ ...build, ...patch }, sha, 0x1000000), undefined);
});

test('packet rejects torn/foreign/invalid fields and accepts only shared aligned allocations', () => {
  const mutations = [[16, 3], [0, 0], [8, 0x00300001], [12, 0x02000000], [20, 0],
    [32, 0x4000], [32, 0x00020001], [36, 131 | 14 << 16 | 1 << 24],
    [36, 151 | 1 << 24], [36, 131 | 7 << 24], [40, 4 | 1 << 16], [60, 1]];
  assert.ok(readEncounterSnapshot(fixture().heap, offset, metadata));
  for (const [at, value] of mutations) {
    const f = fixture(); f.u32(at, value);
    assert.equal(readEncounterSnapshot(f.heap, offset, metadata), undefined, `${at}:${value}`);
  }
  assert.equal(readEncounterSnapshot(new Uint8Array(4096), offset, metadata), undefined);
  assert.equal(readEncounterSnapshot(fixture().heap, offset + 1, metadata), undefined);
});

test('ACK commits only its five fields and refuses stale, wrong-phase, already-ACKed or unsaved requests', () => {
  const f = fixture(); const packet = readEncounterSnapshot(f.heap, offset, metadata);
  const before = f.heap.slice();
  assert.equal(writeEncounterAcknowledgement(f.heap, offset, metadata, packet, 1), true);
  const mutable = new Set([...Array.from({ length: 4 }, (_, i) => offset + 28 + i), offset + 43,
    ...Array.from({ length: 4 }, (_, i) => offset + 44 + i), ...Array.from({ length: 4 }, (_, i) => offset + 56 + i)]);
  for (let i = 0; i < f.heap.length; i++) if (!mutable.has(i)) assert.equal(f.heap[i], before[i], `readonly byte${i}`);
  assert.equal(f.view.getUint32(offset + 28, true), packet.request);
  assert.equal(f.view.getUint32(offset + 56, true), packet.saveCounter);
  assert.equal(f.heap[offset + 43], 1);
  assert.equal(writeEncounterAcknowledgement(f.heap, offset, metadata, packet, 1), false);
  for (const field of ['request', 'phase', 'site', 'saveCounter', 'trainerId', 'attempts', 'unlocks']) {
    const g = fixture(); const snapshot = readEncounterSnapshot(g.heap, offset, metadata);
    assert.equal(writeEncounterAcknowledgement(g.heap, offset, metadata, { ...snapshot, [field]: snapshot[field] + 1 }, 1), false, field);
  }
  const g = fixture(); const old = readEncounterSnapshot(g.heap, offset, metadata); g.heap[offset + 42] = 0;
  assert.equal(writeEncounterAcknowledgement(g.heap, offset, metadata, old, 1), false);
});

test('v2/72 preserves each new site and writes only the existing ACK fields', () => {
  const v2 = { ...metadata, version: 2, size: 72 };
  assert.deepEqual(parseEncounterMetadata({ sha256: sha, bytes: 16, encounterBridge: v2 }, sha, 16), v2);
  for (const [site, species] of [[3, 65], [20, 144], [21, 82], [22, 141], [23, 53]]) for (const caught of [false, true]) {
    const { heap, u32, view } = fixture();
    const attempts = (1 << site) | (1 << 3); // Alakazam keeps its stable historical bit.
    const unlocks = caught ? attempts : 0;
    u32(8, 72 << 16 | 2); u32(32, attempts); u32(36, unlocks);
    u32(40, species | site << 16 | 4 << 24);
    u32(44, 2 | 1 << 8 | 1 << 16); u32(56, 12); u32(60, 0x12345678);
    const packet = readEncounterSnapshot(heap, offset, v2);
    assert.equal(packet.site, site); assert.equal(packet.species, species);
    assert.equal(packet.attempts, attempts); assert.equal(packet.unlocks, unlocks);
    assert.equal(writeEncounterAcknowledgement(heap, offset, v2, { ...packet, attempts: 0 }, 1), false);
    const before = heap.slice();
    assert.equal(writeEncounterAcknowledgement(heap, offset, v2, packet, 1), true);
    const mutable = new Set([28, 48, 52, 64].flatMap(at => Array.from({ length: 4 }, (_, i) => offset + at + i)).concat(offset + 47));
    for (let i = 0; i < heap.length; i++) if (!mutable.has(i)) assert.equal(heap[i], before[i], `readonly byte ${i}`);
    assert.equal(view.getUint32(offset + 28, true), packet.request);
    assert.equal(view.getUint32(offset + 48, true), attempts);
    assert.equal(view.getUint32(offset + 52, true), unlocks);
    assert.equal(view.getUint32(offset + 64, true), packet.saveCounter);
    assert.equal(heap[offset + 47], 1);
    u32(32, 1 << 24); assert.equal(readEncounterSnapshot(heap, offset, v2), undefined);
    u32(32, attempts); u32(40, species | 24 << 16 | 4 << 24);
    assert.equal(readEncounterSnapshot(heap, offset, v2), undefined);
  }
});

test('live client ACK waits for the entire durable callback; storage failure emits only failure ACK', async () => {
  for (const fails of [false, true]) {
    const f = fixture(); let resolve, reject, entered = false;
    const transaction = new Promise((a, b) => { resolve = a; reject = b; });
    const timer = setInterval(() => f.tick(), 5);
    const bridge = new NativeEncounterBridge({ metadata, getHeap: () => f.heap, isActive: () => true, onState() {},
      onDurableSave: async () => { entered = true; await transaction; } });
    try {
      await bridge.start(); await until(() => entered);
      assert.equal(f.view.getUint32(offset + 28, true), 0);
      if (fails) reject(new Error('expected storage denial')); else resolve();
      await until(() => f.view.getUint32(offset + 28, true) === 1);
      assert.equal(f.heap[offset + 43], fails ? 2 : 1);
    } finally { bridge.stop(); clearInterval(timer); }
  }
});

test('frame probe accelerates unsaved flash only and restores before success/failure ACK or stop', async () => {
  for (const ending of ['success', 'failure', 'stop']) {
    const f = fixture(); f.heap[offset + 42] = 0;
    let value = 1, resolve, reject, entered = false;
    const restores = [];
    const speed = new EncounterSaveSpeed({ getFastForwardMultiplier: () => value,
      setFastForwardMultiplier: n => { value = n; if (n === 1) restores.push(f.view.getUint32(offset + 28, true)); } });
    const transaction = new Promise((a, b) => { resolve = a; reject = b; });
    const timer = setInterval(() => f.tick(), 5);
    const bridge = new NativeEncounterBridge({ metadata, getHeap: () => f.heap, isActive: () => true, onState() {},
      onSaveState: p => speed.update(p), onDurableSave: async () => { entered = true; await transaction; } });
    try {
      await bridge.start(); bridge.onFrame(); assert.equal(value, 8);
      assert.equal(entered, false); assert.equal(f.view.getUint32(offset + 28, true), 0);
      f.heap[offset + 42] = 1;
      await until(() => entered); assert.equal(value, 8);
      if (ending === 'stop') bridge.stop();
      if (ending === 'failure') reject(new Error('expected storage denial')); else resolve();
      await until(() => value === 1);
      if (ending !== 'stop') await until(() => f.view.getUint32(offset + 28, true) === 1);
      assert.deepEqual(restores, [0], 'ordinary speed must be restored before the mailbox commits');
      assert.equal(f.view.getUint32(offset + 28, true), ending === 'stop' ? 0 : 1);
      if (ending !== 'stop') assert.equal(f.heap[offset + 43], ending === 'failure' ? 2 : 1);
    } finally { bridge.stop(); clearInterval(timer); }
  }
});

test('two advancing mirrors fail closed without starting storage or writing either ACK', async () => {
  const f = fixture(); const other = fixture(512); f.heap.set(other.heap.subarray(512, 576), 512);
  const secondView = new DataView(f.heap.buffer);
  const timer = setInterval(() => { f.tick(); secondView.setUint32(528, secondView.getUint32(528, true) + 2, true); secondView.setUint32(532, secondView.getUint32(532, true) + 1, true); }, 5);
  let calls = 0;
  const bridge = new NativeEncounterBridge({ metadata, getHeap: () => f.heap, isActive: () => true, onState() {}, onDurableSave: async () => { calls++; } });
  try {
    await bridge.start(); assert.equal(bridge.currentState.status, 'unavailable'); assert.equal(calls, 0);
    assert.equal(f.view.getUint32(offset + 28, true), 0); assert.equal(f.view.getUint32(512 + 28, true), 0);
  } finally { bridge.stop(); clearInterval(timer); }
});

test('pause during storage prevents ACK; resumed fresh frame revalidates the transaction', async () => {
  const f = fixture(); let active = true, resolve, calls = 0;
  const pending = new Promise(done => { resolve = done; });
  const timer = setInterval(() => { if (active) f.tick(); }, 5);
  const bridge = new NativeEncounterBridge({ metadata, getHeap: () => f.heap, isActive: () => active, onState() {}, onDurableSave: async () => { calls++; await pending; } });
  try {
    await bridge.start(); await until(() => calls === 1); active = false; resolve();
    await sleep(90); assert.equal(f.view.getUint32(offset + 28, true), 0);
    active = true; await until(() => f.view.getUint32(offset + 28, true) === 1);
    assert.equal(calls, 2);
  } finally { bridge.stop(); clearInterval(timer); }
});

test('heap replacement invalidates an older in-flight completion before the new discovery can ACK', async () => {
  const old = fixture(), fresh = fixture(); let current = old, resolve, calls = 0;
  const pending = new Promise(done => { resolve = done; });
  const timer = setInterval(() => current.tick(), 5);
  const bridge = new NativeEncounterBridge({ metadata, getHeap: () => current.heap, isActive: () => true, onState() {},
    onDurableSave: async () => { calls++; if (calls === 1) await pending; } });
  try {
    await bridge.start(); await until(() => calls === 1); current = fresh;
    await until(() => bridge.currentState.status === 'discovering'); resolve();
    await until(() => fresh.view.getUint32(offset + 28, true) === 1);
    assert.equal(old.view.getUint32(offset + 28, true), 0); assert.equal(calls, 2);
  } finally { bridge.stop(); clearInterval(timer); }
});

test('a native reset in the same heap requires a fresh discovery and a new durable transaction', async () => {
  const f = fixture(); let calls = 0, oldDone, newDone;
  const oldWork = new Promise(done => { oldDone = done; });
  const newWork = new Promise(done => { newDone = done; });
  const timer = setInterval(() => f.tick(), 5);
  const bridge = new NativeEncounterBridge({ metadata, getHeap: () => f.heap, isActive: () => true, onState() {},
    onDurableSave: async () => { calls++; await (calls === 1 ? oldWork : newWork); } });
  try {
    await bridge.start(); await until(() => calls === 1);
    f.u32(20, 1); f.u32(16, 2);
    await until(() => bridge.currentState.status === 'discovering'); oldDone();
    await until(() => calls === 2);
    assert.equal(f.view.getUint32(offset + 28, true), 0);
    newDone(); await until(() => f.view.getUint32(offset + 28, true) === 1);
  } finally { bridge.stop(); clearInterval(timer); }
});

test('a stalled native frame cannot receive an ACK even when the browser stays active', async () => {
  const f = fixture(); let moving = true, calls = 0, done;
  const pending = new Promise(resolve => { done = resolve; });
  const timer = setInterval(() => { if (moving) f.tick(); }, 5);
  const bridge = new NativeEncounterBridge({ metadata, getHeap: () => f.heap, isActive: () => true, onState() {},
    onDurableSave: async () => { calls++; await pending; } });
  try {
    await bridge.start(); await until(() => calls === 1); moving = false;
    await until(() => bridge.currentState.status === 'paused'); done();
    await sleep(70); assert.equal(f.view.getUint32(offset + 28, true), 0);
    moving = true; await until(() => f.view.getUint32(offset + 28, true) === 1);
    assert.equal(calls, 2);
  } finally { bridge.stop(); clearInterval(timer); }
});
