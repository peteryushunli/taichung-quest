import assert from 'node:assert/strict';
import test from 'node:test';
import { CaptureStorageController } from '../src/capture-storage.ts';
import { CAPTURE_BOOT_INTENT_KEY, readCaptureBootPolicy, writeCaptureBootIntent } from '../src/capture-persistence.ts';
import { proof, fixture } from './helpers/capture-save-fixture.mjs';
const sha = 'd'.repeat(64);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(condition) { const deadline = Date.now() + 1000; while (!condition()) { assert.ok(Date.now() < deadline); await sleep(2); } }
function setup() {
  const values = new Map(); const events = [];
  const storage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => { events.push('intent'); values.set(k, v); }, removeItem: k => { events.push('clear'); values.delete(k); } };
  let current = { ...proof, publication: 2, frame: 4, request: 1, acknowledgement: 0,
    phase: 1, site: 0, species: 131, balls: 3, result: 0, saveStatus: 1, ackStatus: 0 };
  let bytes = fixture().bytes;
  const options = { romSha256: sha, storage, readSave: () => bytes, getCurrent: () => current,
    flush: async () => { events.push('flush'); }, discardSnapshot: () => { events.push('discard'); }, timeoutMs: 25 };
  return { options, storage, events, values, get current() { return current; }, set current(v) { current = v; }, get bytes() { return bytes; }, set bytes(v) { bytes = v; } };
}

test('BEGIN resolves only after the current native file and both ordered flushes; boot intent survives', async () => {
  const f = setup(); f.bytes = undefined; const resolvers = [];
  f.options.flush = () => { f.events.push('flush'); return new Promise(resolve => resolvers.push(resolve)); };
  f.options.timeoutMs = 1000;
  const controller = new CaptureStorageController(f.options);
  let done = false;
  const work = controller.persist(f.current).then(() => { done = true; });
  assert.equal(controller.blocksSnapshots, true); assert.equal(readCaptureBootPolicy(f.storage).forceCartridge, true);
  assert.deepEqual(f.events, ['intent']); f.bytes = fixture().bytes;
  await until(() => resolvers.length === 1); assert.equal(done, false); assert.deepEqual(f.events, ['intent', 'flush']);
  resolvers[0](); await until(() => resolvers.length === 2);
  assert.deepEqual(f.events, ['intent', 'flush', 'discard', 'flush']); assert.equal(done, false);
  resolvers[1](); await work;
  assert.equal(done, true); assert.equal(controller.blocksSnapshots, true); //BEGIN remains cartridge-only.
});

test('RESULT clears its own intent only after the new native unlock/party transaction is durable', async () => {
  const f = setup(); f.current = { ...f.current, phase: 4, request: 2, unlocks: proof.attempts };
  f.bytes = fixture(f.current).bytes;
  const controller = new CaptureStorageController(f.options);
  await controller.persist(f.current);
  assert.deepEqual(f.events, ['intent', 'flush', 'discard', 'flush', 'clear']);
  assert.equal(controller.blocksSnapshots, false); assert.equal(readCaptureBootPolicy(f.storage).forceCartridge, false);
});

test('incomplete or wrong native transactions never reach snapshot deletion or durable success', async () => {
  for (const bytes of [undefined, fixture({ ...proof, saveCounter: 6 }).bytes,
    fixture({ ...proof, trainerId: 99 }).bytes, fixture({ ...proof, attempts: 0, unlocks: 0 }).bytes]) {
    const f = setup(); f.bytes = bytes;
    const controller = new CaptureStorageController(f.options);
    await assert.rejects(controller.persist(f.current), /complete native landmark save/);
    assert.deepEqual(f.events, ['intent']); assert.equal(controller.blocksSnapshots, true);
  }
});

test('storage failure at either flush retains the boot safeguard and never returns success', async () => {
  for (const failed of [1, 2]) {
    const f = setup(); let count = 0;
    f.options.flush = async () => { f.events.push('flush'); if (++count === failed) throw new Error('disk unavailable'); };
    const controller = new CaptureStorageController(f.options);
    await assert.rejects(controller.persist(f.current), /disk unavailable/);
    assert.equal(controller.blocksSnapshots, true);
    assert.equal(f.events.includes('discard'), failed === 2); assert.equal(f.events.includes('clear'), false);
  }
});

test('a changed request or save during either await cannot complete the old transaction', async () => {
  const f = setup(); f.options.flush = async () => { f.current = { ...f.current, request: 2 }; };
  const controller = new CaptureStorageController(f.options);
  await assert.rejects(controller.persist(f.current), /request changed/);
  assert.equal(controller.blocksSnapshots, true); assert.equal(f.events.includes('discard'), false);
  const g = setup(); let flushes = 0;
  g.options.flush = async () => { if (++flushes === 2) g.bytes = fixture({ ...proof, trainerId: 99 }).bytes; };
  await assert.rejects(new CaptureStorageController(g.options).persist(g.current), /save changed/);
});

