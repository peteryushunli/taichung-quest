import type { CaptureSaveProof } from './capture-persistence';
import { CAPTURE_MASK, CAPTURE_SITE_COUNT, LEGACY_CAPTURE_MASK, RESERVED_CAPTURE_SITE_ID } from './capture-persistence.ts';

export type EncounterMetadata = ({ version: 1; size: 64 } | { version: 2; size: 72 })
  & { address: number; magicA: number; magicB: number };
export type EncounterSnapshot = CaptureSaveProof & {
  publication: number; frame: number; request: number; acknowledgement: number;
  species: number; site: number; phase: number; balls: number; result: number;
  saveStatus: number; ackStatus: number;
};
export type EncounterBridgeState = {
  status: 'discovering' | 'live' | 'paused' | 'unavailable';
  snapshot?: EncounterSnapshot;
};
const MAGIC_A = 0x4e454354;
const MAGIC_B = 0x31525443;
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const pendingSave = (p: EncounterSnapshot) => (p.phase === 1 || p.phase === 4) && p.saveStatus === 1;

export function parseEncounterMetadata(value: unknown, sha256: string, bytes: number): EncounterMetadata | undefined {
  if (!value || typeof value !== 'object' || !/^[a-f0-9]{64}$/.test(sha256)) return;
  const build = value as Record<string, unknown>;
  const packet = build.encounterBridge as Partial<EncounterMetadata> | undefined;
  if (build.sha256 !== sha256 || build.bytes !== bytes || !packet
    || !(packet.version === 1 && packet.size === 64 || packet.version === 2 && packet.size === 72)
    || packet.magicA !== MAGIC_A || packet.magicB !== MAGIC_B
    || typeof packet.address !== 'number' || !Number.isInteger(packet.address) || packet.address % 4
    || packet.address < 0x02000000 || packet.address > 0x02040000 - packet.size) return;
  return packet as EncounterMetadata;
}

function words(heap: Uint8Array) {
  if (typeof SharedArrayBuffer === 'undefined' || !(heap.buffer instanceof SharedArrayBuffer)
    || heap.byteOffset || heap.byteLength % 4) return;
  return new Uint32Array(heap.buffer);
}

export function readEncounterSnapshot(heap: Uint8Array, offset: number, metadata: EncounterMetadata): EncounterSnapshot | undefined {
  const source = words(heap);
  if (!source || !Number.isInteger(offset) || offset < 0 || offset % 4 || offset + metadata.size > heap.byteLength) return;
  const base = offset / 4;
  const publication = Atomics.load(source, base + 4);
  if (!publication || publication & 1) return;
  const copy = Array.from({ length: metadata.size / 4 }, (_, i) => Atomics.load(source, base + i));
  if (copy[4] !== publication || Atomics.load(source, base + 4) !== publication
    || !copy[5] || copy[0] !== metadata.magicA || copy[1] !== metadata.magicB
    || copy[2] !== (metadata.size << 16 | metadata.version) || copy[3] !== metadata.address || copy.at(-1) !== 0) return;
  const wide = metadata.version === 2;
  const species = copy[wide ? 10 : 9];
  const status = copy[wide ? 11 : 10];
  const snapshot: EncounterSnapshot = {
    publication, frame: copy[5], request: copy[6], acknowledgement: copy[7],
    attempts: wide ? copy[8] : copy[8] & 0xffff, unlocks: wide ? copy[9] : copy[8] >>> 16,
    species: species & 0xffff, site: species >>> 16 & 255, phase: species >>> 24,
    balls: status & 255, result: status >>> 8 & 255, saveStatus: status >>> 16 & 255,
    ackStatus: status >>> 24, saveCounter: copy[wide ? 14 : 12], trainerId: copy[wide ? 15 : 13],
  };
  const mask = wide ? CAPTURE_MASK : LEGACY_CAPTURE_MASK;
  if (snapshot.attempts > mask || snapshot.unlocks > mask || snapshot.unlocks & ~snapshot.attempts
    || snapshot.phase > 6 || snapshot.balls > 3 || snapshot.result > 7 || snapshot.saveStatus > 1 || snapshot.ackStatus > 2) return;
  if (snapshot.phase === 0 ? snapshot.site !== 255 || snapshot.species !== 0
    : snapshot.site >= (wide ? CAPTURE_SITE_COUNT : 14) || snapshot.site === RESERVED_CAPTURE_SITE_ID
      || snapshot.species < 1 || snapshot.species > 150
      || !snapshot.request || !(snapshot.attempts & 1 << snapshot.site)) return;
  return snapshot;
}

