import { NativeOnboardingBridge, onboardingAccepts } from './onboarding-bridge';
import type { OnboardingMetadata, OnboardingState, OnboardingAcknowledgement } from './onboarding-bridge';
import { createOnboardingView } from './onboarding-view';
import type { TutorialCard, TutorialTopic } from './onboarding-view';
import { getRememberedLocale, getLocale, onLocaleChange, setLocale } from './i18n';
import type { Locale } from './i18n';

const topics: Record<number, TutorialTopic> = { 5: 'bike', 6: 'map', 7: 'team', 8: 'landmarks' };

/** Coordinates readable UI with native-owned opening stages. It never changes party or location. */
export function createOnboarding(options: {
  host: HTMLElement;
  getState(): { running: boolean; paused: boolean; restarting: boolean; immersive: boolean };
  getHeap(): Uint8Array | undefined;
  pause(): void;
  resume(): void;
  leaveGame(): void;
  releaseInputs(): void;
  refreshInput(): void;
  message(text: string, error?: boolean): void;
}) {
  let supported = false;
  let bridge: NativeOnboardingBridge | undefined;
  let state: OnboardingState = { status: 'unavailable' };
  // The visitor's own choice on the website wins; otherwise the browser's language.
  // The game shows it on its first settings screen, where the player can change it.
  let startupLocale: Locale = getRememberedLocale() ?? getLocale();
  let ownsPause = false;
  let queuedCard: TutorialCard | undefined;
  let submittedCard: TutorialCard | undefined;
  let acknowledgedContext = 0;
  let startupRequestContext = 0;
  let unavailableShown = false;
  let startupFailed = false;
  let startupWaiting = false;
  let nativeGuideActive = false;

  const view = createOnboardingView({
    host: options.host, releaseInputs: options.releaseInputs,
    onCardContinue(card) {
      queuedCard = card;
      view.setPending(true);
      const resume = ownsPause;
      ownsPause = false;
      options.releaseInputs();
      if (resume) options.resume();
      options.refreshInput();
      bridge?.refresh();
    },
    onContinueLater() {
      view.closeCard();
      queuedCard = undefined;
      ownsPause = false;
      options.leaveGame();
      options.refreshInput();
    },
  });
  const stopLocaleListener = onLocaleChange(({ locale, source }) => { if (source === 'user') startupLocale = locale; });

  function canAdvanceGuide() {
    const host = options.getState();
    return view.cardOpen && !view.cardPending && ownsPause && host.running && host.immersive &&
      !host.restarting && !document.hidden && !options.host.querySelector('dialog[open]:not(#outdoor-coach)');
  }

  function onAcknowledgement(ack: OnboardingAcknowledgement) {
    if (ack.command === 1 && ack.result === 1 && ack.activeLanguage) {
      startupWaiting = false;
      setLocale(ack.activeLanguage === 2 ? 'zh-Hant' : 'en', 'native');
    }
    if (ack.command === 1 && (ack.result === 2 || ack.result === 4)) {
      startupFailed = true;
      options.message('The opening connection is unavailable. Use Interact to continue, then pick your language on the game’s first settings screen.', true);
    }
    if (ack.command === 2) {
      if (ack.result === 1) acknowledgedContext = ack.context;
      if (submittedCard?.context === ack.context) { submittedCard = undefined; view.closeCard(); }
    }
  }

  function onState(next: OnboardingState) {
    state = next;
    const packet = next.snapshot;
    if (packet) {
      startupWaiting = packet.phase === 1;
      nativeGuideActive = packet.phase >= 4 && packet.phase <= 9 && !(packet.phase === 9 && packet.flags === 1);
    }
    if (next.status === 'unavailable') startupWaiting = nativeGuideActive = false;
    options.refreshInput();
    if (next.status === 'unavailable') {
      startupWaiting = false;
      queuedCard = submittedCard = undefined;
      view.closeCard();
      const resume = ownsPause;
      ownsPause = false;
      if (resume && options.getState().immersive) options.resume();
      if (!unavailableShown) {
        unavailableShown = true;
        options.message('The opening connection is unavailable. Use Interact to continue, then pick your language on the game’s first settings screen.', true);
      }
      return;
    }
    if (next.status !== 'live' || !packet || !options.getState().immersive) return;
    if (packet.phase === 10) {
      options.message('Pick your language on the game’s first settings screen.');
      return;
    }
    if (packet.phase === 1 && (packet.flags & 3) === 3) {
      if (startupFailed) return;
      if (startupRequestContext !== packet.context) {
        startupRequestContext = packet.context;
        if (!bridge?.requestStartupLanguage(startupLocale === 'zh-Hant' ? 2 : 1, packet.context)) startupRequestContext = 0;
      }
      return;
    }
    if (submittedCard && (submittedCard.context !== packet.context || submittedCard.phase !== packet.phase)) {
      submittedCard = undefined;
      view.closeCard();
    }
    if (queuedCard) {
      if (queuedCard.context !== packet.context || queuedCard.phase !== packet.phase) { queuedCard = undefined; view.closeCard(); }
      else if (onboardingAccepts(packet)) {
        const card = queuedCard;
        queuedCard = undefined;
        submittedCard = card;
        if (!bridge?.acknowledgeCard(card.context, card.phase)) { submittedCard = undefined; queuedCard = card; }
        return;
      }
    }
    const topic = topics[packet.phase];
    if (!topic || !onboardingAccepts(packet) || acknowledgedContext === packet.context || submittedCard) return;
    if (!view.cardOpen || view.activeCard?.context !== packet.context) {
      const host = options.getState();
      if (!host.running || host.paused || host.restarting) return;
      ownsPause = true;
      // Native is explicitly waiting. Keep its city visible behind the small
      // dialogue frame; input remains blocked until the exact-context ACK.
      view.showCard({ topic, phase: packet.phase, context: packet.context });
      options.pause();
      options.refreshInput();
    }
  }

  const inputBlocked = () => view.cardOpen || state.status === 'pending' || !!queuedCard || !!submittedCard || (!startupFailed && startupWaiting);

  return {
    /** Before boot: settle the language the game's first screen will show. Never asks. */
    prepareLanguage(hasCapability: boolean) {
      supported = hasCapability;
      startupLocale = getRememberedLocale() ?? getLocale();
    },
    attach(metadata: OnboardingMetadata | undefined) {
      bridge?.stop();
      queuedCard = submittedCard = undefined;
      acknowledgedContext = startupRequestContext = 0;
      unavailableShown = false;
      startupFailed = false;
      startupWaiting = nativeGuideActive = false;
      supported = !!metadata;
      if (!metadata) { state = { status: 'unavailable' }; return; }
      bridge = new NativeOnboardingBridge({
        metadata, getHeap: options.getHeap,
        isActive: () => {
          const host = options.getState();
          return host.running && !host.paused && !host.restarting && !document.hidden;
        },
        onState, onAcknowledgement,
      });
      void bridge.start();
    },
    beforeLeave() {
      view.closeCard();
      queuedCard = undefined;
      ownsPause = false;
      options.releaseInputs();
    },
    refresh() { bridge?.refresh(); },
    stop() { bridge?.stop(); view.closeCard(); queuedCard = submittedCard = undefined; ownsPause = startupWaiting = nativeGuideActive = false; },
    destroy() { bridge?.stop(); stopLocaleListener(); view.destroy(); },
    get supported() { return supported; },
    get startupLanguagePending() { return supported && startupWaiting; },
    get blocksInput() { return inputBlocked(); },
    get blocksCityMap() { return inputBlocked() || (nativeGuideActive && options.getState().immersive); },
    get currentState() { return state; },
    get canAdvanceGuide() { return canAdvanceGuide(); },
    advanceGuide() { if (canAdvanceGuide()) view.continueCard(); },
  };
}
