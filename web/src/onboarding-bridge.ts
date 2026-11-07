import type { NativeLanguage } from './language-bridge';

/** Optional TCINTRO1 mailbox. Startup/tutorial commands never use the field-language writer. */
export type OnboardingMetadata = { version: 1; size: 48; address: number; magicA: number; magicB: number };
export type OnboardingSnapshot = {
  frame: number; context: number; phase: number; flags: number; activeLanguage: NativeLanguage | 0;
  result: number; requestSequence: number; ackSequence: number; requestedContext: number;
  command: number; requestedLanguage: number; mapGroup: number; mapNumber: number; x: number; y: number;
};
export type OnboardingState = {
  status: 'discovering' | 'live' | 'pending' | 'paused' | 'unavailable';
  snapshot?: OnboardingSnapshot;
};
export type OnboardingAcknowledgement = { sequence: number; command: number; context: number; result: number; activeLanguage: NativeLanguage | 0 };
const MAGIC_A = 0x4e494354;
const MAGIC_B = 0x314f5254;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function parseOnboardingMetadata(value: unknown, romSha256: string, romBytes: number): OnboardingMetadata | undefined {
  if (!value || typeof value !== 'object' || !/^[a-f\d]{64}$/.test(romSha256)) return;
  const build = value as Record<string, unknown>;
  if (typeof build.sha256 !== 'string' || build.sha256.toLowerCase() !== romSha256 || build.bytes !== romBytes ||
      !build.onboardingBridge || typeof build.onboardingBridge !== 'object') return;
  const packet = build.onboardingBridge as Record<string, unknown>;
  if (packet.version !== 1 || packet.size !== 48 || packet.magicA !== MAGIC_A || packet.magicB !== MAGIC_B ||
      typeof packet.address !== 'number' || !Number.isInteger(packet.address) || packet.address % 4 ||
      packet.address < 0x02000000 || packet.address > 0x02040000 - 48) return;
  return { version: 1, size: 48, address: packet.address, magicA: MAGIC_A, magicB: MAGIC_B };
}

function wordsFor(heap: Uint8Array) {
  if (typeof SharedArrayBuffer === 'undefined' || !(heap.buffer instanceof SharedArrayBuffer) || heap.byteOffset || heap.byteLength % 4) return;
  return new Uint32Array(heap.buffer);
}

export function readOnboardingSnapshot(heap: Uint8Array, offset: number, metadata: OnboardingMetadata): OnboardingSnapshot | undefined {
  const words = wordsFor(heap);
  if (!words || !Number.isInteger(offset) || offset < 0 || offset % 4 || offset + 48 > heap.byteLength) return;
  const base = offset / 4;
  const frame = Atomics.load(words, base + 4);
  const context = Atomics.load(words, base + 5);
  if (!frame || frame % 2 || !context) return;
  const copy = Array.from({ length: 12 }, (_, index) => Atomics.load(words, base + index));
  if (copy[4] !== frame || copy[5] !== context || Atomics.load(words, base + 4) !== frame ||
      Atomics.load(words, base + 5) !== context || Atomics.load(words, base + 7) !== copy[7]) return;
  if (copy[0] !== metadata.magicA || copy[1] !== metadata.magicB || copy[2] !== 0x00300001 || copy[3] !== metadata.address) return;
  const phase = copy[6] & 255;
  const flags = copy[6] >>> 8 & 255;
  const activeLanguage = copy[6] >>> 16 & 255;
  const result = copy[6] >>> 24;
  if (phase > 10 || flags & ~7 || activeLanguage > 2 || result > 4) return;
  return {
    frame, context, phase, flags, activeLanguage: activeLanguage as NativeLanguage | 0, result,
    requestSequence: copy[7], ackSequence: copy[8], requestedContext: copy[9],
    command: copy[10] & 255, requestedLanguage: copy[10] >>> 8 & 255,
    mapGroup: copy[10] >>> 16 & 255, mapNumber: copy[10] >>> 24,
    x: copy[11] << 16 >> 16, y: copy[11] >> 16,
  };
}

