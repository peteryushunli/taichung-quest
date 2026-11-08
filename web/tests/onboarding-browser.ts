import '../src/style.css';
import { createOnboardingView } from '../src/onboarding-view';
import type { TutorialTopic } from '../src/onboarding-view';
import { initializeLocalization, languageControl, setLocale } from '../src/i18n';
import { createOnboarding } from '../src/onboarding';

document.querySelector('#locale')!.innerHTML = languageControl('preview-language');
initializeLocalization();
const status = document.querySelector<HTMLElement>('#preview-status')!;
const topics: TutorialTopic[] = ['bike', 'map', 'team', 'landmarks'];
let step = 0;
let releases = 0;
let continued = 0;
const makeView = () => createOnboardingView({
  host: document.querySelector('#preview-host')!, releaseInputs() { releases++; },
  onCardContinue(card) {
    continued++;
    status.textContent = `SIMULATED ACK: ${card.topic}, context ${card.context}. No native state changed.`;
    view.closeCard();
    if (++step < topics.length) showTopic();
  },
  onContinueLater() { view.closeCard(); status.textContent = 'Paused preview. No native completion was recorded.'; },
});
let view = makeView();
function showTopic() { view.showCard({ topic: topics[step], context: 100 + step, phase: 5 + step }); }
document.querySelector('#show-language')!.addEventListener('click', async () => {
  const locale = await view.chooseLanguage();
  status.textContent = locale ? `Selected ${locale}. Real startup must await native readiness/ack before guide text.` : 'Cancelled before any runtime started.';
});
document.querySelector('#show-coach')!.addEventListener('click', () => { step = 0; showTopic(); });
document.querySelector('#run')!.addEventListener('click', async () => {
  const lines: string[] = [];
  const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
  async function check(name: string, test: () => void | Promise<void>) {
    try { await test(); lines.push(`PASS ${name}`); } catch (error) { lines.push(`FAIL ${name}: ${error}`); }
    status.textContent = lines.join('\n');
  }
  await check('readable bilingual language choice returns a locale without starting a game', async () => {
    const chosen = view.chooseLanguage();
    const dialog = document.querySelector<HTMLDialogElement>('#startup-language')!;
    assert(dialog.open && dialog.querySelectorAll('input[type="radio"]').length === 2, 'Expected two accessible choices');
    dialog.querySelector<HTMLInputElement>('input[value="zh-Hant"]')!.checked = true;
    dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    assert(await chosen === 'zh-Hant' && !view.languageOpen, 'Selected locale did not resolve');
  });
  await check('cancel returns without a selected language or native action', async () => {
    const chosen = view.chooseLanguage();
    view.cancelLanguage();
    assert(await chosen === undefined, 'Cancel started a language request');
  });
  await check('all four compact frames stay inside the game screen without a modal backdrop or illustration', () => {
    for (const locale of ['en', 'zh-Hant'] as const) {
      setLocale(locale);
      for (let index = 0; index < topics.length; index++) {
        view.showCard({ topic: topics[index], context: 200 + index, phase: 5 + index });
        const dialog = document.querySelector<HTMLDialogElement>('#outdoor-coach')!;
        assert(dialog.open && !!dialog.querySelector('h2')!.textContent && !!dialog.querySelector('.coach-copy')!.textContent, 'Missing readable topic');
        assert(!dialog.matches(':modal') && dialog.parentElement?.id === 'screen', 'Guide escaped its game viewport');
        assert(!dialog.querySelector('figure, svg, figcaption'), 'Large tutorial illustration remains');
        assert(dialog.querySelector('.coach-cue')!.textContent?.includes('A'), 'Native A prompt is missing');
        assert(!/\b[FD]\s*[\/／]/.test(dialog.textContent ?? ''), 'Keyboard F/D hint leaked into the tutorial');
        if (topics[index] === 'bike') assert(dialog.querySelector('.coach-copy')!.textContent?.includes('B'), 'Native B bike prompt is missing');
        const frame = dialog.getBoundingClientRect(), screen = dialog.parentElement!.getBoundingClientRect();
        assert(frame.left >= screen.left && frame.right <= screen.right && frame.bottom <= screen.bottom && frame.top >= screen.top, 'Frame lies outside game viewport');
        assert(dialog.querySelector<HTMLButtonElement>('[data-continue-later]')!.getBoundingClientRect().width >= 44, 'Continue later lost its touch target');
        assert(!dialog.querySelector('.minimap-player'), 'Tutorial created a live player marker');
        assert(dialog.scrollWidth <= dialog.clientWidth, 'Card overflows horizontally');
      }
    }
    view.closeCard();
  });
  await check('Escape does not mark mandatory teaching as read; Continue later remains available', () => {
    view.showCard({ topic: 'bike', context: 301, phase: 5 });
    const dialog = document.querySelector<HTMLDialogElement>('#outdoor-coach')!;
    const before = continued;
    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    assert(cancel.defaultPrevented && dialog.open && continued === before, 'Escape bypassed teaching');
    dialog.querySelector<HTMLButtonElement>('[data-continue-later]')!.click();
    assert(!view.cardOpen && continued === before, 'Pause advanced native state');
  });
  await check('pending acknowledgement blocks duplicate actions and keeps context stable', () => {
    const before = continued;
    view.showCard({ topic: 'team', context: 401, phase: 7 });
    view.setPending(true);
    document.querySelector<HTMLButtonElement>('#outdoor-coach [data-next-tip]')!.click();
    assert(continued === before && view.activeCard?.context === 401, 'Duplicate or wrong-context action');
    view.closeCard();
    assert(releases > 0, 'Input release hook was not used');
  });
  status.textContent = `${lines.join('\n')}\n${lines.filter(line => line.startsWith('PASS')).length}/${lines.length} checks passed. Presentation only; native handshake not exercised.`;
});

