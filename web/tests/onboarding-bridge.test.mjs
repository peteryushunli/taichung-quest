import assert from 'node:assert/strict';
import test from 'node:test';
import { NativeOnboardingBridge, parseOnboardingMetadata, readOnboardingSnapshot, writeOnboardingCommand } from '../src/onboarding-bridge.ts';

const metadata = { version: 1, size: 48, address: 0x0203d000, magicA: 0x4e494354, magicB: 0x314f5254 };
const sha256 = 'a'.repeat(64);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function initialize(heap = new Uint8Array(new SharedArrayBuffer(512)), offset = 64, { phase = 1, flags = 3, context = 7, language = 0, frame = 2 } = {}) {
  new Uint32Array(heap.buffer, offset, 12).set([metadata.magicA, metadata.magicB, 0x00300001, metadata.address, frame, context,
    phase | flags << 8 | language << 16, 0, 0, 0, 43 << 16, 30 | 66 << 16]);
  return heap;
}
function advancing(heap, offset = 64) {
  return setInterval(() => Atomics.add(new Uint32Array(heap.buffer), offset / 4 + 4, 2), 20);
}
const startup = { command: 1, language: 2, context: 7, phase: 1 };

test('onboarding is optional and metadata binds the actual ROM and bounded mailbox', () => {
  const build = { sha256, bytes: 16777216, onboardingBridge: metadata };
  assert.deepEqual(parseOnboardingMetadata(build, sha256, 16777216), metadata);
  for (const value of [null, {}, { ...build, sha256: 'b'.repeat(64) }, { ...build, bytes: 1 }, { ...build, onboardingBridge: undefined },
    ...[{ version: 2 }, { size: 32 }, { magicA: 0 }, { magicB: 0 }, { address: 0x08000000 }, { address: 0x0203fff0 }, { address: 0x02000001 }].map(change => ({ ...build, onboardingBridge: { ...metadata, ...change } }))]) {
    assert.equal(parseOnboardingMetadata(value, sha256, 16777216), undefined);
  }
});

test('onboarding reads require stable even publication, context and header', () => {
  const heap = initialize();
  const words = new Uint32Array(heap.buffer, 64, 12);
  assert.equal(readOnboardingSnapshot(heap, 64, metadata).context, 7);
  for (const [index, value] of [[0, 0], [2, 0x00300002], [3, metadata.address + 4], [4, 0], [4, 3], [5, 0], [6, 11], [6, 8 << 8], [6, 3 << 16], [6, 5 << 24]]) {
    const before = words[index]; words[index] = value;
    assert.equal(readOnboardingSnapshot(heap, 64, metadata), undefined, `word${index}`);
    words[index] = before;
  }
  const originalLoad = Atomics.load;
  let reads = 0;
  try {
    Atomics.load = (array, index) => {
      const value = originalLoad(array, index);
      if (++reads === 5) Atomics.add(new Uint32Array(heap.buffer), 64 / 4 + 4, 2);
      return value;
    };
    assert.equal(readOnboardingSnapshot(heap, 64, metadata), undefined);
  } finally { Atomics.load = originalLoad; }
  assert.equal(readOnboardingSnapshot(new Uint8Array(512), 64, metadata), undefined);
});

test('commands touch only ten mailbox bytes, publish sequence last and reject wrong context/phase/busy/pending', () => {
  const heap = initialize();
  const before = heap.slice();
  const stores = [];
  const originalStore = Atomics.store;
  try {
    Atomics.store = (array, index, value) => { stores.push(array.BYTES_PER_ELEMENT * index); return originalStore(array, index, value); };
    assert.equal(writeOnboardingCommand(heap, 64, metadata, startup), 1);
  } finally { Atomics.store = originalStore; }
  const allowed = new Set([28, 29, 30, 31, 36, 37, 38, 39, 40, 41].map(index => index + 64));
  for (let index = 0; index < heap.length; index++) if (!allowed.has(index)) assert.equal(heap[index], before[index], `Protected byte${index}`);
  assert.equal(stores.at(-1), 64 + 28);
  assert.equal(readOnboardingSnapshot(heap, 64, metadata).mapGroup, 43);
  for (const changes of [{ context: 8 }, { phase: 5 }, { command: 3 }, { language: 0 }]) {
    const packet = initialize(); const copy = packet.slice();
    assert.equal(writeOnboardingCommand(packet, 64, metadata, { ...startup, ...changes }), undefined);
    assert.deepEqual(packet, copy);
  }
  for (const phase of [0, 2, 3, 9, 10]) {
    const packet = initialize(undefined, 64, { phase }); const copy = packet.slice();
    assert.equal(writeOnboardingCommand(packet, 64, metadata, { ...startup, phase }), undefined);
    assert.deepEqual(packet, copy);
  }
  assert.equal(writeOnboardingCommand(initialize(undefined, 64, { flags: 7 }), 64, metadata, startup), 1, 'Startup hint does not block chosen language');
  assert.equal(writeOnboardingCommand(initialize(undefined, 64, { flags: 7, phase: 5 }), 64, metadata,
    { command: 2, language: 0, phase: 5, context: 7 }), undefined, 'Tutorial text must finish before ACK');
  const pendingCopy = heap.slice();
  assert.equal(writeOnboardingCommand(heap, 64, metadata, startup), undefined);
  assert.deepEqual(heap, pendingCopy);
  const card = initialize(undefined, 64, { phase: 6, language: 2 });
  new Uint32Array(card.buffer, 64, 12).set([0xffffffff, 0xffffffff], 7);
  assert.equal(writeOnboardingCommand(card, 64, metadata, { command: 2, language: 0, phase: 6, context: 7 }), 1);
});