export function onboardingAccepts(snapshot: OnboardingSnapshot) {
  return (snapshot.flags & 3) === 3 && !(snapshot.flags & 4);
}

/** Caller must establish sole live allocation/freshness first. Only ten mailbox bytes are writable. */
export function writeOnboardingCommand(heap: Uint8Array, offset: number, metadata: OnboardingMetadata, request: {
  context: number; phase: number; command: 1 | 2; language: NativeLanguage | 0;
}): number | undefined {
  if (request.command !== 1 && request.command !== 2) return;
  const packet = readOnboardingSnapshot(heap, offset, metadata);
  if (!packet || (packet.flags & 3) !== 3 || (request.command === 2 && !onboardingAccepts(packet)) || packet.context !== request.context || packet.phase !== request.phase ||
      (packet.requestSequence !== 0 && packet.requestSequence !== packet.ackSequence)) return;
  if (request.command === 1 ? packet.phase !== 1 || ![1, 2].includes(request.language) :
      packet.phase < 4 || packet.phase > 8 || request.language !== 0) return;
  const sequence = ((packet.requestSequence + 1) >>> 0) || 1;
  const words = wordsFor(heap)!;
  Atomics.store(words, (offset + 36) / 4, request.context);
  Atomics.store(heap, offset + 40, request.command);
  Atomics.store(heap, offset + 41, request.language);
  Atomics.store(words, (offset + 28) / 4, sequence);
  return sequence;
}

type ClientOptions = {
  metadata: OnboardingMetadata;
  getHeap(): Uint8Array | undefined;
  isActive(): boolean;
  onState(state: OnboardingState): void;
  onAcknowledgement?(ack: OnboardingAcknowledgement): void;
};

async function findCandidates(heap: Uint8Array, metadata: OnboardingMetadata, cancelled: () => boolean) {
  const words = wordsFor(heap);
  if (!words) throw new Error('Onboarding requires the pinned shared heap.');
  const matches: Array<{ offset: number; frame: number }> = [];
  const chunk = 512 * 1024;
  for (let start = 0; start <= words.length - 12; start += chunk) {
    if (cancelled()) return [];
    const end = Math.min(start + chunk, words.length - 11);
    for (let index = start; index < end; index++) {
      if (words[index] !== metadata.magicA) continue;
      const packet = readOnboardingSnapshot(heap, index * 4, metadata);
      if (packet) matches.push({ offset: index * 4, frame: packet.frame });
      if (matches.length > 64) throw new Error('Too many onboarding packet candidates.');
    }
    if (end < words.length - 11) await wait(0);
  }
  return matches;
}

export class NativeOnboardingBridge {
  private options: ClientOptions;
  private stopped = false;
  private discovering = false;
  private heap?: Uint8Array;
  private offset?: number;
  private interval?: ReturnType<typeof setInterval>;
  private pending?: { sequence: number; command: number; context: number };
  private frame?: number;
  private advancing = false;
  private advancedAt = 0;
  private invalidReads = 0;
  private state: OnboardingState = { status: 'discovering' };

  constructor(options: ClientOptions) { this.options = options; }
  get currentState() { return this.state; }
  private publish(state: OnboardingState) { this.state = state; this.options.onState(state); }

  async start() {
    if (this.stopped || this.discovering || this.interval) return;
    this.discovering = true;
    this.publish({ status: 'discovering' });
    try {
      while (!this.stopped) {
        if (!this.options.isActive()) { this.publish({ status: 'paused' }); await wait(150); continue; }
        const heap = this.options.getHeap();
        if (!heap) throw new Error('Matching onboarding heap is unavailable.');
        const candidates = await findCandidates(heap, this.options.metadata, () => this.stopped || !this.options.isActive());
        await wait(80);
        const current = this.options.getHeap();
        if (this.stopped) return;
        if (!this.options.isActive() || current?.buffer !== heap.buffer || current.byteLength !== heap.byteLength) continue;
        const live = candidates.filter(({ offset, frame }) => {
          const packet = readOnboardingSnapshot(heap, offset, this.options.metadata);
          return packet && packet.frame !== frame;
        });
        if (live.length > 1) throw new Error('Multiple advancing onboarding packets; refusing to choose.');
        if (live.length === 1) {
          const packet = readOnboardingSnapshot(heap, live[0].offset, this.options.metadata);
          if (!packet) continue;
          this.heap = heap;
          this.offset = live[0].offset;
          this.frame = packet.frame;
          this.advancing = true;
          this.advancedAt = performance.now();
          this.interval = setInterval(() => this.poll(), 100);
          this.poll();
          return;
        }
        await wait(150);
      }
    } catch (error) {
      console.info('Native onboarding unavailable:', error);
      this.publish({ status: 'unavailable' });
    } finally { this.discovering = false; }
  }

