import './onboarding.css';
import { getLocale, onLocaleChange, setLocale, t } from './i18n';
import type { Locale } from './i18n';

export type TutorialTopic = 'bike' | 'map' | 'team' | 'landmarks';
export type TutorialCard = { topic: TutorialTopic; context: number; phase: number };

const topics: Record<TutorialTopic, { title: string; body: string }> = {
  bike: { title: 'Bike', body: 'After the tour: B / Bike to ride outdoors. Press again to get off.' },
  map: { title: 'City Map', body: 'Tap Minimap or City Map to find all landmarks.' },
  team: { title: 'Team', body: 'Menu → Team: add or swap. All 150 choices are free and join at Lv50.' },
  landmarks: { title: 'Nearby landmarks', body: 'South to the road, then west. Find nearby gyms on City Map.' },
};
const topicOrder: TutorialTopic[] = ['bike', 'map', 'team', 'landmarks'];

/** Readable presentation only. Native state owns language application, stages and party. */
export function createOnboardingView(options: {
  host: HTMLElement;
  releaseInputs(): void;
  onCardContinue(card: TutorialCard): void;
  onContinueLater(): void;
}) {
  const language = document.createElement('dialog');
  language.id = 'startup-language';
  language.className = 'onboarding-dialog language-choice';
  language.setAttribute('aria-labelledby', 'startup-language-title startup-language-title-zh');
  language.setAttribute('aria-describedby', 'startup-language-help');
  language.innerHTML = `<p class="onboarding-eyebrow">POKÉMON × TAICHUNG</p>
    <h2 id="startup-language-title" tabindex="-1" lang="en">Choose your language.</h2>
    <p class="language-choice-subtitle" id="startup-language-title-zh" lang="zh-Hant">選擇你的語言，開始台中冒險。</p>
    <p id="startup-language-help" class="onboarding-copy"><span lang="en">You can change this later in Game options.</span><span lang="zh-Hant">之後也能在遊戲選項中切換。</span></p>
    <form method="dialog"><fieldset><legend class="visually-hidden">Language · 語言</legend>
      <label class="language-choice-card"><input type="radio" name="startup-locale" value="en"><span><strong lang="en">English</strong><small lang="en">Explore Taichung in English</small></span></label>
      <label class="language-choice-card"><input type="radio" name="startup-locale" value="zh-Hant"><span><strong lang="zh-Hant">繁體中文</strong><small lang="zh-Hant">以繁體中文探索台中</small></span></label>
    </fieldset><div class="onboarding-actions"><button type="button" data-cancel-language><span lang="en">Back</span> / <span lang="zh-Hant">返回</span></button><button type="submit" value="confirm" class="onboarding-primary"><span lang="en">Let’s begin</span> / <span lang="zh-Hant">開始冒險</span></button></div></form>`;
  const coach = document.createElement('dialog');
  coach.id = 'outdoor-coach';
  coach.className = 'outdoor-coach';
  coach.setAttribute('aria-modal', 'false');
  coach.setAttribute('aria-labelledby', 'outdoor-coach-title');
  coach.setAttribute('aria-describedby', 'outdoor-coach-copy');
  options.host.append(language);
  // Keep dialogue inside the real game viewport, including native fullscreen.
  (options.host.querySelector('#screen') ?? options.host).append(coach);
  let languageResolve: ((value: Locale | undefined) => void) | undefined;
  let languageReturn: HTMLElement | undefined;
  let card: TutorialCard | undefined;
  let pending = false;
  let cardReturn: HTMLElement | undefined;

  language.querySelector('[data-cancel-language]')!.addEventListener('click', () => language.close('cancel'));
  language.addEventListener('close', () => {
    const chosen = language.querySelector<HTMLInputElement>('input:checked')?.value;
    const value = language.returnValue === 'confirm' && (chosen === 'en' || chosen === 'zh-Hant') ? chosen : undefined;
    options.releaseInputs();
    if (value) setLocale(value, 'user');
    const resolve = languageResolve;
    languageResolve = undefined;
    if (!value) languageReturn?.focus({ preventScroll: true });
    resolve?.(value);
  });
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
    if (target.hasAttribute('data-continue-later')) { options.releaseInputs(); options.onContinueLater(); }
  });

  function renderCard() {
    if (!card) return;
    const content = topics[card.topic];
    coach.lang = getLocale();
    const step = topicOrder.indexOf(card.topic) + 1;
    const restoreFocus = coach.contains(document.activeElement) && !pending;
    coach.innerHTML = `<h2 id="outdoor-coach-title" class="coach-sr-only">${t(content.title)}</h2>
      <button type="button" data-next-tip aria-describedby="outdoor-coach-copy" ${pending ? 'disabled' : ''}>
        <span id="outdoor-coach-copy" class="coach-copy">${t(content.body)}</span>
        <span class="coach-footer"><span>${step} / 4</span><span class="coach-cue">${pending ? t('Returning to your guide…') : t('A / Interact')} <span aria-hidden="true">▾</span></span></span>
      </button>
      <button type="button" data-continue-later aria-label="${t('Continue later')}" title="${t('Continue later')}" ${pending ? 'disabled' : ''}><span aria-hidden="true">Ⅱ</span></button>`;
    coach.setAttribute('aria-busy', String(pending));
    if (restoreFocus) coach.querySelector<HTMLButtonElement>('[data-next-tip]')!.focus({ preventScroll: true });
  }
  const stopLocaleListener = onLocaleChange(() => { if (coach.open) renderCard(); });

  return {
    chooseLanguage(): Promise<Locale | undefined> {
      if (languageResolve) return Promise.reject(new Error('A language choice is already open.'));
      options.releaseInputs();
      languageReturn = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
      language.returnValue = '';
      language.querySelector<HTMLInputElement>(`input[value="${getLocale()}"]`)!.checked = true;
      language.showModal();
      language.querySelector<HTMLElement>('h2')!.focus({ preventScroll: true });
      return new Promise((resolve) => { languageResolve = resolve; });
    },
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
    cancelLanguage() { if (language.open) language.close('cancel'); },
    get languageOpen() { return language.open; },
    get cardOpen() { return coach.open; },
    get cardPending() { return pending; },
    get activeCard() { return card ? { ...card } : undefined; },
    destroy() { stopLocaleListener(); language.remove(); coach.remove(); },
  };
}
