/** Narrow client for the ROM's versioned 32-byte language packet. No GBA RAM
 * offsets are inferred: build metadata identifies the symbol, and a changing
 * tick distinguishes its live allocation from ROM bytes and frozen snapshots. */
export type NativeLanguage = 1 | 2;
export type LanguageBridgeMetadata = {
  version: 1;
  size: 32;
  address: number;
  magicA: number;
  magicB: number;
};
export type LanguageBridgeState = {
  phase: 'discovering' | 'startup' | 'ready' | 'pending' | 'unavailable';
  activeLanguage: NativeLanguage | 0;
  requestedLanguage?: NativeLanguage;
};
type Packet = {
  frame: number;
  active: NativeLanguage | 0;
  requested: number;
  flags: number;
  result: number;
  requestSequence: number;
  ackSequence: number;
};
type ClientOptions = {
  getHeap: () => Uint8Array | undefined;
  metadata: LanguageBridgeMetadata;
  onState: (state: LanguageBridgeState) => void;
  onNativeLanguage: (language: NativeLanguage) => void;
};

const MAGIC_A = 0x414c4354;
const MAGIC_B = 0x3130474e;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const isLanguage = (value: number): value is NativeLanguage => value === 1 || value === 2;

export function parseLanguageBridgeMetadata(value: unknown, romSha256: string, romBytes: number): LanguageBridgeMetadata | undefined {
  if (!value || typeof value !== 'object') return;
  const build = value as Record<string, unknown>;
  if (typeof build.sha256 !== 'string' || !/^[a-f\d]{64}$/i.test(build.sha256) || build.sha256.toLowerCase() !== romSha256 || build.bytes !== romBytes) return;
  if (!build.languageBridge || typeof build.languageBridge !== 'object') return;
  const packet = build.languageBridge as Record<string, unknown>;
  if (packet.version !== 1 || packet.size !== 32 || packet.magicA !== MAGIC_A || packet.magicB !== MAGIC_B) return;
  if (typeof packet.address !== 'number' || !Number.isInteger(packet.address) || packet.address % 4 !== 0 || packet.address < 0x02000000 || packet.address > 0x02040000 - 32) return;
  return { version: 1, size: 32, address: packet.address, magicA: MAGIC_A, magicB: MAGIC_B };
}

function heapWords(heap: Uint8Array) {
  if (!(heap.buffer instanceof SharedArrayBuffer) || heap.byteOffset !== 0 || heap.byteLength % 4 !== 0) return;
  return new Uint32Array(heap.buffer, 0, heap.byteLength / 4);
}

function readPacket(heap: Uint8Array, offset: number, metadata: LanguageBridgeMetadata): Packet | undefined {
  const words = heapWords(heap);
  if (!words || offset < 0 || offset % 4 || offset + 32 > heap.byteLength) return;
  const base = offset / 4;
  if (Atomics.load(words, base) !== metadata.magicA || Atomics.load(words, base + 1) !== metadata.magicB || Atomics.load(words, base + 2) !== 0x00200001 || Atomics.load(words, base + 3) !== metadata.address) return;
  // Ack is published last by native code. Bracket the payload with ack/frame
  // reads so an acknowledgement is never paired with an older result byte.
  for (let attempt = 0; attempt < 3; attempt++) {
    const ack = Atomics.load(words, base + 7);
    const frame = Atomics.load(words, base + 4);
    const packed = Atomics.load(words, base + 5);
    const requestSequence = Atomics.load(words, base + 6);
    if (ack !== Atomics.load(words, base + 7) || frame !== Atomics.load(words, base + 4)) continue;
    const active = packed & 0xff;
    if (active > 2 || (packed >>> 16 & 0xff) > 3 || packed >>> 24 > 4) return;
    return { frame, active: active as NativeLanguage | 0, requested: packed >>> 8 & 0xff, flags: packed >>> 16 & 0xff, result: packed >>> 24, requestSequence, ackSequence: ack };
  }
}

async function scanCandidates(heap: Uint8Array, metadata: LanguageBridgeMetadata, cancelled: () => boolean) {
  const words = heapWords(heap);
  if (!words) throw new Error('The language bridge requires the pinned shared heap.');
  const matches: Array<{ offset: number; frame: number }> = [];
  // Yield between 2 MiB chunks; scanning the 256 MiB heap must not block input.
  const chunkWords = 512 * 1024;
  for (let start = 0; start < words.length - 7; start += chunkWords) {
    if (cancelled()) return [];
    const end = Math.min(start + chunkWords, words.length - 7);
    for (let index = start; index < end; index++) {
      if (words[index] !== metadata.magicA) continue;
      const packet = readPacket(heap, index * 4, metadata);
      if (packet) matches.push({ offset: index * 4, frame: packet.frame });
      if (matches.length > 64) throw new Error('Too many language packet candidates.');
    }
    if (end < words.length - 7) await sleep(0);
  }
  return matches;
}

export class NativeLanguageBridge {
  private options: ClientOptions;
  private stopped = false;
  private verifiedHeap?: Uint8Array;
  private offset?: number;
  private interval?: ReturnType<typeof setInterval>;
  private pending?: { sequence: number; language?: NativeLanguage };
  private state: LanguageBridgeState = { phase: 'discovering', activeLanguage: 0 };
  private lastNative?: NativeLanguage;

