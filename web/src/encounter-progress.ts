import type { EncounterBridgeState } from './encounter-bridge';
import { CAPTURE_SITE_COUNT, RESERVED_CAPTURE_SITE_ID } from './capture-persistence.ts';

export type EncounterProgress = { attempts: number; unlocks: number; site: number; phase: number };
export type EncounterOutcome = 'unknown' | 'available' | 'pending' | 'caught' | 'spent';

/** Only the verified native encounter mailbox supplies spent attempts. No text,
 * Pokédex flags, list indexes or browser persistence are used as progress. */
export function encounterProgress(state: EncounterBridgeState, previous?: EncounterProgress): EncounterProgress | undefined {
  if (state.status === 'paused') return previous;
  if (state.status !== 'live' || !state.snapshot) return;
  const { attempts, unlocks, site, phase } = state.snapshot;
  if (previous && previous.attempts === attempts && previous.unlocks === unlocks && previous.site === site && previous.phase === phase) return previous;
  return { attempts, unlocks, site, phase };
}

export function encounterOutcome(bit: number | undefined, progress?: EncounterProgress, caughtMask = 0): EncounterOutcome {
  if (bit === undefined || !Number.isInteger(bit) || bit < 0 || bit >= CAPTURE_SITE_COUNT
      || bit === RESERVED_CAPTURE_SITE_ID) return 'unknown';
  const mask = 1 << bit;
  if ((progress?.unlocks ?? caughtMask) & mask) return 'caught';
  if (!progress) return 'unknown';
  if (!(progress.attempts & mask)) return 'available';
  // Native reserves the attempt before battle and persists the result before
  // DONE. Do not call a pending transaction a failed catch.
  return progress.site === bit && progress.phase >= 1 && progress.phase <= 4 ? 'pending' : 'spent';
}

export const ENCOUNTER_LABELS: Record<EncounterOutcome, string> = {
  unknown: 'Encounter status unavailable', available: 'Rare encounter available',
  pending: 'Encounter in progress', caught: 'Caught · TEAM unlocked', spent: 'Try used · not caught',
};
