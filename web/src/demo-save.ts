import { isFullFireRedSaveSize } from './firered-save.ts';

const CARTRIDGE_BYTES = 0x20000;
// Boulevard builds before 2026-11-23 wrote one of these Old Station checkpoints
// into every browser without a save. Nobody played them; they only made the
// title menu offer CONTINUE to people who had never started.
const DEMO_SAVES: ReadonlySet<string> = new Set([
  'f0e474e71e4ee2b30395df9e633d9b90969f75e95a3fcd2e3f298dd95c38855c',
  '45aa9aa22e7c6283d087a2356ec40e106bc6e4655c04196ea481b06b4c0e7d49',
]);

/** True only for a byte-for-byte untouched checkpoint. Any in-game save changes
 * the cartridge bytes; the emulator's 16-byte trailer is not part of them. */
export async function isUntouchedDemoSave(bytes: Uint8Array, demos = DEMO_SAVES) {
  if (!isFullFireRedSaveSize(bytes.byteLength)) return false;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.slice(0, CARTRIDGE_BYTES)));
  return demos.has([...digest].map((byte) => byte.toString(16).padStart(2, '0')).join(''));
}
