import './style.css';
import './confirm.css';
import './controls.css';
import './immersive.css';
import './minimap.css';
import './title-screen.css';
import titleStation from './assets/landmarks/old-station.png';
import titleBulbasaur from './assets/pokemon/front/bulbasaur.png';
import titleCharmander from './assets/pokemon/front/charmander.png';
import titlePikachu from './assets/pokemon/front/pikachu.png';
import titleSquirtle from './assets/pokemon/front/squirtle.png';
import type { mGBAEmulator } from '@thenick775/mgba-wasm';
import { createCityGuide } from './city-guide';
import { initializeLocalization, languageControl, onLocaleChange, setLocale, t } from './i18n';
import { createLanding } from './landing';
import { NativeLanguageBridge, parseLanguageBridgeMetadata } from './language-bridge';
import type { LanguageBridgeState } from './language-bridge';
import { createGameControls } from './game-controls';
import { createGameView } from './game-view';
import { protectGameDisplay } from './game-display';
import { NativeNavigationBridge, parseNavigationMetadata } from './navigation-bridge';
import type { NavigationState } from './navigation-bridge';
import { createMinimap } from './minimap';
import { projectNavigation, secondaryAction } from './minimap-model';
import minimapGeometry from './data/minimap-contract.json';
import { createOnboarding } from './onboarding';
import { parseOnboardingMetadata } from './onboarding-bridge';

type RuntimeFactory = (options: { canvas: HTMLCanvasElement }) => Promise<mGBAEmulator>;
type RuntimeWindow = Window & { taichungCreateEmulator?: RuntimeFactory };
// These Emscripten exports pause the JavaScript scheduler without entering the
// native core's thread-interrupt path (unlike live boolean core settings).
type SchedulerRuntime = mGBAEmulator & { pauseMainLoop(): void; resumeMainLoop(): void };
type LanguageRuntime = mGBAEmulator & { getTaichungHeapU8?: () => Uint8Array };

const ROM_URL = '/roms/taichung-firered.gba';
const SAVE_PATH = '/data/saves/taichung-firered.sav';
const SAVE_DATABASE = '/data';
const SAVE_STORE = 'FILE_DATA';
const SAVE_STAMP = 'taichung-quest-save-time';
const CARTRIDGE_BOOT_PARAM = 'cartridge-boot';
const cartridgeBootIntent = new URL(window.location.href).searchParams.get(CARTRIDGE_BOOT_PARAM);
let bootFromCartridge = cartridgeBootIntent === '1' || cartridgeBootIntent === 'import';
let savedAt: string | null = null;
try { savedAt = localStorage.getItem(SAVE_STAMP); } catch { /* Storage can be disabled in private browser sessions. */ }
let hasSave = savedAt !== null;

