import './onboarding.css';
import { getLocale, initializeLocalization, onLocaleChange, setLocale, t } from './i18n';
import type { Locale } from './i18n';

export type TutorialTopic = 'bike' | 'map' | 'team' | 'landmarks';
export type TutorialCard = { topic: TutorialTopic; context: number; phase: number };

const topics: Record<TutorialTopic, { title: string; body: string; illustration: string }> = {
  bike: {
    title: 'See the city on two wheels.',
    body: 'After your guide finishes, tap Bike or press D to ride. Use the D-pad or arrow keys to steer, then tap Get off to walk again.',
    illustration: '<div class="coach-control-example"><span data-i18n="Bike">Bike</span><kbd>D</kbd><span class="coach-example-arrow" aria-hidden="true">↔</span><span data-i18n="Get off">Get off</span></div>',
  },
  map: {
    title: 'A little map, a bigger adventure.',
    body: 'The minimap helps you find your way while exploring. Tap it or City Map to see all ten landmarks. City Map still works when the minimap is off.',
    illustration: '<svg class="coach-map-example" viewBox="0 0 280 108" aria-hidden="true"><rect x="12" y="12" width="76" height="70" rx="5"/><rect x="96" y="26" width="76" height="70" rx="5"/><rect x="180" y="14" width="86" height="82" rx="5"/><path d="M50 12v70m46-20h76m52-48v82"/><circle cx="224" cy="78" r="7"/><circle cx="207" cy="53" r="5"/><circle cx="244" cy="33" r="5"/></svg><span class="coach-map-name" data-i18n="City Map">City Map</span>',
  },
  team: {
    title: 'Your starter is just the beginning.',
    body: 'Open Menu, then Team to choose Pokémon for free. Try different companions and build a party you love as you explore Taichung.',
    illustration: '<div class="coach-control-example"><span data-i18n="Menu">Menu</span><kbd>M</kbd><span class="coach-example-arrow" aria-hidden="true">→</span><span data-i18n="Team">Team</span></div>',
  },
  landmarks: {
    title: 'Taichung is yours to discover.',
    body: 'Old Taichung Station, Miyahara and Taichung Park are nearby. Visit their halls, meet the hosts, and use City Map to see which gym challenges are open.',
    illustration: '<div class="coach-place-examples"><span data-i18n="Old Taichung Station">Old Taichung Station</span><span data-i18n="Miyahara">Miyahara</span><span data-i18n="Taichung Park">Taichung Park</span></div>',
  },
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
  coach.className = 'onboarding-dialog outdoor-coach';
  coach.setAttribute('aria-labelledby', 'outdoor-coach-title');
  coach.setAttribute('aria-describedby', 'outdoor-coach-copy');
  options.host.append(language, coach);
  let languageResolve: ((value: Locale | undefined) => void) | undefined;
  let languageReturn: HTMLElement | undefined;
  let card: TutorialCard | undefined;
  let pending = false;

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
  // Mandatory teaching may be paused, but Escape must not mark a topic read.
  coach.addEventListener('cancel', (event) => event.preventDefault());
  coach.addEventListener('click', (event) => {
    const target = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!target || pending || !card) return;
    options.releaseInputs();
    if (target.hasAttribute('data-next-tip')) options.onCardContinue({ ...card });
    if (target.hasAttribute('data-continue-later')) options.onContinueLater();
  });

  function renderCard() {
    if (!card) return;
    const content = topics[card.topic];
    const step = topicOrder.indexOf(card.topic) + 1;
    coach.innerHTML = `<p class="onboarding-eyebrow"><span data-i18n="YOUR TAICHUNG FIELD GUIDE">${t('YOUR TAICHUNG FIELD GUIDE')}</span><span>${step} / 4</span></p>
      <h2 id="outdoor-coach-title" tabindex="-1">${t(content.title)}</h2>
      <p id="outdoor-coach-copy" class="onboarding-copy">${t(content.body)}</p>
      <figure class="coach-illustration">${content.illustration}<figcaption data-i18n="Tutorial illustration · your adventure is paused">${t('Tutorial illustration · your adventure is paused')}</figcaption></figure>
      <p class="coach-availability" data-i18n="These controls become available when your guide finishes.">${t('These controls become available when your guide finishes.')}</p>
      <p class="onboarding-progress" role="status" aria-live="polite">${pending ? t('Returning to your guide…') : ''}</p>
      <div class="onboarding-actions"><button data-continue-later ${pending ? 'disabled' : ''}>${t('Continue later')}</button><button data-next-tip class="onboarding-primary" ${pending ? 'disabled' : ''}>${t(step === 4 ? 'Let’s explore' : 'Next tip')}</button></div>`;
    initializeLocalization(coach);
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
      if (!coach.open) coach.showModal();
      coach.querySelector<HTMLElement>('h2')!.focus({ preventScroll: true });
    },
    setPending(value: boolean) { pending = value; renderCard(); },
    closeCard() { if (coach.open) coach.close(); card = undefined; pending = false; },
    cancelLanguage() { if (language.open) language.close('cancel'); },
    get languageOpen() { return language.open; },
    get cardOpen() { return coach.open; },
    get activeCard() { return card ? { ...card } : undefined; },
    destroy() { stopLocaleListener(); language.remove(); coach.remove(); },
  };
}
