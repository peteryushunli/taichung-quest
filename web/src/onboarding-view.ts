import './onboarding.css';
import { getLocale, onLocaleChange, t } from './i18n';

export type TutorialTopic = 'bike' | 'map' | 'team' | 'landmarks';
export type TutorialCard = { topic: TutorialTopic; context: number; phase: number };

const topics: Record<TutorialTopic, { title: string; body: string }> = {
  bike: { title: 'Bike', body: 'After the tour: B / Bike to ride outdoors. Press again to get off.' },
  map: { title: 'City Map', body: 'Tap Minimap or City Map to find all landmarks.' },
  team: { title: 'Team', body: 'Menu → Team: add or swap. All 150 choices are free and join at Lv50.' },
  landmarks: { title: 'Nearby landmarks', body: 'South to the road, then west. Find nearby gyms on City Map.' },
};

/** Readable presentation only. Native state owns language, stages and party: the game's
 * first screen holds the language choice, so the web shows no picker of its own. */
export function createOnboardingView(options: {
  host: HTMLElement;
  releaseInputs(): void;
  onCardContinue(card: TutorialCard): void;
  onContinueLater(): void;
}) {
  const coach = document.createElement('dialog');
  coach.id = 'outdoor-coach';
  coach.className = 'outdoor-coach';
  coach.setAttribute('aria-modal', 'false');
  coach.setAttribute('aria-labelledby', 'outdoor-coach-title');
  coach.setAttribute('aria-describedby', 'outdoor-coach-copy');
  // Keep dialogue inside the real game viewport, including native fullscreen.
  (options.host.querySelector('#screen') ?? options.host).append(coach);
  let card: TutorialCard | undefined;
  let pending = false;
  let cardReturn: HTMLElement | undefined;

  // Escape may leave fullscreen, but never marks mandatory teaching as read.
  coach.addEventListener('cancel', (event) => event.preventDefault());
  function continueCard() {
    if (!coach.open || pending || !card) return;
    options.releaseInputs();
    options.onCardContinue({ ...card });
  }
  coach.addEventListener('keydown', (event) => {
    if (!['KeyF', 'KeyZ'].includes(event.code) || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    if (!event.repeat) continueCard();
  });
  coach.addEventListener('click', (event) => {
    const target = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!target || pending || !card) return;
    if (target.hasAttribute('data-next-tip')) continueCard();
  });

  function renderCard() {
    if (!card) return;
    const content = topics[card.topic];
    coach.lang = getLocale();
    const restoreFocus = coach.contains(document.activeElement) && !pending;
    // ScriptWaitCard keeps the final native message page on the canvas. Preserve
    // its actual pixels rather than painting a second web dialogue over it.
    coach.innerHTML = `<h2 id="outdoor-coach-title" class="coach-sr-only">${t(content.title)}</h2>
      <button type="button" data-next-tip aria-describedby="outdoor-coach-copy" aria-label="${pending ? t('Returning to your guide…') : t('A / Interact')}" ${pending ? 'disabled' : ''}>
        <span id="outdoor-coach-copy" class="coach-copy coach-sr-only">${t(content.body)}</span>
        <span class="native-advance-arrow" aria-hidden="true" ${pending ? 'hidden' : ''}></span>
      </button>`;
    coach.setAttribute('aria-busy', String(pending));
    if (restoreFocus) coach.querySelector<HTMLButtonElement>('[data-next-tip]')!.focus({ preventScroll: true });
  }
  const stopLocaleListener = onLocaleChange(() => { if (coach.open) renderCard(); });

  return {
    showCard(next: TutorialCard) {
      if (coach.open && card?.context === next.context && card.topic === next.topic) return;
      options.releaseInputs();
      card = { ...next };
      pending = false;
      renderCard();
      if (!coach.open) {
        cardReturn = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
        coach.show();
      }
      coach.querySelector<HTMLButtonElement>('[data-next-tip]')!.focus({ preventScroll: true });
    },
    setPending(value: boolean) { pending = value; renderCard(); },
    closeCard() {
      const restoreFocus = coach.contains(document.activeElement);
      if (coach.open) coach.close();
      card = undefined; pending = false;
      if (restoreFocus && cardReturn?.isConnected) cardReturn.focus({ preventScroll: true });
      cardReturn = undefined;
    },
    continueCard,
    get cardOpen() { return coach.open; },
    get cardPending() { return pending; },
    get activeCard() { return card ? { ...card } : undefined; },
    destroy() { stopLocaleListener(); coach.remove(); },
  };
}
