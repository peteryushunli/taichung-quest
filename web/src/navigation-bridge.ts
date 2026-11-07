/** Read-only TCNAV001 client. The GBA address is an identity check, never a
 * guessed WebAssembly heap offset. No navigation memory is written here. */
export const NAVIGATION_FLAGS = { READY: 1, FIELD: 2, POSITION_VALID: 4, OUTDOOR: 8, INDOOR: 16, CYCLING: 32, CAN_TOGGLE_BIKE: 64 } as const;
export type NavigationMetadata = { version: 1; size: 48; address: number; magicA: number; magicB: number };
export type NavigationSnapshot = {
  sequence: number; frame: number; flags: number; x: number; y: number;
  mapGroup: number; mapNumber: number; facing: number; mapType: number;
  width: number; height: number; contextFlags: number;
};
export type NavigationState = { phase: 'connecting' | 'hidden' | 'live' | 'unavailable'; snapshot?: NavigationSnapshot };
const MAGIC_A = 0x414e4354;
const MAGIC_B = 0x31303056;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function parseNavigationMetadata(value: unknown, romSha256: string, romBytes: number, geometryFingerprint: string): NavigationMetadata | undefined {
  if (!value || typeof value !== 'object') return;
  const build = value as Record<string, unknown>;
  if (!/^[a-f\d]{64}$/.test(romSha256) || typeof build.sha256 !== 'string' || build.sha256.toLowerCase() !== romSha256 || build.bytes !== romBytes) return;
  if (!build.minimap || typeof build.minimap !== 'object' || !build.navigationBridge || typeof build.navigationBridge !== 'object') return;
  const binding = build.minimap as Record<string, unknown>;
  const packet = build.navigationBridge as Record<string, unknown>;
  if (binding.schemaVersion !== 1 || !/^[a-f\d]{64}$/.test(geometryFingerprint) || binding.geometryFingerprintSha256 !== geometryFingerprint) return;
  if (packet.version !== 1 || packet.size !== 48 || packet.magicA !== MAGIC_A || packet.magicB !== MAGIC_B) return;
  if (typeof packet.address !== 'number' || !Number.isInteger(packet.address) || packet.address % 4 || packet.address < 0x02000000 || packet.address > 0x02040000 - 48) return;
  return { version: 1, size: 48, address: packet.address, magicA: MAGIC_A, magicB: MAGIC_B };
}

function heapWords(heap: Uint8Array) {
  if (typeof SharedArrayBuffer === 'undefined' || !(heap.buffer instanceof SharedArrayBuffer) || heap.byteOffset !== 0 || heap.byteLength % 4) return;
  return new Uint32Array(heap.buffer);
}

/** A coherent packet may intentionally describe a hidden/invalid context.
 * Keep those packets observable for liveness, but never display their position. */
export function readNavigationSnapshot(heap: Uint8Array, offset: number, metadata: NavigationMetadata): NavigationSnapshot | undefined {
  const words = heapWords(heap);
  if (!words || !Number.isInteger(offset) || offset < 0 || offset % 4 || offset + 48 > heap.byteLength) return;
  const base = offset / 4;
  const sequence = Atomics.load(words, base + 4);
  if (!sequence || sequence % 2) return;
  const copy = Array.from({ length: 12 }, (_, index) => Atomics.load(words, base + index));
  if (sequence !== copy[4] || sequence !== Atomics.load(words, base + 4)) return;
  if (copy[0] !== metadata.magicA || copy[1] !== metadata.magicB || copy[2] !== 0x00300001 || copy[3] !== metadata.address || !copy[5]) return;
  if ((copy[6] & ~127) || (copy[10] >>> 16) !== 0 || copy[11] !== 0) return;
  return {
    sequence, frame: copy[5], flags: copy[6], x: (copy[7] << 16) >> 16, y: copy[7] >> 16,
    mapGroup: copy[8] & 255, mapNumber: copy[8] >>> 8 & 255, facing: copy[8] >>> 16 & 255, mapType: copy[8] >>> 24,
    width: copy[9] & 65535, height: copy[9] >>> 16, contextFlags: copy[10] & 65535,
  };
}

export function isFieldSnapshot(packet: NavigationSnapshot) {
  const required = NAVIGATION_FLAGS.READY | NAVIGATION_FLAGS.FIELD | NAVIGATION_FLAGS.POSITION_VALID;
  const scope = packet.flags & (NAVIGATION_FLAGS.OUTDOOR | NAVIGATION_FLAGS.INDOOR);
  return (packet.flags & required) === required && !(packet.flags & ~127) && packet.contextFlags === 0 &&
    (scope === NAVIGATION_FLAGS.OUTDOOR || scope === NAVIGATION_FLAGS.INDOOR) &&
    Number.isInteger(packet.x) && Number.isInteger(packet.y) && packet.x >= 0 && packet.y >= 0 &&
    packet.width > 0 && packet.height > 0 && packet.x < packet.width && packet.y < packet.height &&
    packet.facing >= 1 && packet.facing <= 4;
}

/** First samples, pauses, frame/sequence rewind and wrap start a new epoch.
 * A stationary player stays fresh when native frames continue to advance. */
export class NavigationFreshness {
  private previous?: { frame: number; sequence: number };
  private advancedAt = 0;
  private advancing = false;
  reset() { this.previous = undefined; this.advancing = false; this.advancedAt = 0; }
  isStale(now: number) { return !!this.previous && now - this.advancedAt >= 1000; }
  observe(packet: NavigationSnapshot, now: number) {
    const previous = this.previous;
    if (!previous || packet.frame < previous.frame || packet.sequence < previous.sequence || now < this.advancedAt) {
      this.previous = { frame: packet.frame, sequence: packet.sequence };
      this.advancedAt = now;
      this.advancing = false;
      return false;
    }
    if (packet.frame !== previous.frame) {
      if (packet.sequence === previous.sequence) { this.reset(); return false; }
      this.advancing = true;
      this.advancedAt = now;
      this.previous = { frame: packet.frame, sequence: packet.sequence };
    }
    return this.advancing && now - this.advancedAt < 1000;
  }
}