const sameRequest = (a: EncounterSnapshot, b: EncounterSnapshot) => a.request === b.request
  && a.phase === b.phase && a.site === b.site && a.species === b.species
  && a.saveCounter === b.saveCounter && a.trainerId === b.trainerId
  && a.attempts === b.attempts && a.unlocks === b.unlocks;

/** Commit the acknowledgement sequence after all durable save fields. */
export function writeEncounterAcknowledgement(heap: Uint8Array, offset: number, metadata: EncounterMetadata,
  expected: EncounterSnapshot, status: 1 | 2): boolean {
  if (status !== 1 && status !== 2) return false;
  const current = readEncounterSnapshot(heap, offset, metadata);
  if (!current || !pendingSave(current) || !sameRequest(current, expected)
    || current.acknowledgement === current.request) return false;
  const target = words(heap)!;
  const base = offset / 4;
  if (metadata.version === 2) {
    Atomics.store(target, base + 12, current.attempts);
    Atomics.store(target, base + 13, current.unlocks);
    Atomics.store(target, base + 16, current.saveCounter);
    Atomics.store(heap, offset + 47, status);
  } else {
    Atomics.store(target, base + 11, current.attempts | current.unlocks << 16);
    Atomics.store(target, base + 14, current.saveCounter);
    Atomics.store(heap, offset + 43, status);
  }
  Atomics.store(target, base + 7, current.request);
  return true;
}

type Options = {
  metadata: EncounterMetadata;
  getHeap(): Uint8Array | undefined;
  isActive(): boolean;
  onState(state: EncounterBridgeState): void;
  // Resolve only after exact SRAM proof + owned-snapshot deletion + durable
  // browser boot intent + IndexedDB flush. Rejection produces failure ACK.
  onDurableSave(snapshot: EncounterSnapshot): Promise<void>;
  onSaveState?(snapshot?: EncounterSnapshot): void;
};

/** Sole advancing packet discovery is required after every heap replacement.
 * No stale mirror, paused frame or older asynchronous transaction can ACK. */
export class NativeEncounterBridge {
  private readonly options: Options;
  private stopped = false;
  private discovering = false;
  private interval?: ReturnType<typeof setInterval>;
  private allocation?: { heap: Uint8Array; offset: number };
  private lastFrame = 0;
  private advancedAt = 0;
  private transaction = false;
  private state: EncounterBridgeState = { status: 'discovering' };

  constructor(options: Options) { this.options = options; }
  get currentState() { return this.state; }
  get currentSnapshot() {
    const a = this.allocation;
    return a && this.options.getHeap()?.buffer === a.heap.buffer
      ? readEncounterSnapshot(a.heap, a.offset, this.options.metadata) : undefined;
  }
  private publish(state: EncounterBridgeState) { this.state = state; this.options.onState(state); }

  private rediscover() {
    this.options.onSaveState?.();
    if (this.interval) clearInterval(this.interval);
    this.interval = undefined;
    this.allocation = undefined; // Invalidates any older asynchronous completion.
    this.publish({ status: 'discovering' });
    // The first poll can itself request rediscovery before start() reaches its
    // finally block. Start on the next turn after that discovery lock clears.
    setTimeout(() => { void this.start(); }, 0);
  }

