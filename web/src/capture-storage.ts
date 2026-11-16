import { clearCaptureBootIntent, findLatestCaptureNativeSave, readCaptureBootPolicy,
  verifyCaptureNativeSave, writeCaptureBootIntent } from './capture-persistence.ts';
import type { CaptureBootIntent, CaptureStorage } from './capture-persistence';
import type { EncounterSnapshot } from './encounter-bridge';

type Options = {
  romSha256: string;
  storage: CaptureStorage;
  readSave(): Uint8Array | undefined;
  flush(): Promise<void>;
  discardSnapshot(): void;
  getCurrent(): EncounterSnapshot | undefined;
  timeoutMs?: number;
};
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const sameIdentity = (a: EncounterSnapshot, b: EncounterSnapshot) => a.trainerId === b.trainerId
  && a.attempts === b.attempts && a.unlocks === b.unlocks;

/** Owns one storage transaction, not native gameplay. Resolving persist() is
 * the only success condition the live packet client may turn into a durable ACK. */
export class CaptureStorageController {
  private readonly options: Options;
  private busy = false;
  constructor(options: Options) { this.options = options; }
  get blocksSnapshots() { return this.busy || readCaptureBootPolicy(this.options.storage).forceCartridge; }

  private requireCurrent(expected: EncounterSnapshot, idle = false) {
    const current = this.options.getCurrent();
    if (!current || !sameIdentity(current, expected) || (idle ? current.phase !== 0
      : current.phase !== expected.phase || current.request !== expected.request
        || current.site !== expected.site || current.species !== expected.species
        || current.saveCounter !== expected.saveCounter || current.saveStatus !== 1))
      throw new Error('The landmark save request changed.');
  }

  async persist(snapshot: EncounterSnapshot) {
    if (this.busy || !snapshot.request || ![1, 4].includes(snapshot.phase) || snapshot.saveStatus !== 1)
      throw new Error('The landmark save is not ready.');
    this.busy = true;
    try {
      this.requireCurrent(snapshot);
      const intent: CaptureBootIntent = {
        version: 1, romSha256: this.options.romSha256, stage: snapshot.phase === 1 ? 'begin' : 'result',
        saveCounter: snapshot.saveCounter, trainerId: snapshot.trainerId,
        attempts: snapshot.attempts, unlocks: snapshot.unlocks,
      };
      writeCaptureBootIntent(this.options.storage, intent);
      const deadline = Date.now() + (this.options.timeoutMs ?? 10_000);
      while (true) {
        this.requireCurrent(snapshot);
        const bytes = this.options.readSave();
        if (bytes && verifyCaptureNativeSave(bytes, snapshot)) break;
        if (Date.now() >= deadline) throw new Error('The complete native landmark save has not reached browser storage.');
        await wait(20);
      }
      // Drain any earlier snapshot/SRAM writes before removing the owned CPU
      // snapshot. No new snapshot path may run while this controller is busy.
      await this.options.flush();
      this.requireCurrent(snapshot);
      this.options.discardSnapshot();
      await this.options.flush();
      this.requireCurrent(snapshot);
      const final = this.options.readSave();
      if (!final || !verifyCaptureNativeSave(final, snapshot)) throw new Error('The landmark save changed during its browser commit.');
      if (snapshot.phase === 4) clearCaptureBootIntent(this.options.storage, intent);
    } finally { this.busy = false; }
  }

  /** An interrupted attempt has already been consumed in native SRAM. Once a
   * normal boot exposes that same save, snapshots may resume from its new field
   * session, without reviving the old pending/battle CPU state. */
  async reconcile(snapshot: EncounterSnapshot) {
    if (this.busy || snapshot.phase !== 0) return false;
    const policy = readCaptureBootPolicy(this.options.storage);
    if (!policy.forceCartridge) return true;
    const intent = 'intent' in policy ? policy.intent : undefined;
    if (!intent) return false;
    const sameTrainer = snapshot.trainerId === intent.trainerId;
    if (sameTrainer && ((snapshot.attempts & intent.attempts) !== intent.attempts
      || (snapshot.unlocks & intent.unlocks) !== intent.unlocks)) return false;
    const bytes = this.options.readSave();
    const saved = bytes && findLatestCaptureNativeSave(bytes, snapshot);
    // A different trainer is allowed only when the complete real SRAM file
    // matches that loaded native session (e.g. a new in-cartridge game saved).
    if (!saved || (sameTrainer && ((saved.saveCounter - intent.saveCounter) >>> 0) >= 0x80000000)) return false;
    this.busy = true;
    try {
      this.requireCurrent(snapshot, true);
      await this.options.flush();
      this.requireCurrent(snapshot, true);
      this.options.discardSnapshot();
      await this.options.flush();
      this.requireCurrent(snapshot, true);
      const latest = this.options.readSave();
      const proof = latest && findLatestCaptureNativeSave(latest, snapshot);
      if (!proof || (sameTrainer && ((proof.saveCounter - intent.saveCounter) >>> 0) >= 0x80000000))
        throw new Error('The continued landmark save changed during reconciliation.');
      clearCaptureBootIntent(this.options.storage, intent);
      return true;
    } finally { this.busy = false; }
  }
}
