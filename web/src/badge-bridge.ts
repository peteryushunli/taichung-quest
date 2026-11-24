import type { NativeEwramAnchor } from './navigation-bridge';

/** TCBDG001: read-only native collection/award state, addressed through the
 * existing verified EWRAM allocation. No scan, requests, writes or input hooks. */
export type BadgeMetadata = { version: 1; size: 32; address: number; magicA: number; magicB: number };
export type BadgeSnapshot = { publication: number; frame: number; completedMask: number;
  scene: number; selectedGym: number; flags: number; language: number };
export type BadgeState = { snapshot?: BadgeSnapshot };
const MAGIC_A = 0x44424354;
const MAGIC_B = 0x31303047;

export function parseBadgeMetadata(value: unknown, romSha256: string, romBytes: number): BadgeMetadata | undefined {
  if (!value || typeof value !== 'object' || !/^[a-f\d]{64}$/.test(romSha256)) return;
  const build = value as Record<string, unknown>;
  const packet = build.badgeBridge as Record<string, unknown> | undefined;
  if (typeof build.sha256 !== 'string' || build.sha256.toLowerCase() !== romSha256 || build.bytes !== romBytes
    || !packet || packet.version !== 1 || packet.size !== 32 || packet.magicA !== MAGIC_A || packet.magicB !== MAGIC_B
    || typeof packet.address !== 'number' || !Number.isInteger(packet.address) || packet.address % 4
    || packet.address < 0x02000000 || packet.address > 0x02040000 - 32) return;
  return { version: 1, size: 32, address: packet.address, magicA: MAGIC_A, magicB: MAGIC_B };
}

export function readBadgeSnapshot(anchor: NativeEwramAnchor, metadata: BadgeMetadata): BadgeSnapshot | undefined {
  const { heap } = anchor;
  const offset = anchor.offset + metadata.address - anchor.address;
  if (typeof SharedArrayBuffer === 'undefined' || !(heap.buffer instanceof SharedArrayBuffer) || heap.byteOffset || heap.byteLength % 4
    || !Number.isInteger(offset) || offset % 4 || offset < 0 || offset + 32 > heap.byteLength) return;
  const words = new Uint32Array(heap.buffer);
  const base = offset / 4;
  const publication = Atomics.load(words, base + 4);
  if (!publication || publication % 2) return;
  const copy = Array.from({ length: 8 }, (_, index) => Atomics.load(words, base + index));
  if (publication !== copy[4] || publication !== Atomics.load(words, base + 4)
    || copy[0] !== MAGIC_A || copy[1] !== MAGIC_B || copy[2] !== 0x00200001 || copy[3] !== metadata.address || !copy[5]) return;
  const completedMask = copy[6] & 0xffff;
  const scene = copy[6] >>> 16 & 255;
  const selectedGym = copy[6] >>> 24;
  const flags = copy[7] & 255;
  const language = copy[7] >>> 8 & 255;
  if (completedMask > 0x3ff || scene > 2 || flags & ~1 || copy[7] >>> 16 || language > 2
    || (scene === 0 ? completedMask !== 0 || selectedGym !== 255 || flags !== 0 || language !== 0
      : selectedGym > 9 || language < 1 || (scene === 2 && !(completedMask & (1 << selectedGym))))) return;
  return { publication, frame: copy[5], completedMask, scene, selectedGym, flags, language };
}

type Options = { metadata: BadgeMetadata; getAnchor(): NativeEwramAnchor | undefined;
  isActive(): boolean; onState(state: BadgeState): void };
export class NativeBadgeBridge {
  private interval?: ReturnType<typeof setInterval>;
  private previous?: BadgeSnapshot;
  private anchor?: NativeEwramAnchor;
  private advancedAt = 0;
  private advancing = false;
  private options: Options;
  constructor(options: Options) { this.options = options; }
  start() { if (!this.interval) { this.interval = setInterval(() => this.refresh(), 33); this.refresh(); } }
  refresh() {
    const anchor = this.options.isActive() ? this.options.getAnchor() : undefined;
    const packet = anchor && readBadgeSnapshot(anchor, this.options.metadata);
    const now = performance.now();
    if (!anchor || !packet) { this.reset(); return; }
    const sameAllocation = anchor.heap.buffer === this.anchor?.heap.buffer && anchor.offset === this.anchor.offset
      && anchor.address === this.anchor.address;
    const previous = sameAllocation ? this.previous : undefined;
    if (!previous || packet.frame < previous.frame || packet.publication < previous.publication
      || (packet.frame !== previous.frame && packet.publication === previous.publication)) {
      this.advancing = false; this.advancedAt = now;
    } else if (packet.frame > previous.frame) { this.advancing = true; this.advancedAt = now; }
    this.previous = packet; this.anchor = anchor;
    this.options.onState(this.advancing && now - this.advancedAt < 250 && packet.flags === 1 && packet.scene !== 0 ? { snapshot: packet } : {});
  }
  private reset() { this.previous = undefined; this.anchor = undefined; this.advancing = false; this.options.onState({}); }
  stop() { if (this.interval) clearInterval(this.interval); this.interval = undefined; this.reset(); }
}