  async start() {
    if (this.stopped || this.discovering || this.interval) return;
    this.discovering = true;
    this.publish({ status: 'discovering' });
    try {
      while (!this.stopped) {
        if (!this.options.isActive()) { this.publish({ status: 'paused' }); await wait(80); continue; }
        const heap = this.options.getHeap();
        const source = heap && words(heap);
        if (!heap || !source) throw new Error('Matching shared encounter heap unavailable.');
        const candidates: Array<{ offset: number; frame: number; publication: number }> = [];
        const chunk = 512 * 1024;
        const stop = source.length - this.options.metadata.size / 4 + 1;
        for (let start = 0; start < stop; start += chunk) {
          if (this.stopped || !this.options.isActive()) break;
          const end = Math.min(stop, start + chunk);
          for (let index = start; index < end; index++) {
            if (Atomics.load(source, index) !== this.options.metadata.magicA) continue;
            const packet = readEncounterSnapshot(heap, index * 4, this.options.metadata);
            if (packet) candidates.push({ offset: index * 4, frame: packet.frame, publication: packet.publication });
            if (candidates.length > 64) throw new Error('Too many encounter packet candidates.');
          }
          if (end < stop) await wait(0);
        }
        await wait(80);
        const current = this.options.getHeap();
        if (this.stopped) return;
        if (!this.options.isActive() || current?.buffer !== heap.buffer || current.byteLength !== heap.byteLength) continue;
        const advancing = candidates.filter(candidate => {
          const packet = readEncounterSnapshot(heap, candidate.offset, this.options.metadata);
          return packet && packet.frame !== candidate.frame && packet.publication !== candidate.publication;
        });
        if (advancing.length > 1) throw new Error('Multiple advancing encounter packets; refusing to choose.');
        if (!advancing.length) { await wait(100); continue; }
        this.allocation = { heap, offset: advancing[0].offset };
        this.lastFrame = 0;
        this.advancedAt = Date.now();
        this.interval = setInterval(() => this.poll(), 60);
        this.poll();
        return;
      }
    } catch (error) {
      console.info('Native encounter persistence unavailable:', error);
      this.allocation = undefined;
      this.publish({ status: 'unavailable' });
    } finally { this.discovering = false; }
  }

  /** Core frame boundary sees the single pending-save frame before flash
   * programming. It does not publish UI state or acknowledge durability. */
  onFrame() {
    if (this.stopped || !this.options.isActive()) { this.options.onSaveState?.(); return; }
    this.options.onSaveState?.(this.currentSnapshot);
  }

  private poll() {
    if (this.stopped) return;
    const a = this.allocation;
    const heap = this.options.getHeap();
    if (!a || !heap || heap.buffer !== a.heap.buffer || heap.byteLength !== a.heap.byteLength) {
      this.rediscover();
      return;
    }
    const snapshot = readEncounterSnapshot(heap, a.offset, this.options.metadata);
    if (!snapshot) { this.rediscover(); return; }
    if (this.lastFrame && ((snapshot.frame - this.lastFrame) >>> 0) > 0x7fffffff) {
      this.rediscover(); // Native reset can reuse the same WASM allocation.
      return;
    }
    if (snapshot.frame !== this.lastFrame) { this.lastFrame = snapshot.frame; this.advancedAt = Date.now(); }
    if (!this.options.isActive() || Date.now() - this.advancedAt > 500) {
      this.options.onSaveState?.();
      this.publish({ status: 'paused', snapshot });
      return;
    }
    this.options.onSaveState?.(snapshot);
    this.publish({ status: 'live', snapshot });
    if (pendingSave(snapshot) && snapshot.acknowledgement !== snapshot.request && !this.transaction)
      void this.complete(a, snapshot);
  }

  private async complete(allocation: { heap: Uint8Array; offset: number }, snapshot: EncounterSnapshot) {
    this.transaction = true;
    let status: 1 | 2 = 1;
    try { await this.options.onDurableSave(snapshot); } catch (error) {
      status = 2;
      console.info('Landmark durable save failed:', error);
    }
    try {
      const currentHeap = this.options.getHeap();
      if (this.stopped || !this.options.isActive() || this.allocation !== allocation
        || currentHeap?.buffer !== allocation.heap.buffer || currentHeap.byteLength !== allocation.heap.byteLength
        || Date.now() - this.advancedAt > 500) return;
      this.options.onSaveState?.(); // Restore ordinary timing before ACK/battle.
      writeEncounterAcknowledgement(allocation.heap, allocation.offset, this.options.metadata, snapshot, status);
    } finally { this.options.onSaveState?.(); this.transaction = false; }
  }

  stop() {
    this.options.onSaveState?.();
    this.stopped = true;
    this.allocation = undefined;
    if (this.interval) clearInterval(this.interval);
    this.interval = undefined;
  }
}