document.querySelector('#run-adapter')!.addEventListener('click', async () => {
  view.destroy();
  const heap = new Uint8Array(new SharedArrayBuffer(512));
  const words = new Uint32Array(heap.buffer, 64, 12);
  const metadata = { version: 1 as const, size: 48 as const, address: 0x0203d000, magicA: 0x4e494354, magicB: 0x314f5254 };
  words.set([metadata.magicA, metadata.magicB, 0x00300001, metadata.address, 2, 1, 1 | 3 << 8, 0, 0, 0, 43 << 16, 30 | 66 << 16]);
  const host = { running: true, paused: false, restarting: false, immersive: true };
  const commands: number[] = [];
  let simulationError: unknown;
  const assert = (value: unknown, message: string) => { if (!value) throw new Error(message); };
  const waitFor = async (condition: () => boolean) => {
    const until = performance.now() + 2500;
    while (!condition()) { if (simulationError) throw simulationError; if (performance.now() > until) throw new Error('Timed out waiting for simulated native state'); await new Promise(resolve => setTimeout(resolve, 30)); }
  };
  const publish = (phase: number, flags = 3) => {
    words[4]++; words[5]++; words[6] = (words[6] & 0xff000000) | phase | flags << 8 | 1 << 16; words[4]++;
  };
  const adapter = createOnboarding({
    host: document.querySelector('#preview-host')!, getState: () => host, getHeap: () => heap,
    pause() { host.paused = true; adapter.refresh(); }, resume() { host.paused = false; adapter.refresh(); },
    leaveGame() { host.paused = true; host.immersive = false; },
    releaseInputs() { releases++; }, refreshInput() {}, message(text) { status.textContent = text; },
  });
  const timer = setInterval(() => {
    try {
    if (host.paused) return;
    words[4] += 2;
    if (words[7] && words[7] !== words[8]) {
      assert(words[9] === words[5], 'Adapter used a stale context');
      const command = heap[64 + 40]; commands.push(command);
      const next = command === 1 ? 2 : (words[6] & 255) + 1;
      publish(next, next === 9 ? 5 : 3);
      words[4]++; words[6] |= 1 << 24; words[8] = words[7]; words[4]++;
    }
    } catch (error) { simulationError = error; }
  }, 20);
  try {
    setLocale('en');
    assert(await adapter.prepareLanguage(false, false), 'Legacy capability was blocked');
    assert(!document.querySelector<HTMLDialogElement>('#startup-language')!.open, 'Legacy cartridge got an extra language picker');
    assert(await adapter.prepareLanguage(true, false), 'Remembered language was lost');
    adapter.attach(metadata);
    await waitFor(() => (words[6] & 255) === 2);
    assert(commands.join(',') === '1', 'Startup did not use the dedicated command');
    publish(5);
    await waitFor(() => document.querySelector<HTMLDialogElement>('#outdoor-coach')!.open);
    assert(host.paused && adapter.blocksInput && adapter.canAdvanceGuide, 'Coach did not pause/release controls or expose Interact');
    for (const phase of [5, 6, 7, 8]) {
      await waitFor(() => (words[6] & 255) === phase && !!document.querySelector<HTMLDialogElement>('#outdoor-coach')!.open && !document.querySelector<HTMLButtonElement>('#outdoor-coach [data-next-tip]')?.disabled);
      if (phase === 6) {
        document.querySelector<HTMLButtonElement>('#outdoor-coach [data-continue-later]')!.click();
        assert(!host.immersive && (words[6] & 255) === 6, 'Continue later advanced native progress');
        host.immersive = true; host.paused = false; adapter.refresh();
        await waitFor(() => document.querySelector<HTMLDialogElement>('#outdoor-coach')!.open);
      }
      if (phase === 5) {
        const modal = document.createElement('dialog');
        document.querySelector('#preview-host')!.append(modal); modal.showModal();
        assert(!adapter.canAdvanceGuide, 'Another modal left tutorial Interact active');
        adapter.advanceGuide();
        assert((words[6] & 255) === 5, 'Interact advanced behind an options modal');
        modal.close(); modal.remove();
        adapter.advanceGuide();
      } else if (phase === 6) {
        document.querySelector('#outdoor-coach [data-next-tip]')!.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', bubbles: true, cancelable: true }));
      } else document.querySelector<HTMLButtonElement>('#outdoor-coach [data-next-tip]')!.click();
      assert(!adapter.canAdvanceGuide, 'Pending ACK still exposes tutorial Interact');
      adapter.advanceGuide();
      assert(document.querySelector<HTMLDialogElement>('#outdoor-coach')!.open, 'Pending acknowledgement removed the dialogue input barrier');
      assert([...document.querySelectorAll<HTMLButtonElement>('#outdoor-coach button')].every(button => button.disabled), 'Pending acknowledgement permits duplicate activation');
      assert(document.querySelector('#outdoor-coach')!.getAttribute('aria-busy') === 'true', 'Pending frame does not expose its busy state');
    }
    await waitFor(() => (words[6] & 255) === 9 && !document.querySelector<HTMLDialogElement>('#outdoor-coach')!.open && !adapter.blocksInput);
    assert(commands.join(',') === '1,2,2,2,2', 'Expected one language application and four exact-context acknowledgements');
    assert(!host.paused, 'Native farewell could not resume');
    assert(adapter.blocksCityMap, 'City Map became active while native farewell still owns input');
    publish(9, 1);
    await waitFor(() => !adapter.blocksCityMap);
    assert(!adapter.blocksInput, 'Completing the native guide kept ordinary input blocked');
    status.textContent = 'PASS simulated adapter: dedicated language handshake, four in-screen frames, F/Interact/tap routes, fresh resume/context ACKs, Continue later without progress, and phase9 native farewell. No actual ROM/party or physical-device coverage.';
  } catch (error) { status.textContent = `FAIL simulated adapter: ${error}`; }
  finally { clearInterval(timer); adapter.destroy(); view = makeView(); }
});