const icons = {
  play: '<path d="m9 5 11 7-11 7z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  sound: '<path d="m11 4-6 5H2v6h3l6 5zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 4-6 5H2v6h3l6 5zM17 9l5 6m0-6-5 6"/>',
  save: '<path d="M5 3h12l4 4v14H3V3zM7 3v6h10V3M7 21v-8h10v8"/>',
  fullscreen: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  restart: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16m6-14v16"/>',
};
const icon = (name: keyof typeof icons) => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
// The loading screen is a title card: the old station with the four starters waiting on its plaza.
const titleArt = { station: titleStation, starters: [titleBulbasaur, titleCharmander, titleSquirtle, titlePikachu] };

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="landing"></div>
  <div class="player-view">
    <div class="adventure-layout">
      <section class="game-column" aria-label="Playable game">
        <div class="console" id="console">
          <div class="immersive-bar"><button id="exit-fullscreen-button" class="fullscreen-exit"><span aria-hidden="true">←</span> <span data-i18n="Back to site">Back to site</span></button><span>POKÉMON × TAICHUNG</span><div class="immersive-actions"><button id="game-sound-button" disabled aria-label="Sound off" title="Sound off" aria-pressed="true">${icon('mute')}</button><button id="game-options-button" aria-haspopup="dialog" aria-controls="game-options" data-i18n="Game options">Game options</button></div></div>
          <dialog id="game-options" class="player-options" aria-labelledby="game-options-title"><div class="options-heading"><h2 id="game-options-title" data-i18n="Game options">Game options</h2><button data-close-options data-i18n="Close">Close</button></div>${languageControl('player-language')}<div id="options-toolbar-slot"></div><div id="options-save-slot"></div><p id="options-feedback" role="status"></p><p class="options-key-help" data-i18n="Arrow keys move. F interacts or confirms. D goes back. M opens the game menu.">Arrow keys move. F interacts or confirms. D goes back. M opens the game menu.</p></dialog>
          <div class="console-top"><span><i class="power-light"></i> TAICHUNG QUEST</span><span>TAICHUNG CITY · 臺中城區</span></div>
          <div class="screen-bezel">
            <div class="screen" id="screen">
              <canvas id="game-canvas" width="240" height="160" tabindex="0" aria-label="Taichung Quest game screen. Arrow keys move. F interacts or confirms. D goes back. M or Enter opens the menu."></canvas>
              <div class="start-screen" id="start-screen">
                <div class="title-scene" aria-hidden="true">
                  <i class="title-sun"></i><i class="title-cloud cloud-a"></i><i class="title-cloud cloud-b"></i><i class="title-cloud cloud-c"></i>
                  <i class="title-skyline far"></i><i class="title-skyline near"></i>
                  <img class="title-station" src="${titleArt.station}" alt="">
                  <i class="title-plaza"></i>
                  ${titleArt.starters.map((src, index) => `<img class="title-mon mon-${index}" src="${src}" alt="">`).join('')}
                </div>
                <div class="title-ui">
                  <h2 class="title-logo" aria-label="Pokémon × Taichung"><span class="title-logo-top">POKÉMON ×</span><span class="title-logo-main">TAICHUNG</span><span class="title-logo-ribbon" lang="zh-Hant">臺中小冒險</span></h2>
                  <button class="title-start" id="play-button"><i aria-hidden="true">▶</i> <span>Start exploring</span></button>
                  <p id="play-feedback" class="title-text-box" role="status" aria-live="polite" hidden></p>
                </div>
              </div>
              <div class="pause-screen" id="pause-screen" hidden><p class="screen-eyebrow" data-i18n="TAKE YOUR TIME">TAKE YOUR TIME</p><h2 data-i18n="A little breather.">A little breather.</h2><button class="start-button" id="resume-button">${icon('play')} <span data-i18n="Keep exploring">Keep exploring</span></button></div>
            </div>
            <div class="screen-caption"><span><i></i> <span id="game-status">READY WHEN YOU ARE</span></span><span>240 × 160 · GBA</span></div>
          </div>
          <div class="physical-controls" aria-label="Game controls">
            <div class="dpad" aria-label="Movement controls"><span class="dpad-center"></span><button data-gba="Up" class="direction up" aria-label="Move up">▲</button><button data-gba="Left" class="direction left" aria-label="Move left">◀</button><button data-gba="Right" class="direction right" aria-label="Move right">▶</button><button data-gba="Down" class="direction down" aria-label="Move down">▼</button></div>
            <div class="middle-controls"><div class="small-control-pair"><button data-gba="Start" aria-label="Open game menu. Keyboard M or Enter."><span data-i18n="Menu">Menu</span><small><span class="physical-key-hint">M / Enter · </span>START</small></button><button data-gba="Select" aria-label="Select button"><span data-i18n="Select">Select</span><small>SELECT</small></button><button id="touch-city-map-button" class="touch-map-control" aria-haspopup="dialog" aria-controls="city-guide">${icon('map')}<span data-i18n="City Map">City Map</span></button></div><span class="console-model">TC—01</span></div>
            <div class="action-buttons"><button data-gba="A" class="action a" aria-label="Interact or confirm. Keyboard F; game A."><span data-i18n="Interact / Confirm">Interact / Confirm</span><small class="physical-key-hint" data-i18n="F key · game A">F key · game A</small><small class="touch-key-hint" aria-hidden="true">A</small></button><button data-gba="B" class="action b" aria-label="Go back or cancel. Keyboard D; game B."><span data-i18n="Back">Back</span><small class="physical-key-hint" data-i18n="D key · game B">D key · game B</small><small class="touch-key-hint" aria-hidden="true">B</small></button></div>
          </div>
          <div class="console-bottom"><span data-i18n="A LITTLE CURIOSITY GOES A LONG WAY">A LITTLE CURIOSITY GOES A LONG WAY</span><div class="speaker" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div></div>
          <p id="player-notice" class="player-notice" role="alert" hidden></p>
          <div class="handheld-details" aria-hidden="true"><span class="handheld-brand">TAICHUNG QUEST<b>GAME BOY</b></span><div class="speaker"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
        </div>
        <div class="game-toolbar" aria-label="Emulator controls">
          <div class="toolbar-group"><button id="pause-button" class="tool-button" disabled>${icon('pause')} <span>Pause</span></button><button id="sound-button" class="tool-button" disabled aria-pressed="true">${icon('mute')} <span>Sound off</span></button></div>
          <div class="toolbar-group"><button id="save-button" class="tool-button" disabled>${icon('save')} <span data-i18n="Save spot">Save spot</span></button><button id="restart-button" class="tool-button" disabled aria-label="Restart game">${icon('restart')} <span data-i18n="Restart">Restart</span></button></div>
        </div>
        <details class="save-details"><summary><span data-i18n="Your saved adventures">Your saved adventures</span><span class="details-plus">+</span></summary><p data-i18n="Your spot is saved here every 20 seconds. Keep an extra backup using a game save from the in-game menu.">Your spot is saved here every 20 seconds. Keep an extra backup using a game save from the in-game menu.</p><div class="save-actions"><button id="export-button" disabled><span data-i18n="Download save">Download save</span> ${icon('arrow')}</button><button id="import-button" disabled><span data-i18n="Import save">Import save</span> ${icon('arrow')}</button></div><input type="file" id="save-file" accept=".sav" hidden></details>
      </section>
    </div>
  </div>