test('only a unique advancing packet may receive startup language; ACK follows native application', async () => {
  const heap = initialize(); initialize(heap, 256);
  const timer = advancing(heap);
  const acknowledgements = [];
  const client = new NativeOnboardingBridge({ metadata, getHeap: () => heap, isActive: () => true, onState() {}, onAcknowledgement: ack => acknowledgements.push(ack) });
  try {
    await client.start();
    assert.equal(client.requestStartupLanguage(2, 7), true);
    assert.equal(readOnboardingSnapshot(heap, 256, metadata).requestSequence, 0, 'Frozen ROM copy received a write');
    assert.equal(acknowledgements.length, 0);
    const words = new Uint32Array(heap.buffer, 64, 12);
    Atomics.add(words, 4, 1); words[6] = 2 | 1 << 8 | 2 << 16 | 1 << 24; words[8] = 1; Atomics.add(words, 4, 1);
    await sleep(130);
    assert.equal(acknowledgements.length, 1);
    assert.equal(acknowledgements[0].activeLanguage, 2);
    assert.equal(acknowledgements[0].result, 1);
  } finally { clearInterval(timer); client.stop(); }
});

test('paused teaching cannot ACK, resume needs fresh frames and stale context never advances', async () => {
  const heap = initialize(undefined, 64, { phase: 5, language: 2 });
  const timer = advancing(heap);
  let active = true;
  const client = new NativeOnboardingBridge({ metadata, getHeap: () => heap, isActive: () => active, onState() {} });
  try {
    await client.start(); active = false; client.refresh();
    assert.equal(client.currentState.status, 'paused');
    assert.equal(client.acknowledgeCard(7, 5), false);
    active = true; client.refresh();
    assert.equal(client.acknowledgeCard(7, 5), false);
    await sleep(220);
    assert.equal(client.acknowledgeCard(8, 5), false);
    assert.equal(client.acknowledgeCard(7, 5), true);
  } finally { clearInterval(timer); client.stop(); }
});

test('a frozen allocation expires and only the new advancing allocation gets a command', async () => {
  const heap = initialize(); let timer = advancing(heap);
  const client = new NativeOnboardingBridge({ metadata, getHeap: () => heap, isActive: () => true, onState() {} });
  try {
    await client.start(); clearInterval(timer);
    await sleep(1150);
    assert.equal(client.requestStartupLanguage(1, 7), false);
    initialize(heap, 256, { frame: 200 }); timer = advancing(heap, 256);
    await sleep(480);
    assert.equal(client.requestStartupLanguage(1, 7), true);
    assert.equal(readOnboardingSnapshot(heap, 64, metadata).requestSequence, 0);
    assert.equal(readOnboardingSnapshot(heap, 256, metadata).requestSequence, 1);
  } finally { clearInterval(timer); client.stop(); }
});

test('ambiguous advancing copies fail closed and heap replacement requires a new liveness probe', async () => {
  let heap = initialize(); initialize(heap, 256);
  const first = advancing(heap); const second = advancing(heap, 256);
  const ambiguous = new NativeOnboardingBridge({ metadata, getHeap: () => heap, isActive: () => true, onState() {} });
  try { await ambiguous.start(); assert.equal(ambiguous.currentState.status, 'unavailable'); assert.equal(ambiguous.requestStartupLanguage(1, 7), false); }
  finally { clearInterval(first); clearInterval(second); ambiguous.stop(); }
  heap = initialize(); let timer = advancing(heap);
  const client = new NativeOnboardingBridge({ metadata, getHeap: () => heap, isActive: () => true, onState() {} });
  try {
    await client.start(); clearInterval(timer); heap = initialize(); timer = advancing(heap); client.refresh();
    assert.equal(client.requestStartupLanguage(1, 7), false);
    await sleep(220);
    assert.equal(client.requestStartupLanguage(1, 7), true);
  } finally { clearInterval(timer); client.stop(); }
});
