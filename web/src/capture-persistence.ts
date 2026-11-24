/** Durable landmark encounters use native SRAM, never a resumable battle snapshot.
 * FireRed's published save layout is fixed; this reader never writes game bytes. */
import { isFullFireRedSaveSize, readFireRedSaveSlot } from './firered-save.ts';

export const CAPTURE_BOOT_INTENT_KEY = 'taichung-quest-capture-boot-v1';
export const CAPTURE_SITE_COUNT = 27;
export const CAPTURE_MASK = (1 << CAPTURE_SITE_COUNT) - 1;
export const LEGACY_CAPTURE_MASK = 0x3fff;
const SAVE_LOW_BITS = 10;
const SAVE_LOW_MASK = (1 << SAVE_LOW_BITS) - 1;
const LEGACY_SCHEMA = 0xec01;
const SCHEMA = 0xec02;
// EC02 predates the starter rotation. Its reserved bits must not become new
// starter history merely because the live bridge supports more stable slots.
const EC02_CAPTURE_MASK = 0xffffff;

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
    && Number.isInteger(value.attempts) && value.attempts >= 0 && value.attempts <= CAPTURE_MASK
    && Number.isInteger(value.unlocks) && value.unlocks >= 0 && value.unlocks <= CAPTURE_MASK
    && !(value.unlocks & ~value.attempts);
}

/** Require the complete exact native transaction, not just a dirty-save callback.
 * This also waits for mGBA to copy its flash contents into the actual FS save file. */
export function verifyCaptureNativeSave(bytes: Uint8Array, expected: CaptureSaveProof): VerifiedCaptureSave | undefined {
  if (!validProof(expected) || !isFullFireRedSaveSize(bytes.byteLength)) return;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const matches: VerifiedCaptureSave[] = [];
  for (const slot of [0, 1] as const) {
    const saved = readFireRedSaveSlot(view, slot);
    if (!saved || saved.counter !== expected.saveCounter) continue;
    const [save2, , save1SecondSector] = saved.sections;
    // SaveBlock1's vars start at 0x1000, across sectors 1/2.
    const variable = (id: number) => view.getUint16(save1SecondSector + 0x1000 + (id - 0x4000) * 2 - 0xf80, true);
    const schema = variable(0x40f3);
    if (schema !== SCHEMA && schema !== LEGACY_SCHEMA) continue;
    const mask = (low: number, upper: number) => schema === LEGACY_SCHEMA ? variable(low) & LEGACY_CAPTURE_MASK
      : (variable(low) & SAVE_LOW_MASK) | ((variable(upper) << SAVE_LOW_BITS) & EC02_CAPTURE_MASK);
    const attempts = mask(0x40f4, 0x40f0);
    const unlocks = mask(0x40f5, 0x40f2);
    if (attempts !== expected.attempts || unlocks !== expected.unlocks
      || (unlocks & ~attempts) || view.getUint32(save2 + 0xa, true) !== expected.trainerId) continue;
    matches.push({ ...expected, slot });
  }
  // Two valid copies of the same requested transaction are ambiguous, not a
  // reason to guess which file/slot the active native session is using.
  return matches.length === 1 ? matches[0] : undefined;
}

/** Reconcile a previous interrupted encounter after ordinary native Continue.
 * A newer normal in-game save may have advanced the counter since the intent. */
export function findLatestCaptureNativeSave(bytes: Uint8Array, expected: Omit<CaptureSaveProof, 'saveCounter'>): VerifiedCaptureSave | undefined {
  if (!isFullFireRedSaveSize(bytes.byteLength)) return;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const counters = new Set<number>();
  for (const slot of [0, 1] as const) {
    const saved = readFireRedSaveSlot(view, slot);
    if (saved) counters.add(saved.counter);
  }
  let newest: VerifiedCaptureSave | undefined;
  for (const saveCounter of counters) {
    const proof = verifyCaptureNativeSave(bytes, { ...expected, saveCounter });
    if (proof && (!newest || ((saveCounter - newest.saveCounter) >>> 0) < 0x80000000)) newest = proof;
  }
  return newest;
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