test('interrupted native Continue reconciles equal/newer generations, including counter wrap, before snapshots resume', async () => {
  for (const [before, after] of [[7, 7], [7, 8], [0xffffffff, 0]]) {
    const f = setup(); const intent = { ...proof, version: 1, romSha256: sha, stage: 'begin', saveCounter: before };
    writeCaptureBootIntent(f.storage, intent); f.events.length = 0;
    f.current = { ...f.current, phase: 0, site: 255, species: 0 };
    f.bytes = fixture({ ...proof, saveCounter: after }).bytes;
    const controller = new CaptureStorageController(f.options);
    assert.equal(await controller.reconcile(f.current), true);
    assert.deepEqual(f.events, ['flush', 'discard', 'flush', 'clear']); assert.equal(controller.blocksSnapshots, false);
  }
});

test('wrong-trainer, refunded attempts, older SRAM, malformed markers and active battles cannot clear intent', async () => {
  for (const kind of ['trainer', 'refund', 'older', 'malformed', 'battle']) {
    const f = setup(); writeCaptureBootIntent(f.storage, { ...proof, version: 1, romSha256: sha, stage: 'begin' });
    f.current = { ...f.current, phase: 0, site: 255, species: 0 }; f.events.length = 0;
    if (kind === 'trainer') f.current = { ...f.current, trainerId: 99 };
    if (kind === 'refund') f.current = { ...f.current, attempts: 0, unlocks: 0 };
    if (kind === 'older') f.bytes = fixture({ ...proof, saveCounter: 6 }).bytes;
    if (kind === 'malformed') { f.storage.setItem(CAPTURE_BOOT_INTENT_KEY, '{}'); f.events.length = 0; }
    if (kind === 'battle') f.current = { ...f.current, phase: 3, site: 0, species: 131 };
    const controller = new CaptureStorageController(f.options);
    assert.equal(await controller.reconcile(f.current), false, kind); assert.equal(controller.blocksSnapshots, true);
    assert.deepEqual(f.events, [], kind);
  }
});

test('a genuinely replaced native save reconciles only after its new identity and masks are completely stored', async () => {
  const f = setup(); writeCaptureBootIntent(f.storage, { ...proof, version: 1, romSha256: sha, stage: 'begin' });
  f.current = { ...f.current, phase: 0, site: 255, species: 0, trainerId: 99, attempts: 0, unlocks: 0 };
  const controller = new CaptureStorageController(f.options);
  assert.equal(await controller.reconcile(f.current), false); //old file cannot attest new game.
  f.bytes = fixture({ trainerId: 99, attempts: 0, unlocks: 0, saveCounter: 1 }).bytes;
  assert.equal(await controller.reconcile(f.current), true);
  assert.equal(controller.blocksSnapshots, false);
});

test('new high-bit results retain the ordered native durability transaction', async () => {
  for (const site of [21, 22, 23, 24, 25, 26]) for (const caught of [false, true]) {
    const f = setup();
    f.current = { ...f.current, phase: 4, site, attempts: proof.attempts | 1 << site, unlocks: proof.unlocks | (caught ? 1 << site : 0) };
    f.bytes = fixture(f.current, 1, 5, site >= 24 ? 0xec03 : 0xec02).bytes;
    const controller = new CaptureStorageController(f.options);
    await controller.persist(f.current);
    assert.deepEqual(f.events, ['intent', 'flush', 'discard', 'flush', 'clear']);
    assert.equal(controller.blocksSnapshots, false);
  }
});

test('each starter Begin survives reload until its exact EC03 native Continue can reconcile', async () => {
  for (const [site, species] of [[24, 6], [25, 9], [26, 3]]) {
    const f = setup();
    f.current = { ...f.current, site, species, attempts: proof.attempts | 1 << site };
    f.bytes = fixture(f.current, 0, 13, 0xec03).bytes;
    await new CaptureStorageController(f.options).persist(f.current);
    assert.deepEqual(f.events, ['intent', 'flush', 'discard', 'flush']);
    assert.equal(readCaptureBootPolicy(f.storage).forceCartridge, true);
    assert.equal(readCaptureBootPolicy(f.storage).intent.attempts, f.current.attempts);
    const resumed = new CaptureStorageController(f.options);
    f.current = { ...f.current, phase: 0, site: 255, species: 0 };
    const expected = f.current;
    f.current = { ...expected, attempts: proof.attempts };
    assert.equal(await resumed.reconcile(f.current), false, 'A refunded starter attempt cannot clear the fence.');
    f.current = expected; f.events.length = 0;
    assert.equal(await resumed.reconcile(f.current), true);
    assert.deepEqual(f.events, ['flush', 'discard', 'flush', 'clear']);
    assert.equal(resumed.blocksSnapshots, false);
  }
});

test('malformed EC03 extra bits leave native Save unacknowledged and snapshots fenced', async () => {
  const f = setup();
  f.current = { ...f.current, site: 26, species: 3, attempts: proof.attempts | 1 << 26 };
  const file = fixture(f.current, 1, 5, 0xec03);
  file.view.setUint16(file.positions[2] + 0x25e, 3, true); file.seal(2);
  f.bytes = file.bytes;
  const controller = new CaptureStorageController(f.options);
  await assert.rejects(controller.persist(f.current), /complete native landmark save/);
  assert.deepEqual(f.events, ['intent']);
  assert.equal(controller.blocksSnapshots, true);
});
