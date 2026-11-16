import type { OnboardingSnapshot, OnboardingState } from './onboarding-bridge';

/** A bridge outage is not evidence that an existing/completed opening failed. */
export class OpeningFallbackNotice {
  private lastNative?: OnboardingSnapshot;
  private shown = false;

  observe(state: OnboardingState) {
    if ((state.status === 'live' || state.status === 'pending') && state.snapshot) {
      this.lastNative = state.snapshot;
    }
  }

  take() {
    const packet = this.lastNative;
    // Phase0 with a known language is a native-exempt existing save. Before
    // fresh startup, phase0 has no language yet and must keep its fallback.
    const exempt = packet?.phase === 0 && packet.flags === 0 &&
      (packet.activeLanguage === 1 || packet.activeLanguage === 2);
    // Phase9 with NATIVE_TEXT still set is the mandatory farewell, not done.
    const complete = packet?.phase === 9 && packet.flags === 1;
    if (this.shown || exempt || complete) return false;
    this.shown = true;
    return true;
  }

  reset() {
    this.lastNative = undefined;
    this.shown = false;
  }
}