  constructor(options: ClientOptions) { this.options = options; }

  get currentState() { return { ...this.state }; }

  private publish(state: LanguageBridgeState) {
    if (this.state.phase === state.phase && this.state.activeLanguage === state.activeLanguage && this.state.requestedLanguage === state.requestedLanguage) return;
    this.state = state;
    this.options.onState({ ...state });
  }

  async start() {
    if (this.stopped || this.verifiedHeap || this.interval) return;
    this.options.onState({ ...this.state });
    try {
      while (!this.stopped) {
        const heap = this.options.getHeap();
        if (!heap) throw new Error('The pinned heap getter is unavailable.');
        const candidates = await scanCandidates(heap, this.options.metadata, () => this.stopped);
        await sleep(80);
        if (this.stopped) return;
        if (this.options.getHeap()?.buffer !== heap.buffer) continue;
        const live = candidates.filter(({ offset, frame }) => {
          const packet = readPacket(heap, offset, this.options.metadata);
          return packet && packet.frame !== 0 && packet.frame !== frame;
        });
        if (live.length > 1) throw new Error('Multiple advancing language packets; refusing to choose.');
        if (live.length === 1) {
          this.verifiedHeap = heap;
          this.offset = live[0].offset;
          console.info(`Native language connected to one advancing packet at heap 0x${this.offset.toString(16)}.`);
          this.interval = setInterval(() => this.poll(), 200);
          this.poll();
          return;
        }
        // Startup may not have initialized the packet; paused games cannot
        // finish the liveness probe until resumed. Never infer their address.
        await sleep(500);
      }
    } catch (error) {
      console.warn('Native language connection unavailable:', error);
      this.publish({ phase: 'unavailable', activeLanguage: 0 });
    }
  }

  private poll() {
    if (this.stopped || this.offset === undefined || !this.verifiedHeap) return;
    const heap = this.options.getHeap();
    if (!heap || heap.buffer !== this.verifiedHeap.buffer || heap.byteLength !== this.verifiedHeap.byteLength) { this.reconnect(); return; }
    const packet = readPacket(heap, this.offset, this.options.metadata);
    if (!packet) { this.reconnect(); return; }
    if (!this.pending && packet.requestSequence !== 0 && packet.requestSequence !== packet.ackSequence) {
      // An auto snapshot can contain an earlier outstanding request. Observe
      // its acknowledgement rather than overwriting it with a new preference.
      this.pending = { sequence: packet.requestSequence, language: isLanguage(packet.requested) ? packet.requested : undefined };
    }
    const acknowledged = this.pending && packet.ackSequence === this.pending.sequence;
    if (acknowledged) {
      if (packet.result !== 1 && packet.result !== 2) console.warn('The native game rejected a language request:', packet.result);
      this.pending = undefined;
    }
    if (this.pending) {
      this.publish({ phase: 'pending', activeLanguage: packet.active, requestedLanguage: this.pending.language });
      return;
    }
    if (packet.active !== 0 && (packet.flags & 1)) {
      if (packet.active !== this.lastNative || acknowledged) {
        this.lastNative = packet.active;
        this.options.onNativeLanguage(packet.active);
      }
      this.publish({ phase: 'ready', activeLanguage: packet.active });
    } else {
      this.lastNative = undefined;
      this.publish({ phase: 'startup', activeLanguage: 0 });
    }
  }

  request(language: NativeLanguage): boolean {
    if (!isLanguage(language) || this.stopped || this.offset === undefined || !this.verifiedHeap || this.pending || this.state.phase !== 'ready') return false;
    const heap = this.options.getHeap();
    if (!heap || heap.buffer !== this.verifiedHeap.buffer || heap.byteLength !== this.verifiedHeap.byteLength) { this.reconnect(); return false; }
    const packet = readPacket(heap, this.offset, this.options.metadata);
    if (!packet || !packet.active || !(packet.flags & 1) || (packet.requestSequence !== 0 && packet.requestSequence !== packet.ackSequence)) { this.poll(); return false; }
    const sequence = ((packet.requestSequence + 1) >>> 0) || 1;
    const words = heapWords(heap)!;
    // Only these five protocol-owned bytes are ever writable by this client.
    Atomics.store(heap, this.offset + 21, language);
    Atomics.store(words, (this.offset + 24) / 4, sequence);
    this.pending = { sequence, language };
    this.publish({ phase: 'pending', activeLanguage: packet.active, requestedLanguage: language });
    return true;
  }

  private reconnect() {
    if (this.interval) clearInterval(this.interval);
    this.interval = undefined;
    this.verifiedHeap = undefined;
    this.offset = undefined;
    this.pending = undefined;
    this.lastNative = undefined;
    this.publish({ phase: 'discovering', activeLanguage: 0 });
    void this.start();
  }

  stop() {
    this.stopped = true;
    if (this.interval) clearInterval(this.interval);
    this.verifiedHeap = undefined;
    this.offset = undefined;
    this.pending = undefined;
  }
}