type ClientOptions = {
  metadata: NavigationMetadata;
  getHeap(): Uint8Array | undefined;
  isActive(): boolean;
  onState(state: NavigationState): void;
};

async function scanCandidates(heap: Uint8Array, metadata: NavigationMetadata, cancelled: () => boolean) {
  const words = heapWords(heap);
  if (!words) throw new Error('Navigation requires the pinned shared heap.');
  const matches: Array<{ offset: number; frame: number; sequence: number }> = [];
  const chunkWords = 512 * 1024;
  for (let start = 0; start <= words.length - 12; start += chunkWords) {
    if (cancelled()) return [];
    const end = Math.min(start + chunkWords, words.length - 11);
    for (let index = start; index < end; index++) {
      if (words[index] !== metadata.magicA) continue;
      const packet = readNavigationSnapshot(heap, index * 4, metadata);
      if (packet) matches.push({ offset: index * 4, frame: packet.frame, sequence: packet.sequence });
      if (matches.length > 64) throw new Error('Too many navigation packet candidates.');
    }
    if (end < words.length - 11) await sleep(0);
  }
  return matches;
}

export class NativeNavigationBridge {
  private stopped = false;
  private discovering = false;
  private heap?: Uint8Array;
  private offset?: number;
  private interval?: ReturnType<typeof setInterval>;
  private freshness = new NavigationFreshness();
  private wasActive = false;
  private invalidReads = 0;
  private state: NavigationState = { phase: 'connecting' };
  private options: ClientOptions;
  constructor(options: ClientOptions) { this.options = options; }
  get currentState() { return this.state; }
  private publish(state: NavigationState) {
    if (!state.snapshot && !this.state.snapshot && this.state.phase === state.phase) return;
    this.state = state;
    this.options.onState(state);
  }

  async start() {
    if (this.stopped || this.discovering || this.interval) return;
    this.discovering = true;
    this.options.onState(this.state);
    try {
      while (!this.stopped) {
        if (!this.options.isActive()) { this.refresh(); await sleep(200); continue; }
        const heap = this.options.getHeap();
        if (!heap) throw new Error('Navigation heap is unavailable.');
        const candidates = await scanCandidates(heap, this.options.metadata, () => this.stopped || !this.options.isActive());
        await sleep(80);
        if (this.stopped) return;
        const current = this.options.getHeap();
        if (!this.options.isActive() || current?.buffer !== heap.buffer || current.byteLength !== heap.byteLength) continue;
        const live = candidates.filter(({ offset, frame, sequence }) => {
          const packet = readNavigationSnapshot(heap, offset, this.options.metadata);
          return packet && packet.frame > frame && packet.sequence !== sequence;
        });
        if (live.length > 1) throw new Error('Ambiguous advancing navigation packets.');
        if (live.length === 1) {
          this.heap = heap;
          this.offset = live[0].offset;
          this.freshness.reset();
          this.interval = setInterval(() => this.poll(), 100);
          return;
        }
        await sleep(500);
      }
    } catch (error) {
      if (!this.stopped) {
        console.info('Native minimap unavailable:', error);
        this.publish({ phase: 'unavailable' });
      }
    } finally { this.discovering = false; }
  }

  /** Called synchronously by browser pause/modal/view transitions. */
  refresh() {
    if (this.stopped) return;
    if (!this.options.isActive()) {
      this.wasActive = false;
      this.freshness.reset();
      this.publish({ phase: 'hidden' });
    } else if (this.offset !== undefined) this.poll();
  }

  private poll() {
    if (this.stopped || this.offset === undefined) return;
    if (!this.options.isActive()) { this.refresh(); return; }
    if (!this.wasActive) { this.wasActive = true; this.freshness.reset(); }
    const heap = this.options.getHeap();
    if (!heap || heap.buffer !== this.heap?.buffer || heap.byteLength !== this.heap.byteLength) {
      this.reconnect(); return;
    }
    const packet = readNavigationSnapshot(heap, this.offset, this.options.metadata);
    if (!packet) {
      // Retry an overlapping publication at the same verified allocation.
      // Repeated failure can mean reset replaced that allocation.
      this.freshness.reset();
      this.publish({ phase: 'hidden' });
      if (++this.invalidReads >= 3) this.reconnect();
      return;
    }
    this.invalidReads = 0;
    const now = performance.now();
    const fresh = this.freshness.observe(packet, now);
    this.publish(fresh && isFieldSnapshot(packet) ? { phase: 'live', snapshot: packet } : { phase: 'hidden' });
    // EWRAM can be reallocated inside the same Wasm heap after a core reset.
    // A coherent but frozen old allocation is not a reason to keep its offset.
    if (this.freshness.isStale(now)) this.reconnect();
  }

  private reconnect() {
    if (this.interval) clearInterval(this.interval);
    this.interval = undefined;
    this.heap = undefined;
    this.offset = undefined;
    this.wasActive = false;
    this.invalidReads = 0;
    this.freshness.reset();
    this.publish({ phase: 'connecting' });
    void this.start();
  }

  stop() {
    this.stopped = true;
    if (this.interval) clearInterval(this.interval);
    this.interval = undefined;
    this.freshness.reset();
    this.publish({ phase: 'hidden' });
  }
}