  private poll() {
    if (this.stopped || this.offset === undefined || !this.heap) return;
    const heap = this.options.getHeap();
    if (!heap || heap.buffer !== this.heap.buffer || heap.byteLength !== this.heap.byteLength) { this.reconnect(); return; }
    const packet = readOnboardingSnapshot(heap, this.offset, this.options.metadata);
    if (!packet) { if (++this.invalidReads >= 3) this.reconnect(); return; }
    this.invalidReads = 0;
    if (!this.options.isActive()) {
      this.frame = undefined;
      this.advancing = false;
      this.publish({ status: 'paused' });
      return;
    }
    const now = performance.now();
    if (this.frame === undefined || packet.frame < this.frame) {
      if (this.frame !== undefined) this.pending = undefined;
      this.frame = packet.frame;
      this.advancedAt = now;
      this.advancing = false;
    } else if (packet.frame !== this.frame) {
      this.frame = packet.frame;
      this.advancedAt = now;
      this.advancing = true;
    }
    if (now - this.advancedAt >= 1000) { this.reconnect(); return; }
    if (!this.advancing) { this.publish({ status: 'discovering' }); return; }
    if (!this.pending && packet.requestSequence !== 0 && packet.requestSequence !== packet.ackSequence) {
      this.pending = { sequence: packet.requestSequence, command: packet.command, context: packet.requestedContext };
    }
    if (this.pending && packet.ackSequence === this.pending.sequence) {
      const completed = this.pending;
      this.pending = undefined;
      this.options.onAcknowledgement?.({ ...completed, result: packet.result, activeLanguage: packet.activeLanguage });
    }
    this.publish({ status: this.pending ? 'pending' : 'live', snapshot: packet });
  }

  private request(command: 1 | 2, language: NativeLanguage | 0, context: number, phase: number) {
    if (this.stopped || this.pending || this.offset === undefined || !this.heap || !this.options.isActive() ||
        this.state.status !== 'live' || !this.advancing || performance.now() - this.advancedAt >= 1000) return false;
    const heap = this.options.getHeap();
    if (!heap || heap.buffer !== this.heap.buffer || heap.byteLength !== this.heap.byteLength) { this.reconnect(); return false; }
    const sequence = writeOnboardingCommand(heap, this.offset, this.options.metadata, { command, language, context, phase });
    if (!sequence) { this.poll(); return false; }
    this.pending = { sequence, command, context };
    this.publish({ status: 'pending', snapshot: readOnboardingSnapshot(heap, this.offset, this.options.metadata) });
    return true;
  }
  requestStartupLanguage(language: NativeLanguage, context: number) { return this.request(1, language, context, 1); }
  acknowledgeCard(context: number, phase: number) { return this.request(2, 0, context, phase); }
  refresh() { this.poll(); }

  private reconnect() {
    if (this.interval) clearInterval(this.interval);
    this.interval = undefined;
    this.heap = undefined;
    this.offset = undefined;
    this.pending = undefined;
    this.frame = undefined;
    this.advancing = false;
    this.invalidReads = 0;
    this.publish({ status: 'discovering' });
    void this.start();
  }
  stop() {
    this.stopped = true;
    if (this.interval) clearInterval(this.interval);
    this.interval = undefined;
    this.heap = undefined;
    this.offset = undefined;
    this.pending = undefined;
  }
}