`;

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

const landing = createLanding(el('landing'), {
  startNewGame,
  continueGame: openGame,
  getState: () => ({ running, starting, immersive: gameView.immersive, hasSave }),
});
const canvas = el<HTMLCanvasElement>('game-canvas');
protectGameDisplay(el('screen'));
const playButton = el<HTMLButtonElement>('play-button');
const feedback = el('feedback');
const status = el('game-status');
let emulator: mGBAEmulator | undefined;
let languageBridge: NativeLanguageBridge | undefined;
let languageState: LanguageBridgeState | undefined;
let navigationBridge: NativeNavigationBridge | undefined;
let navigationState: NavigationState = { phase: 'unavailable' };
let onboarding: ReturnType<typeof createOnboarding> | undefined;
let gamePath: string | undefined;
let starting = false;
let running = false;
let paused = false;
let muted = true;
let saving = false;
let restarting = false;
let confirmationOpen = false;
let saveInterval: ReturnType<typeof setInterval> | undefined;
let filesystemWrites: Promise<void> = Promise.resolve();
let gameInput: ReturnType<typeof createGameControls> | undefined;
let statusText = 'READY WHEN YOU ARE';
let feedbackText = cartridgeBootIntent === 'import' ? 'Save imported. Choose Continue saved game, then Continue on the title screen.' : bootFromCartridge ? 'Cartridge restarted. Continue your saved game or start a new one.' : savedAt ? 'Your last saved spot is waiting in this browser.' : '';

function message(text: string, error = false) {
  feedbackText = text;
  feedback.textContent = t(text);
  feedback.classList.toggle('error', error);
  el('options-feedback').textContent = t(text);
  el('options-feedback').classList.toggle('error', error);
  el('play-feedback').textContent = t(text);
  el('play-feedback').hidden = !starting && !error;
  el('start-screen').dataset.error = String(error);
  el('player-notice').textContent = t(text);
  el('player-notice').hidden = !error || !running;
}

function setStatus(text: string) { statusText = text; status.textContent = t(text); }

function refreshLanguageConnection() {
  const phase = languageState?.phase;
  const hint = phase === 'discovering' ? 'Connecting to game…' : phase === 'startup' ? onboarding?.supported ? 'Connecting your language choice…' : 'Choose inside the game first' : phase === 'ready' ? 'Taichung text + City Map' : phase === 'pending' ? 'Queued until gameplay resumes' : phase === 'unavailable' ? 'Game: use its Language menu' : 'Player & City Map';
  document.querySelectorAll<HTMLElement>('[data-language-hint]').forEach((element) => {
    element.dataset.i18n = hint;
    element.dataset.languagePhase = phase ?? 'interface';
    element.textContent = t(hint);
  });
  document.querySelectorAll<HTMLSelectElement | HTMLButtonElement>('[data-locale-select], [data-locale-toggle]').forEach((control) => { control.disabled = restarting || phase === 'pending'; });
}

async function connectNativeLanguage(romSha256: string, romBytes: number) {
  languageBridge?.stop();
  languageState = { phase: 'discovering', activeLanguage: 0 };
  refreshLanguageConnection();
  try {
    const response = await fetch('/roms/build.json', { cache: 'no-store' });
    const metadata = response.ok ? parseLanguageBridgeMetadata(await response.json(), romSha256, romBytes) : undefined;
    if (!metadata || !(emulator as LanguageRuntime | undefined)?.getTaichungHeapU8) throw new Error('Matching language metadata/runtime is unavailable.');
    if (restarting || !running) return;
    languageBridge = new NativeLanguageBridge({
      metadata,
      getHeap: () => (emulator as LanguageRuntime | undefined)?.getTaichungHeapU8?.(),
      onState: (state) => { languageState = state; refreshLanguageConnection(); },
      onNativeLanguage: (language) => setLocale(language === 2 ? 'zh-Hant' : 'en', 'native'),
    });
    void languageBridge.start();
  } catch (error) {
    console.info('Using interface-only language selection:', error);
    languageState = { phase: 'unavailable', activeLanguage: 0 };
    refreshLanguageConnection();
  }
}

function canPlayGame() {
  return running && !paused && !restarting && !confirmationOpen && !cityGuide.isOpen && gameView.immersive && !gameView.optionsOpen && !onboarding?.blocksInput && !document.hidden;
}

function renderNavigation() {
  el<HTMLButtonElement>('touch-city-map-button').disabled = restarting || !!onboarding?.blocksCityMap;
  const state: NavigationState = canPlayGame() ? navigationState : { phase: navigationState.phase === 'unavailable' ? 'unavailable' : 'hidden' };
  minimap.update(state);
  const packet = state.phase === 'live' ? state.snapshot : undefined;
  const position = packet ? projectNavigation(packet, minimapGeometry) : undefined;
  const action = secondaryAction(packet, position);
  const secondary = document.querySelector<HTMLButtonElement>('.physical-controls [data-gba="B"]')!;
  const label = secondary.querySelector<HTMLElement>('[data-i18n]')!;
  label.dataset.i18n = action;
  label.textContent = t(action);
  const accessible = action === 'Bike' ? 'Ride bike. Keyboard D; game B.' : action === 'Get off' ? 'Get off bike. Keyboard D; game B.' : 'Go back or cancel. Keyboard D; game B.';
  secondary.dataset.i18nLabel = accessible;
  secondary.setAttribute('aria-label', t(accessible));
  const canvasHint = action === 'Bike' ? 'Taichung Quest game screen. Arrow keys move. F interacts or confirms. D rides your bike. M or Enter opens the menu.' : action === 'Get off' ? 'Taichung Quest game screen. Arrow keys move. F interacts or confirms. D gets off your bike. M or Enter opens the menu.' : 'Taichung Quest game screen. Arrow keys move. F interacts or confirms. D goes back. M or Enter opens the menu.';
  canvas.dataset.i18nLabel = canvasHint;
  canvas.setAttribute('aria-label', t(canvasHint));
  const help = document.querySelector<HTMLElement>('.options-key-help')!;
  const hint = action === 'Bike' ? 'Arrow keys move. F interacts or confirms. D rides your bike. M opens the game menu.' : action === 'Get off' ? 'Arrow keys move. F interacts or confirms. D gets off your bike. M opens the game menu.' : 'Arrow keys move. F interacts or confirms. D goes back. M opens the game menu.';
  help.dataset.i18n = hint;
  help.textContent = t(hint);
}

function refreshNavigation() { navigationBridge?.refresh(); renderNavigation(); }

async function connectNativeNavigation(romSha256: string, romBytes: number) {
  navigationBridge?.stop();
  navigationBridge = undefined;
  navigationState = { phase: 'connecting' };
  renderNavigation();
  try {
    const response = await fetch('/roms/build.json', { cache: 'no-store' });
    const metadata = response.ok ? parseNavigationMetadata(await response.json(), romSha256, romBytes, minimapGeometry.geometryFingerprintSha256) : undefined;
    if (!metadata || !(emulator as LanguageRuntime | undefined)?.getTaichungHeapU8) throw new Error('Matching navigation metadata/runtime is unavailable.');
    if (restarting || !running) return;
    navigationBridge = new NativeNavigationBridge({
      metadata, getHeap: () => (emulator as LanguageRuntime | undefined)?.getTaichungHeapU8?.(), isActive: canPlayGame,
      onState: (state) => { navigationState = state; renderNavigation(); },
    });
    void navigationBridge.start();
  } catch (error) {
    console.info('City Map available without live navigation:', error);
    navigationState = { phase: 'unavailable' };
    renderNavigation();
  }
}

function focusGame() { if (running && !paused && !restarting && !confirmationOpen && !cityGuide.isOpen && !gameView.optionsOpen && !onboarding?.blocksInput && gameView.immersive) canvas.focus({ preventScroll: true }); }

function confirmAction(title: string, explanation: string, action: string): Promise<boolean> {
  if (confirmationOpen) return Promise.resolve(false);
  releaseInputs();
  confirmationOpen = true;
  gameInput?.refresh();
  refreshNavigation();
  const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const dialog = document.createElement('dialog');
  dialog.className = 'cartridge-confirm';
  dialog.setAttribute('aria-labelledby', 'cartridge-confirm-title');
  dialog.setAttribute('aria-describedby', 'cartridge-confirm-explanation');
  const heading = document.createElement('h2');
  heading.id = 'cartridge-confirm-title';
  heading.dataset.i18n = title;
  heading.textContent = t(title);
  const body = document.createElement('p');
  body.id = 'cartridge-confirm-explanation';
  body.dataset.i18n = explanation;
  body.textContent = t(explanation);
  const actions = document.createElement('div');
  actions.className = 'confirm-actions';
  const cancel = document.createElement('button');
  cancel.dataset.i18n = 'Cancel';
  cancel.textContent = t('Cancel');
  const proceed = document.createElement('button');
  proceed.className = 'confirm-proceed';
  proceed.dataset.i18n = action;
  proceed.textContent = t(action);
  actions.append(cancel, proceed);
  dialog.append(heading, body, actions);
  (gameView.immersive ? el('console') : document.body).append(dialog);
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => {
      const accepted = dialog.returnValue === 'confirm';
      confirmationOpen = false;
      gameInput?.refresh();
      refreshNavigation();
      dialog.remove();
      returnFocus?.focus({ preventScroll: true });
      resolve(accepted);
    }, { once: true });
    cancel.addEventListener('click', () => dialog.close('cancel'));
    proceed.addEventListener('click', () => dialog.close('confirm'));
    dialog.showModal();
    cancel.focus();
  });
}

function flushFilesystem() {
  const activeEmulator = emulator;
  if (!activeEmulator) return Promise.resolve();
  const write = filesystemWrites.catch(() => undefined).then(() => activeEmulator.FSSync());
  filesystemWrites = write;
  return write;
}

function discardOwnedSnapshot(path: string | undefined) {
  if (!emulator || !path) return;
  const directory = `${emulator.filePaths().autosave}/`;
  const filename = path.startsWith(directory) ? path.slice(directory.length) : '';
  if (/^taichung-firered(?:-[a-f0-9]{16})?_auto\.ss$/.test(filename) && emulator.FS.analyzePath(path).exists) emulator.FS.unlink(path);
}

function startSaveTimer() {
  if (saveInterval) clearInterval(saveInterval);
  saveInterval = setInterval(() => { if (!paused && !restarting) void persist(); }, 20_000);
}

function getRuntimeFactory(): Promise<RuntimeFactory> {
  const runtimeWindow = window as RuntimeWindow;
  if (runtimeWindow.taichungCreateEmulator) return Promise.resolve(runtimeWindow.taichungCreateEmulator);
  return new Promise((resolve, reject) => {
    const ready = () => {
      clearTimeout(timeout);
      if (runtimeWindow.taichungCreateEmulator) resolve(runtimeWindow.taichungCreateEmulator);
      else reject(new Error('The emulator runtime did not finish loading. Refresh the page and try again.'));
    };
    const timeout = setTimeout(() => {
      window.removeEventListener('taichung:emulator-ready', ready);
      reject(new Error('The emulator runtime could not be loaded. Refresh the page and try again.'));
    }, 20_000);
    window.addEventListener('taichung:emulator-ready', ready, { once: true });
  });
}

function releaseInputs() {
  gameInput?.releaseAll();
}

async function persist(showFeedback = false) {
  if (!emulator || !running || saving || restarting) return;
  saving = true;
  try {
    if (!emulator.forceAutoSaveState()) throw new Error('The game could not capture your spot yet.');
    await flushFilesystem();
    if (restarting) return;
    try { localStorage.setItem(SAVE_STAMP, new Date().toISOString()); } catch { /* The snapshot itself is stored separately in IndexedDB. */ }
    if (showFeedback) message('Spot saved. Your next visit will pick up right here.');
  } catch (error) {
    console.error('Saving failed', error);
    if (!restarting) message('Your spot could not be saved in this browser. Use the in-game Save menu and Download save for a backup.', true);
  } finally {
    saving = false;
  }
}

async function startGame() {
  if (starting || running) return;
  starting = true;
  playButton.disabled = true;
  landing.refresh();
  playButton.querySelector('span')!.textContent = t('Packing your bag…');
  setStatus('LOADING YOUR ADVENTURE');
  message('Getting your adventure ready…');
  try {
    if (!window.crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') {
      throw new Error('This preview cannot start the game yet. Try the latest link in Safari or Chrome; the host may need an update.');
    }
    const [response, metadataResponse] = await Promise.all([
      fetch(ROM_URL, { cache: 'no-store' }),
      fetch('/roms/build.json', { cache: 'no-store' }).catch(() => undefined),
    ]);
    if (!response.ok) throw new Error('The game cartridge is still being built. Try again once the Taichung build is ready.');
    const rom = new Uint8Array(await response.arrayBuffer());
    if (rom.length < 192 || rom[0xb2] !== 0x96) throw new Error('The game cartridge is not ready yet. Build the Taichung ROM, then try again.');
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', rom));
    const romSha256 = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    const buildId = romSha256.slice(0, 16);
    const metadata = metadataResponse?.ok ? await metadataResponse.json().catch(() => undefined) : undefined;
    const onboardingMetadata = parseOnboardingMetadata(metadata, romSha256, rom.length);
    // No native runtime exists yet for the first readable language choice.
    if (onboarding && !(await onboarding.prepareLanguage(!!onboardingMetadata, !!savedAt || cartridgeBootIntent === 'import'))) {
      gameView.leave();
      setStatus('READY WHEN YOU ARE');
      message('Choose a language when you’re ready to begin.');
      return;
    }
    if (!emulator) {
      const createEmulator = await getRuntimeFactory();
      emulator = await createEmulator({ canvas });
      await emulator.FSInit();
      emulator.setCoreSettings({
        // The wrapper owns one guarded snapshot timer. Avoid the native loop's
        // duplicate timer and its unguardable thread-interrupt capture path.
        autoSaveStateEnable: false,
        autoSaveStateTimerIntervalSeconds: 20,
        restoreAutoSaveStateOnLoad: !bootFromCartridge,
        rewindEnable: false,
        allowOpposingDirections: false,
      });
      emulator.addCoreCallbacks({
        coreCrashedCallback: () => {
          if (restarting) return;
          navigationBridge?.stop();
          onboarding?.stop();
          setStatus('ADVENTURE INTERRUPTED');
          message('The game stopped unexpectedly. Restart it to return to your saved progress.', true);
        },
        saveDataUpdatedCallback: () => { if (!restarting) void flushFilesystem().catch(() => message('Browser storage is unavailable. Download your save for a backup.', true)); },
      });
    }
    const gamesDirectory = emulator.filePaths().gamePath;
    gamePath = `${gamesDirectory}/taichung-firered-${buildId}.gba`;
    // Cartridge bytes are reproducible downloads. Keep one copy in IDBFS while
    // retaining snapshots for older builds and the shared in-game save.
    for (const filename of emulator.FS.readdir(gamesDirectory)) {
      const path = `${gamesDirectory}/${filename}`;
      if (/^taichung-firered(?:-[a-f0-9]{16})?\.gba$/.test(filename) && path !== gamePath) emulator.FS.unlink(path);
    }
    emulator.FS.writeFile(gamePath, rom);
    const freshCartridgeBoot = bootFromCartridge;
    if (freshCartridgeBoot) {
      const snapshotName = gamePath.slice(gamePath.lastIndexOf('/') + 1).replace(/\.gba$/, '_auto.ss');
      discardOwnedSnapshot(`${emulator.filePaths().autosave}/${snapshotName}`);
      // This is a new runtime with no emulation thread running yet. Remove the
      // old CPU snapshot durably before loading the cartridge and its SRAM.
      await flushFilesystem();
    }
    if (!gameView.immersive) {
      setStatus('READY WHEN YOU ARE');
      message('Your game is ready. Tap Play when you want to enter.');
      return;
    }
    // Silence the output before loadGame can start the native audio thread.
    emulator.setVolume(0);
    if (!emulator.loadGame(gamePath, SAVE_PATH)) throw new Error('The emulator could not open this game cartridge.');
    if (freshCartridgeBoot) {
      bootFromCartridge = false;
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete(CARTRIDGE_BOOT_PARAM);
      history.replaceState(history.state, '', cleanUrl);
    }
    emulator.toggleInput(false);
    emulator.setVolume(muted ? 0 : 0.55);
    if (!muted) { emulator.resumeAudio(); void emulator.SDL2?.audioContext?.resume(); }
    running = true;
    paused = false;
    document.body.classList.add('game-active');
    gameInput?.refresh();
    el('start-screen').hidden = true;
    canvas.classList.add('playing');
    document.querySelectorAll<HTMLButtonElement>('#pause-button, #sound-button, #game-sound-button, #save-button, #restart-button, #export-button, #import-button').forEach((button) => button.disabled = false);
    setStatus('OUT EXPLORING');
    message(freshCartridgeBoot && cartridgeBootIntent ? cartridgeBootIntent === 'import' ? 'Save imported. Choose Continue from the game’s title screen.' : 'Cartridge restarted. Continue your in-game save or begin a new adventure.' : !freshCartridgeBoot && emulator.getAutoSaveState() ? 'Welcome back. Your last saved spot is waiting for you.' : 'New adventures begin at the old station. Use City Map to discover Taichung’s landmarks.');
    canvas.focus({ preventScroll: true });
    // The Play button may have scrolled the intro into view. Collapsing that
    // intro must not leave a phone looking below its newly positioned game.
    if (matchMedia('(max-width:800px), (max-width:1000px) and (max-height:540px) and (min-aspect-ratio:6/5)').matches) window.scrollTo({ top: 0, behavior: 'instant' });
    startSaveTimer();
    cityGuide.onGameStarted();
    // Metadata is already bound to the loaded ROM; don't start a fresh network
    // round trip while the initialized native startup gate is waiting.
    onboarding?.attach(onboardingMetadata);
    void connectNativeLanguage(romSha256, rom.length);
    void connectNativeNavigation(romSha256, rom.length);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Something went wrong while loading the game.';
    message(reason, true);
    setStatus('WAITING FOR YOUR ADVENTURE');
  } finally {
    starting = false;
    playButton.disabled = false;
    refreshRuntimeLabels();
  }
}

function setPaused(value: boolean) {
  if (!running || !emulator || paused === value) return;
  releaseInputs();
  paused = value;
  if (paused) {
    emulator.pauseGame();
    void persist();
  } else {
    // resumeGame also resumes native audio; apply mute before that happens.
    emulator.setVolume(muted ? 0 : 0.55);
    emulator.resumeGame();
    if (!muted) { emulator.resumeAudio(); void emulator.SDL2?.audioContext?.resume(); }
    canvas.focus({ preventScroll: true });
  }
  el('pause-screen').hidden = !paused;
  el('pause-button').innerHTML = `${icon(paused ? 'play' : 'pause')} <span>${t(paused ? 'Resume' : 'Pause')}</span>`;
  setStatus(paused ? 'TAKING A BREATHER' : 'OUT EXPLORING');
  gameInput?.refresh();
  refreshNavigation();
  onboarding?.refresh();
}

const cityGuide = createCityGuide({
  getState: () => ({ running, paused }),
  pause: () => setPaused(true),
  resume: () => setPaused(false),
  releaseInputs,
});
// Native fullscreen only renders descendants of the player. Keep every modal
// in that subtree, without replacing its existing controls or event listeners.
el('console').append(el('city-guide'));
el('options-toolbar-slot').append(document.querySelector('.game-toolbar')!);
el('options-save-slot').append(document.querySelector('.save-details')!);
const gameView = createGameView({
  console: el('console'), dialog: el<HTMLDialogElement>('game-options'), returnTarget: el('hero-play'),
  getState: () => ({ running, paused }), pause: () => setPaused(true), resume: () => setPaused(false),
  release: releaseInputs, refresh: () => { gameInput?.refresh(); refreshRuntimeLabels(); },
});
const minimapSetting = document.createElement('label');
minimapSetting.className = 'minimap-setting';
minimapSetting.innerHTML = '<span id="minimap-label" data-i18n="Minimap">Minimap</span><select id="minimap-visibility" aria-labelledby="minimap-label" aria-describedby="minimap-hint"><option value="on" data-i18n="On">On</option><option value="off" data-i18n="Off">Off</option></select><small id="minimap-hint"></small>';
el('options-toolbar-slot').before(minimapSetting);
const minimap = createMinimap({
  screen: el('screen'), toggle: el<HTMLSelectElement>('minimap-visibility'), hint: el('minimap-hint'), geometry: minimapGeometry,
  openGuide: () => { if (!onboarding?.blocksCityMap) cityGuide.open(el('live-minimap')); },
});
onboarding = createOnboarding({
  host: el('console'),
  getState: () => ({ running, paused, restarting, immersive: gameView.immersive }),
  getHeap: () => (emulator as LanguageRuntime | undefined)?.getTaichungHeapU8?.(),
  pause: () => setPaused(true), resume: () => setPaused(false), leaveGame: () => gameView.leave(),
  releaseInputs, refreshInput: () => { gameInput?.refresh(); renderNavigation(); }, message,
});
el('touch-city-map-button').addEventListener('click', () => { if (!onboarding?.blocksCityMap) cityGuide.open(el('touch-city-map-button')); });

function openGame() {
  if (starting || restarting) return;
  gameView.enter();
  if (running) { setPaused(false); focusGame(); }
  else void startGame();
}

// A new game boots to the title screen, where the native menu offers New Game.
// The in-game save survives until the player saves over it; only an emulator
// snapshot is discarded, and that needs a confirmation.
async function startNewGame() {
  if (starting || restarting) return;
  if (running) { void restartCartridge(); return; }
  if (savedAt && !bootFromCartridge && !(await confirmAction('Start a new game?', 'The cartridge restarts at its title screen, where you can choose New Game. Your in-game save is kept until you save over it; progress since that save will be lost.', 'Restart'))) return;
  bootFromCartridge = true;
  savedAt = null;
  try { localStorage.removeItem(SAVE_STAMP); } catch { /* The snapshot itself is stored separately in IndexedDB. */ }
  openGame();
}
playButton.addEventListener('click', openGame);
el('resume-button').addEventListener('click', openGame);
el('exit-fullscreen-button').addEventListener('click', () => { onboarding?.beforeLeave(); gameView.leave(); });
el('game-options-button').addEventListener('click', () => gameView.openOptions(el('game-options-button')));
el('pause-button').addEventListener('click', () => {
  if (gameView.optionsOpen) { gameView.closeOptions(); setPaused(false); }
  else setPaused(!paused);
});
function refreshSoundControls() {
  const label = t(muted ? 'Sound off' : 'Sound on');
  el('sound-button').innerHTML = `${icon(muted ? 'mute' : 'sound')} <span>${label}</span>`;
  el('sound-button').setAttribute('aria-pressed', String(muted));
  const screenSound = el('game-sound-button');
  screenSound.innerHTML = icon(muted ? 'mute' : 'sound');
  screenSound.setAttribute('aria-label', label);
  screenSound.setAttribute('title', label);
  screenSound.setAttribute('aria-pressed', String(muted));
}
function toggleSound() {
  if (!emulator || !running || restarting) return;
  muted = !muted;
  emulator.setVolume(muted ? 0 : 0.55);
  if (!muted && !paused) { emulator.resumeAudio(); void emulator.SDL2?.audioContext?.resume(); }
  refreshSoundControls();
  focusGame();
}
el('sound-button').addEventListener('click', toggleSound);
el('game-sound-button').addEventListener('click', toggleSound);
el('save-button').addEventListener('click', () => { releaseInputs(); void persist(true); focusGame(); });
el('restart-button').addEventListener('click', () => { void restartCartridge(); });

async function restartCartridge(importedSave?: Uint8Array) {
  if (!emulator || !running || restarting) return;
  if (!importedSave && !(await confirmAction('Restart cartridge', 'Your in-game save is kept. Progress since that save will be lost.', 'Restart'))) return;
  const previousSave = importedSave ? emulator.getSave()?.slice() : undefined;
  const wasPaused = paused;
  restarting = true;
  gameInput?.refresh();
  refreshNavigation();
  refreshLanguageConnection();
  // Navigation will destroy the runtime and release native inputs. Do not call
  // any core functions here: even live boolean setters can interrupt and hang
  // the running core after a native save in the pinned emulator distribution.
  gameInput?.forgetAll();
  if (saveInterval) { clearInterval(saveInterval); saveInterval = undefined; }
  document.querySelectorAll<HTMLButtonElement>('#pause-button, #resume-button, #sound-button, #game-sound-button, #save-button, #restart-button, #import-button, #touch-city-map-button').forEach((button) => button.disabled = true);
  setStatus('RESTARTING CARTRIDGE');
  message(importedSave ? 'Importing your save and restarting the cartridge…' : 'Keeping your in-game save and restarting the cartridge…');
  let cancelSaveWrite = false;
  try {
    (emulator as SchedulerRuntime).pauseMainLoop();
    console.info('Cartridge reboot: JavaScript scheduler paused.');
    paused = true;
    // Drain pending writes and durably flush SRAM. Snapshot removal happens in
    // the next runtime before loadGame, after all old workers are gone.
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const saveWrites = (async () => {
        await flushFilesystem();
        if (cancelSaveWrite) return;
        if (importedSave) {
          emulator!.FS.writeFile(SAVE_PATH, importedSave);
          await flushFilesystem();
        }
      })();
      await Promise.race([
        saveWrites,
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Save flush timed out.')), 8_000); }),
      ]);
    } finally { if (timeout) clearTimeout(timeout); }
    console.info('Cartridge reboot: save files flushed.');
    try { localStorage.removeItem(SAVE_STAMP); } catch { /* SRAM is stored in IndexedDB, separately from this hint. */ }
    const restartUrl = new URL(window.location.href);
    restartUrl.searchParams.set(CARTRIDGE_BOOT_PARAM, importedSave ? 'import' : '1');
    // A full navigation creates a fresh WASM runtime. The one-time query stays
    // in place until Play successfully loads SRAM without restoring a snapshot.
    window.location.replace(restartUrl.href);
  } catch (error) {
    console.error('Cartridge restart failed', error);
    cancelSaveWrite = true;
    if (importedSave && previousSave) {
      emulator.FS.writeFile(SAVE_PATH, previousSave);
      void flushFilesystem().catch(() => undefined);
    }
    restarting = false;
    refreshLanguageConnection();
    document.querySelectorAll<HTMLButtonElement>('#pause-button, #resume-button, #sound-button, #game-sound-button, #save-button, #restart-button, #import-button, #touch-city-map-button').forEach((button) => button.disabled = false);
    paused = wasPaused;
    gameInput?.refresh();
    refreshNavigation();
    if (!wasPaused) (emulator as SchedulerRuntime).resumeMainLoop();
    el('pause-screen').hidden = !paused;
    el('pause-button').innerHTML = `${icon(paused ? 'play' : 'pause')} <span>${t(paused ? 'Resume' : 'Pause')}</span>`;
    setStatus(paused ? 'TAKING A BREATHER' : 'OUT EXPLORING');
    startSaveTimer();
    message('Your save could not be stored safely. Download a save backup before trying Restart again.', true);
  }
}

el('export-button').addEventListener('click', () => {
  if (!emulator) return;
  const data = emulator.getSave();
  if (!data) { message('Save from the game’s own menu first, then download your backup here.'); return; }
  const blob = new Blob([new Uint8Array(data)], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'taichung-firered.sav';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
  message('Game save downloaded. Keep it somewhere safe for your next adventure.');
});
el('import-button').addEventListener('click', () => el<HTMLInputElement>('save-file').click());
el<HTMLInputElement>('save-file').addEventListener('change', async (event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !emulator || !gamePath) return;
  // The pinned mGBA core can append a 16-byte hardware trailer. Accept its
  // own exported backups unchanged, alongside ordinary raw cartridge saves.
  if (![65536, 65552, 131072, 131088].includes(file.size)) { message('Choose a compatible FireRed .sav file (64 KB or 128 KB, including mGBA backups).', true); input.value = ''; return; }
  if (!(await confirmAction('Import game save', 'Import this save and restart the cartridge? It will replace the current in-game save in this browser.', 'Import save'))) { input.value = ''; return; }
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    await restartCartridge(bytes);
  } catch (error) {
    console.error(error);
    message('The save could not be imported. Restart the page to reload your last saved spot.', true);
  } finally { input.value = ''; }
});

gameInput = createGameControls({
  root: document.querySelector<HTMLElement>('.physical-controls')!,
  canvas,
  canPlay: canPlayGame,
  tutorialInteract: { available: () => !!onboarding?.canAdvanceGuide, advance: () => onboarding?.advanceGuide() },
  focus: focusGame,
  press: (button) => emulator?.buttonPress(button),
  release: (button) => emulator?.buttonUnpress(button),
});
document.addEventListener('visibilitychange', () => { if (!restarting && !confirmationOpen && document.hidden && running && !paused) setPaused(true); });
window.addEventListener('pagehide', () => { languageBridge?.stop(); navigationBridge?.stop(); onboarding?.stop(); releaseInputs(); if (saveInterval) clearInterval(saveInterval); });

// Locale refresh updates existing nodes, preserving the live emulator canvas.
document.querySelectorAll<HTMLElement>('[aria-label]').forEach((element) => {
  if (!element.hasAttribute('data-i18n-label') && !element.matches('[data-locale-select]')) element.dataset.i18nLabel = element.getAttribute('aria-label')!;
});
function refreshRuntimeLabels() {
  setStatus(statusText);
  message(feedbackText, feedback.classList.contains('error'));
  playButton.querySelector('span')!.textContent = t(starting ? 'Packing your bag…' : 'Start exploring');
  landing.refresh();
  el('pause-button').innerHTML = `${icon(paused ? 'play' : 'pause')} <span>${t(paused ? 'Resume' : 'Pause')}</span>`;
  refreshSoundControls();
  document.title = t('Taichung Quest · A little adventure');
  refreshNavigation();
}
onLocaleChange(refreshRuntimeLabels);
onLocaleChange(({ locale, source }) => {
  if (source === 'user' && languageState?.phase === 'ready' && !onboarding?.startupLanguagePending) {
    const requested = languageBridge?.request(locale === 'zh-Hant' ? 2 : 1);
    if (!requested && languageState.activeLanguage) setLocale(languageState.activeLanguage === 2 ? 'zh-Hant' : 'en', 'native');
  }
  refreshLanguageConnection();
});
initializeLocalization();
refreshRuntimeLabels();

// The emulator only loads on Play, so read its IndexedDB store directly to see
// whether this browser already holds an in-game save.
async function hasStoredSave() {
  const databases = await indexedDB.databases?.();
  if (!databases?.some(({ name }) => name === SAVE_DATABASE)) return false;
  return new Promise<boolean>((resolve) => {
    const open = indexedDB.open(SAVE_DATABASE);
    open.onerror = () => resolve(false);
    open.onsuccess = () => {
      const database = open.result;
      if (!database.objectStoreNames.contains(SAVE_STORE)) { database.close(); resolve(false); return; }
      const count = database.transaction(SAVE_STORE).objectStore(SAVE_STORE).count(SAVE_PATH);
      count.onerror = () => { database.close(); resolve(false); };
      count.onsuccess = () => { database.close(); resolve(count.result > 0); };
    };
  });
}
if (!hasSave) void hasStoredSave().then((found) => { if (found) { hasSave = true; landing.refresh(); } }).catch(() => undefined);

// A cartridge restart reloads the page; bring the player back to the Play section.
const initialTarget = cartridgeBootIntent ? 'play' : window.location.hash.slice(1);
if (initialTarget) document.getElementById(initialTarget)?.scrollIntoView({ behavior: 'instant' });

// A compact, read-only hook for local game verification; no gameplay state is sent anywhere.
Object.assign(window, { taichungQuest: {
  get running() { return running; },
  get paused() { return paused; },
  get emulator() { return emulator; },
  get guideOpen() { return cityGuide.isOpen; },
} });
