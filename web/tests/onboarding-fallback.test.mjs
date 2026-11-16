import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { OpeningFallbackNotice } from '../src/onboarding-fallback.ts';
import { NativeOnboardingBridge, readOnboardingSnapshot } from '../src/onboarding-bridge.ts';

const metadata = { version: 1, size: 48, address: 0x0203d000, magicA: 0x4e494354, magicB: 0x314f5254 };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function snapshot(phase, flags, activeLanguage) {
  return { frame: 2, context: 7, phase, flags, activeLanguage, result: 0, requestSequence: 0, ackSequence: 0,
    requestedContext: 0, command: 0, requestedLanguage: 0, mapGroup: 43, mapNumber: 17, x: 6, y: 6 };
}

test('trusted exempt saves and completed openings do not get a startup-failure notice after an outage', () => {
  for (const packet of [snapshot(0, 0, 1), snapshot(0, 0, 2), snapshot(9, 1, 1), snapshot(9, 1, 2)]) {
    const notice = new OpeningFallbackNotice();
    notice.observe({ status: 'live', snapshot: packet });
    for (const status of ['paused', 'discovering', 'unavailable']) notice.observe({ status });
    assert.equal(notice.take(), false);
    assert.equal(notice.take(), false);
    notice.observe({ status: 'live', snapshot: { ...packet, frame: 4 } });
    assert.equal(notice.take(), false);
  }
});

test('unknown/fresh startup, teaching and unfinished farewell keep the native fallback once per attach', () => {
  for (const packet of [undefined, snapshot(0, 0, 0), snapshot(0, 3, 1), snapshot(1, 3, 0),
    snapshot(2, 5, 1), snapshot(5, 3, 2), snapshot(8, 3, 1), snapshot(9, 5, 2), snapshot(10, 1, 0)]) {
    const notice = new OpeningFallbackNotice();
    if (packet) notice.observe({ status: 'live', snapshot: packet });
    assert.equal(notice.take(), true, JSON.stringify(packet));
    assert.equal(notice.take(), false);
    notice.reset();
    assert.equal(notice.take(), true, 'A new attach must not inherit completion or the shown latch');
  }
});

test('a fresh native run supersedes earlier completion; untrusted discovery/paused data cannot suppress fallback', () => {
  const notice = new OpeningFallbackNotice();
  notice.observe({ status: 'live', snapshot: snapshot(9, 1, 2) });
  assert.equal(notice.take(), false);
  notice.observe({ status: 'live', snapshot: snapshot(0, 0, 0) });
  assert.equal(notice.take(), true);
  for (const status of ['discovering', 'paused', 'unavailable']) {
    const fresh = new OpeningFallbackNotice();
    fresh.observe({ status, snapshot: snapshot(9, 1, 2) });
    assert.equal(fresh.take(), true);
  }
});

test('actual bridge Save-like frame stall/reconnect stays fail-closed without a false completed-opening toast', async () => {
  const heap = new Uint8Array(new SharedArrayBuffer(512));
  const words = new Uint32Array(heap.buffer, 64, 12);
  words.set([metadata.magicA, metadata.magicB, 0x00300001, metadata.address, 2, 7,
    0 | 2 << 16, 0, 0, 0, 43 << 16 | 17 << 24, 6 | 6 << 16]);
  const notice = new OpeningFallbackNotice();
  const states = [];
  const messages = [];
  let heapAvailable = true;
  let timer = setInterval(() => Atomics.add(words, 4, 2), 20);
  const client = new NativeOnboardingBridge({ metadata, getHeap: () => heapAvailable ? heap : undefined,
    isActive: () => true, onState(state) {
      states.push(state.status); notice.observe(state);
      if (state.status === 'unavailable' && notice.take()) messages.push('opening fallback');
    } });
  try {
    await client.start();
    assert.equal(client.currentState.status, 'live');
    clearInterval(timer);
    await sleep(1050); // Ordinary native Save may hold the frame counter still.
    assert.equal(client.requestStartupLanguage(1, 7), false);
    heapAvailable = false; client.refresh(); // Transient reconnect failure.
    const deadline = performance.now() + 800;
    while (!states.includes('unavailable') && performance.now() < deadline) await sleep(10);
    assert.ok(states.includes('unavailable'));
    assert.deepEqual(messages, []);
    assert.equal(readOnboardingSnapshot(heap, 64, metadata).requestSequence, 0);
    assert.equal(client.requestStartupLanguage(1, 7), false, 'No stale write after outage');
  } finally { clearInterval(timer); client.stop(); }
});

