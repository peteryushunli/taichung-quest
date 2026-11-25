import type { EncounterSnapshot } from './encounter-bridge';

type Runtime = {
  getFastForwardMultiplier(): number;
  setFastForwardMultiplier(value: number): void;
};

/** Accelerates only the input-locked native flash/commit window. SRAM writes,
 * browser durability and the native ACK fence still run in full. */
export class EncounterSaveSpeed {
  private held?: { request: number; previous: number };
  private readonly runtime: Runtime;
  constructor(runtime: Runtime) { this.runtime = runtime; }

  update(snapshot?: EncounterSnapshot) {
    const pending = snapshot && snapshot.request && [1, 4].includes(snapshot.phase)
      && snapshot.acknowledgement !== snapshot.request;
    if (!pending) { this.release(); return; }
    if (this.held?.request !== snapshot.request) this.release();
    if (this.held || snapshot.saveStatus !== 0) return;
    try {
      const previous = this.runtime.getFastForwardMultiplier();
      if (!Number.isFinite(previous) || previous <= 0 || previous >= 8) return;
      this.runtime.setFastForwardMultiplier(8);
      this.held = { request: snapshot.request, previous };
    } catch { /* An unavailable speed control leaves the ordinary save path. */ }
  }

  release() {
    const held = this.held;
    this.held = undefined;
    if (!held) return;
    try {
      // Preserve a speed change made by another explicit runtime owner.
      if (this.runtime.getFastForwardMultiplier() === 8)
        this.runtime.setFastForwardMultiplier(held.previous);
    } catch { /* Reset/crash cleanup must not block the persistence fence. */ }
  }
}
