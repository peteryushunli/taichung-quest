/** Durable landmark encounters use native SRAM, never a resumable battle snapshot.
 * FireRed's published save layout is fixed; this reader never writes game bytes. */
export const CAPTURE_BOOT_INTENT_KEY = 'taichung-quest-capture-boot-v1';
const SAVE_BYTES = 0x20000;
const SECTOR_BYTES = 0x1000;
const SLOT_SECTORS = 14;
const SIGNATURE = 0x08012025;
const MASK = 0x3fff;
const SCHEMA = 0xec01;
// src/save.c sSaveSlotLayout, using sizeof(SaveBlock2)=0xf24,
// sizeof(SaveBlock1)=0x3d68 and sizeof(PokemonStorage)=0x83d0.
const PAYLOAD_BYTES = [0xf24, 0xf80, 0xf80, 0xf80, 0xee8,
  0xf80, 0xf80, 0xf80, 0xf80, 0xf80, 0xf80, 0xf80, 0xf80, 0x7d0];

export type CaptureSaveProof = {
  saveCounter: number;
  trainerId: number;
  attempts: number;
  unlocks: number;
};
export type VerifiedCaptureSave = CaptureSaveProof & { slot: number };
export type CaptureBootIntent = CaptureSaveProof & {
  version: 1;
  romSha256: string;
  stage: 'begin' | 'result';
};
export type CaptureStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const isU32 = (value: unknown): value is number => typeof value === 'number'
  && Number.isInteger(value) && value >= 0 && value <= 0xffffffff;

function validProof(value: CaptureSaveProof) {
  return isU32(value.saveCounter) && isU32(value.trainerId)
    && Number.isInteger(value.attempts) && value.attempts >= 0 && value.attempts <= MASK
    && Number.isInteger(value.unlocks) && value.unlocks >= 0 && value.unlocks <= MASK
    && !(value.unlocks & ~value.attempts);
}

function checksum(view: DataView, start: number, length: number) {
  let total = 0;
  for (let offset = start; offset < start + length; offset += 4)
    total = (total + view.getUint32(offset, true)) >>> 0;
  return ((total >>> 16) + total) & 0xffff;
}

/** Require the complete exact native transaction, not just a dirty-save callback.
 * This also waits for mGBA to copy its flash contents into the actual FS save file. */
export function verifyCaptureNativeSave(bytes: Uint8Array, expected: CaptureSaveProof): VerifiedCaptureSave | undefined {
  if (!validProof(expected) || (bytes.byteLength !== SAVE_BYTES && bytes.byteLength !== SAVE_BYTES + 16)) return;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const matches: VerifiedCaptureSave[] = [];
  for (let slot = 0; slot < 2; slot++) {
    const sections = new Map<number, number>();
    for (let index = 0; index < SLOT_SECTORS; index++) {
      const start = (slot * SLOT_SECTORS + index) * SECTOR_BYTES;
      if (view.getUint32(start + 0xff8, true) !== SIGNATURE
        || view.getUint32(start + 0xffc, true) !== expected.saveCounter) continue;
      const id = view.getUint16(start + 0xff4, true);
      if (id >= SLOT_SECTORS || sections.has(id)
        || checksum(view, start, PAYLOAD_BYTES[id]) !== view.getUint16(start + 0xff6, true)) {
        sections.clear();
        break;
      }
      sections.set(id, start);
    }
    if (sections.size !== SLOT_SECTORS) continue;
    const save2 = sections.get(0)!;
    // SaveBlock1's vars start at0x1000, across sectors1/2. The three dedicated
    // fields are0x40f3/4/5; no party, inventory or Pokédex data is interpreted.
    const variable = (id: number) => view.getUint16(sections.get(2)! + 0x1000 + (id - 0x4000) * 2 - 0xf80, true);
    const attempts = variable(0x40f4) & MASK;
    const unlocks = variable(0x40f5) & MASK;
    if (variable(0x40f3) !== SCHEMA || attempts !== expected.attempts || unlocks !== expected.unlocks
      || (unlocks & ~attempts) || view.getUint32(save2 + 0xa, true) !== expected.trainerId) continue;
    matches.push({ ...expected, slot });
  }
  // Two valid copies of the same requested transaction are ambiguous, not a
  // reason to guess which file/slot the active native session is using.
  return matches.length === 1 ? matches[0] : undefined;
}

function parseIntent(raw: string): CaptureBootIntent | undefined {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return; }
  if (!value || typeof value !== 'object') return;
  const intent = value as CaptureBootIntent;
  if (intent.version !== 1 || !/^[a-f0-9]{64}$/.test(intent.romSha256)
    || (intent.stage !== 'begin' && intent.stage !== 'result') || !validProof(intent)) return;
  return intent;
}

/** Malformed/unreadable intent is conservative: boot the cartridge's native
 * save. It must never silently permit restoration of an older CPU snapshot. */
export function readCaptureBootPolicy(storage: Pick<Storage, 'getItem'>) {
  try {
    const raw = storage.getItem(CAPTURE_BOOT_INTENT_KEY);
    if (raw === null) return { forceCartridge: false as const };
    const intent = parseIntent(raw);
    return { forceCartridge: true as const, intent, reason: intent ? 'encounter' : 'invalid-intent' };
  } catch {
    return { forceCartridge: true as const, reason: 'storage-unavailable' };
  }
}

/** Write/read-back must succeed before a durable ACK. This marker precedes
 * snapshot deletion/IDB flush so a reload during either step uses native SRAM. */
export function writeCaptureBootIntent(storage: CaptureStorage, intent: CaptureBootIntent) {
  const serialized = JSON.stringify(intent);
  if (!parseIntent(serialized)) throw new Error('Invalid landmark save intent.');
  storage.setItem(CAPTURE_BOOT_INTENT_KEY, serialized);
  if (storage.getItem(CAPTURE_BOOT_INTENT_KEY) !== serialized)
    throw new Error('Landmark save intent was not stored.');
}

/** Called only after matching SRAM durability and snapshot invalidation. The
 * expected value prevents an older asynchronous request clearing a newer one. */
export function clearCaptureBootIntent(storage: CaptureStorage, expected: CaptureBootIntent) {
  const raw = storage.getItem(CAPTURE_BOOT_INTENT_KEY);
  if (raw === null) return;
  const current = parseIntent(raw);
  if (!current || JSON.stringify(current) !== JSON.stringify(expected))
    throw new Error('Landmark save intent changed during the transaction.');
  storage.removeItem(CAPTURE_BOOT_INTENT_KEY);
  if (storage.getItem(CAPTURE_BOOT_INTENT_KEY) !== null)
    throw new Error('Landmark save intent could not be cleared.');
}

export function captureBlocksSnapshots(phase: number | undefined) {
  // SAVE_BEGIN, ARMED, BATTLE, SAVE_RESULT and storage ERROR. DONE is safe only
  // once the client's durable transaction/intent reconciliation has finished.
  return phase !== undefined && [1, 2, 3, 4, 6].includes(phase);
}