// Execute the actual controller with its view/locale/browser boundaries stubbed.
// No DOM, emulator or input is driven. This catches missing notification wiring
// as well as exercising the small production policy above.
const controllerSource = readFileSync(new URL('../src/onboarding.ts', import.meta.url), 'utf8');
function controller(source = controllerSource) {
  const messages = [];
  const host = { running: true, paused: false, restarting: false, immersive: true };
  let callbacks;
  const view = { cardOpen: false, cardPending: false, activeCard: undefined,
    closeCard() { this.cardOpen = this.cardPending = false; this.activeCard = undefined; },
    showCard(card) { this.cardOpen = true; this.activeCard = card; },
    setPending(value) { this.cardPending = value; }, continueCard() {}, destroy() {} };
  class Bridge {
    constructor(options) { callbacks = options; }
    start() {} stop() {} refresh() {}
    requestStartupLanguage() { return true; }
    acknowledgeCard() { return true; }
  }
  const modules = {
    './onboarding-bridge': { NativeOnboardingBridge: Bridge, onboardingAccepts: packet => (packet.flags & 3) === 3 && !(packet.flags & 4) },
    './onboarding-fallback': { OpeningFallbackNotice },
    './onboarding-view': { createOnboardingView: () => view },
    './i18n': { getRememberedLocale: () => undefined, getLocale: () => 'en', onLocaleChange: () => () => {}, setLocale() {} },
  };
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('require', 'exports', 'document', compiled)(name => {
    assert.ok(name in modules, `Unexpected controller dependency ${name}`); return modules[name];
  }, exports, { hidden: false });
  const api = exports.createOnboarding({ host: { querySelector: () => null }, getState: () => host,
    getHeap: () => undefined, pause() { host.paused = true; }, resume() { host.paused = false; },
    leaveGame() {}, releaseInputs() {}, refreshInput() {}, message(text) { messages.push(text); } });
  api.attach(metadata);
  return { api, host, view, messages, publish: state => callbacks.onState(state), ack: value => callbacks.onAcknowledgement(value) };
}

test('actual controller suppresses only completed/exempt outage notices; the old unconditional branch reproduces the false toast', () => {
  for (const packet of [snapshot(0, 0, 1), snapshot(0, 0, 2), snapshot(9, 1, 2)]) {
    const current = controller();
    current.publish({ status: 'live', snapshot: packet });
    current.publish({ status: 'discovering' });
    current.publish({ status: 'unavailable' });
    assert.deepEqual(current.messages, []);
    assert.equal(current.api.blocksInput, false);
    assert.equal(current.api.blocksCityMap, false);
    const oldBranch = controllerSource.replace('if (fallbackNotice.take()) {', 'if (true) {');
    assert.notEqual(oldBranch, controllerSource, 'Non-no-op old behavior regression control');
    const old = controller(oldBranch);
    old.publish({ status: 'live', snapshot: packet }); old.publish({ status: 'unavailable' });
    assert.equal(old.messages.length, 1, 'The prior unconditional path falsely reported opening failure');
  }
});

test('actual controller keeps fresh-opening/rejected-language fallback and mandatory-guide native input recovery', () => {
  for (const packet of [snapshot(0, 0, 0), snapshot(1, 3, 0), snapshot(5, 3, 2), snapshot(9, 5, 1)]) {
    const current = controller();
    current.publish({ status: 'live', snapshot: packet });
    current.publish({ status: 'unavailable' });
    assert.equal(current.messages.length, 1);
    assert.match(current.messages[0], /Use Interact to continue/);
    assert.equal(current.api.blocksInput, false);
    assert.equal(current.host.paused, false);
    assert.equal(current.view.cardOpen, false);
    current.publish({ status: 'unavailable' });
    assert.equal(current.messages.length, 1, 'No duplicate transport notice');
  }
  const rejected = controller();
  rejected.ack({ sequence: 1, command: 1, context: 7, result: 2, activeLanguage: 0 });
  assert.equal(rejected.messages.length, 1, 'Native rejected startup language still reports fallback');
  const reattached = controller();
  reattached.publish({ status: 'live', snapshot: snapshot(9, 1, 2) });
  reattached.api.attach(metadata); reattached.publish({ status: 'unavailable' });
  assert.equal(reattached.messages.length, 1, 'New attach starts conservatively');
});
