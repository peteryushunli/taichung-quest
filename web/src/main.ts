import { NativeBadgeBridge, parseBadgeMetadata } from './badge-bridge';
import type { BadgeMetadata } from './badge-bridge';
import { pairedBadgePresentation } from './badge-view-model';
import { badgeDesigns } from './badge-art';
import { createBadgeView } from './badge-view';
import { bilingualNeighborhood } from './neighborhood-labels';
import './style.css';
import './confirm.css';
import './controls.css';
import './immersive.css';
import './minimap.css';
import './title-screen.css';
import './upright.css';
import './pause-screen.css';
import titleStation from './assets/landmarks/old-station.png';
import titleBulbasaur from './assets/pokemon/front/bulbasaur.png';
import titleCharmander from './assets/pokemon/front/charmander.png';
import titlePikachu from './assets/pokemon/front/pikachu.png';
import titleSquirtle from './assets/pokemon/front/squirtle.png';
import type { mGBAEmulator } from '@thenick775/mgba-wasm';
import { createCityGuide } from './city-guide';
import { getLocale, initializeLocalization, onLocaleChange, setLocale, t } from './i18n';
import { createLanding } from './landing';
import { NativeLanguageBridge, parseLanguageBridgeMetadata } from './language-bridge';
import type { LanguageBridgeState } from './language-bridge';
import { createGameControls } from './game-controls';
import { KEY_BINDINGS } from './input-state';
import { createGameView } from './game-view';
import { protectGameDisplay } from './game-display';
import { NativeNavigationBridge, parseNavigationMetadata } from './navigation-bridge';
import type { NavigationState } from './navigation-bridge';
import { createMinimap } from './minimap';
import { districtAt, projectNavigation, secondaryAction, streetAt } from './minimap-model';
import { BOULEVARD_PREVIEW, cityGeometry as minimapGeometry } from './preview-world';
import { createOnboarding } from './onboarding';
import { parseOnboardingMetadata } from './onboarding-bridge';
import { NativeEncounterBridge, parseEncounterMetadata } from './encounter-bridge';
import type { EncounterMetadata } from './encounter-bridge';
import { CaptureStorageController } from './capture-storage';
import { EncounterSaveSpeed } from './encounter-save-speed';
import { DETAILS, HdOverlay, keepCanvasReadable } from './hd-overlay';
import { HdSceneTracker } from './hd-scene';
import './hd-overlay.css';
import { CAPTURE_BOOT_INTENT_KEY, captureBlocksSnapshots, readCaptureBootPolicy } from './capture-persistence';
import { hasReadableFireRedSave, isFireRedBackupSize } from './firered-save';
import { isUntouchedDemoSave } from './demo-save';
import { addPreviewSave, downloadPreviewSave, isTaichungSnapshot, PREVIEW_NEW_GAME_KEY } from './preview-save';
import { readWithProgress } from './download';
import { copyText, unsupportedBrowserMessage } from './browser-support';
import { startAnalytics, track } from './analytics';
import { createUprightScreen } from './upright';

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
const previewSaveRequested = import.meta.env.VITE_PLAYTEST_PREVIEW_SAVE === '1';
function captureBootRequired() {
  try { return readCaptureBootPolicy(localStorage).forceCartridge; } catch { return true; }
}
let bootFromCartridge = cartridgeBootIntent === '1' || cartridgeBootIntent === 'import' || captureBootRequired();
let explicitCartridgeRestart = false;
let savedAt: string | null = null;
try { savedAt = localStorage.getItem(SAVE_STAMP); } catch { /* Storage can be disabled in private browser sessions. */ }
let hasSave = savedAt !== null;
let previewSeeded = false;

function previewSaveWanted() {
  if (!previewSaveRequested || bootFromCartridge || hasSave) return false;
  try { return localStorage.getItem(PREVIEW_NEW_GAME_KEY) === null; } catch { return false; }
}

function skipPreviewSave() {
  if (!previewSaveRequested) return;
  try { localStorage.setItem(PREVIEW_NEW_GAME_KEY, '1'); } catch { /* Without storage, preview seeding is disabled. */ }
}

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
          <dialog id="game-options" class="player-options" aria-labelledby="game-options-title"><div class="options-heading"><h2 id="game-options-title" data-i18n="Game options">Game options</h2><button data-close-options data-i18n="Close">Close</button></div><div id="options-toolbar-slot"></div><div id="options-save-slot"></div><p id="options-feedback" role="status"></p><p class="options-key-help" data-i18n="Arrow keys move. F interacts or confirms. D goes back. M opens the game menu.">Arrow keys move. F interacts or confirms. D goes back. M opens the game menu.</p></dialog>
          <div class="console-top"><span><i class="power-light"></i> TAICHUNG QUEST</span><span>TAICHUNG CITY · 臺中城區</span></div>
          <div class="screen-bezel">
            <div class="screen" id="screen">
              <canvas id="game-canvas" width="240" height="160" tabindex="0" aria-label="Taichung Quest game screen. Arrow keys move. F interacts or confirms. D goes back. M or Enter opens the menu."></canvas>
              <div class="live-street" id="live-street" hidden>
                <span id="live-street-name"></span>
                <span id="live-district"></span>
              </div>
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
                  <button class="title-start" id="copy-link-button" data-i18n="Copy link" hidden>Copy link</button>
                  <p id="play-feedback" class="title-text-box" role="status" aria-live="polite" hidden></p>
                </div>
              </div>
              <div class="pause-screen" id="pause-screen" hidden><section class="pause-panel" role="dialog" aria-labelledby="pause-title"><h2 class="pause-title" id="pause-title" data-i18n="Paused">Paused</h2><button class="pause-continue" id="resume-button"><span class="pause-pointer" aria-hidden="true"></span><span data-i18n="Continue">Continue</span></button></section></div>
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
const badgeView = createBadgeView(el('screen'), badgeDesigns);
// High-resolution buildings and characters drawn over the game's own frame, at
// the chosen 2× detail. H turns the layer off and on (keyboards only).
keepCanvasReadable(canvas);
const hdScene = new HdSceneTracker();
const hdOverlay = new HdOverlay(canvas, '/hd/world', '/hd/sprites', {
  getScene: () => {
    if (!running || restarting) { hdScene.reset(); return; }
    return hdScene.observe(navigationState, onboarding?.currentState ?? { status: 'unavailable' },
      navigationBridge?.canRenderFieldInteraction);
  },
});
canvas.after(hdOverlay.element);
if (hdOverlay.detail !== DETAILS[0]) hdOverlay.detail = DETAILS[0];
if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') (window as unknown as { __hd?: HdOverlay }).__hd = hdOverlay;
window.addEventListener('keydown', (event) => {
  if (event.key !== 'h' && event.key !== 'H' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (KEY_BINDINGS[event.code] === 'A') return;
  const target = event.target as HTMLElement | null;
  if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
  hdOverlay.enabled = !hdOverlay.enabled;
}, { capture: true });
const playButton = el<HTMLButtonElement>('play-button');
const copyLinkButton = el<HTMLButtonElement>('copy-link-button');
const feedback = el('feedback');
const status = el('game-status');
let emulator: mGBAEmulator | undefined;
let languageBridge: NativeLanguageBridge | undefined;
let languageState: LanguageBridgeState | undefined;
let navigationBridge: NativeNavigationBridge | undefined;
let badgeBridge: NativeBadgeBridge | undefined;
let badgeMetadata: BadgeMetadata | undefined;
let navigationState: NavigationState = { phase: 'unavailable' };
let onboarding: ReturnType<typeof createOnboarding> | undefined;
let encounterBridge: NativeEncounterBridge | undefined;
let encounterMetadata: EncounterMetadata | undefined;
let captureStorage: CaptureStorageController | undefined;
let activeRomSha256: string | undefined;
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

// The loading box doubles as the progress bar; without a percent it is plain again.
function showDownload(percent?: number) {
  const box = el('play-feedback');
  box.toggleAttribute('data-download', percent !== undefined);
  box.style.setProperty('--percent', String(percent ?? 0));
}

function setStatus(text: string) { statusText = text; status.textContent = t(text); }

// The game's own settings screen is the only language control while playing; the
// website's EN/中文 toggle only pauses while a native language change is queued.
function refreshLanguageConnection() {
  const phase = languageState?.phase;
  document.querySelectorAll<HTMLSelectElement | HTMLButtonElement>('[data-locale-select], [data-locale-toggle]').forEach((control) => { control.disabled = restarting || phase === 'pending'; });
}

async function connectNativeLanguage(romSha256: string, romBytes: number) {
  languageBridge?.stop();
  languageState = { phase: 'discovering', activeLanguage: 0 };
  refreshLanguageConnection();
  try {
    const response = await fetch('/roms/build.json', { cache: 'no-cache' });
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

function gameInputAvailable() {
  return running && !restarting && !confirmationOpen && !cityGuide.isOpen && gameView.immersive && !gameView.optionsOpen && !uprightScreen.open && !onboarding?.blocksInput && !document.hidden;
}

function canPlayGame() {
  return !paused && gameInputAvailable();
}

function renderNavigation() {
  el<HTMLButtonElement>('touch-city-map-button').disabled = restarting || !!onboarding?.blocksCityMap;
  const state: NavigationState = canPlayGame() ? navigationState : { phase: navigationState.phase === 'unavailable' ? 'unavailable' : 'hidden' };
  minimap.update(state);
  const packet = state.phase === 'live' ? state.snapshot : undefined;
  const position = packet ? projectNavigation(packet, minimapGeometry) : undefined;
  const street = streetAt(position, minimapGeometry);
  const streetLabel = el('live-street');
  const district = BOULEVARD_PREVIEW ? districtAt(position, minimapGeometry) : undefined;
  const language = getLocale() === 'zh-Hant' ? 'zh' : 'en';
  const streetFields = [
    [el('live-street-name'), street?.[language] ?? ''],
    [el('live-district'), district ? bilingualNeighborhood(district) : ''],
  ] as const;
  for (const [element, name] of streetFields) {
    if (element.textContent !== name) element.textContent = name;
    element.hidden = !name;
  }
  streetLabel.hidden = !street && !district;
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

function refreshNavigation() { navigationBridge?.refresh(); renderNavigation(); badgeBridge?.refresh(); }

function connectNativeBadges() {
  badgeBridge?.stop(); badgeBridge = undefined; badgeView.update({});
  if (!badgeMetadata) return;
  badgeBridge = new NativeBadgeBridge({ metadata: badgeMetadata, getAnchor: () => navigationBridge?.ewramAnchor,
    isActive: canPlayGame, onState: state => badgeView.update(state) });
  badgeBridge.start();
}

async function connectNativeNavigation(romSha256: string, romBytes: number) {
  navigationBridge?.stop();
  navigationBridge = undefined;
  navigationState = { phase: 'connecting' };
  renderNavigation();
  try {
    const response = await fetch('/roms/build.json', { cache: 'no-cache' });
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
  if (isTaichungSnapshot(path, emulator.filePaths().autosave) && emulator.FS.analyzePath(path).exists) emulator.FS.unlink(path);
}

function ownedSnapshotPath() {
  if (!emulator || !gamePath) return;
  return `${emulator.filePaths().autosave}/${gamePath.slice(gamePath.lastIndexOf('/') + 1).replace(/\.gba$/, '_auto.ss')}`;
}

function blocksCaptureSnapshot() {
  if (captureBootRequired() || captureStorage?.blocksSnapshots) return true;
  if (!encounterMetadata) return false;
  const snapshot = encounterBridge?.currentSnapshot;
  return !snapshot || captureBlocksSnapshots(snapshot.phase);
}

function connectNativeEncounters() {
  encounterBridge?.stop();
  encounterBridge = undefined;
  captureStorage = undefined;
  minimap.updateEncounter({ status: 'discovering' });
  cityGuide.updateEncounter({ status: 'discovering' });
  if (!encounterMetadata || !activeRomSha256 || !emulator) return;
  let controller: CaptureStorageController | undefined;
  const saveSpeed = new EncounterSaveSpeed(emulator);
  let nextReconcile = 0;
  let reportedFailure = false;
  const bridge = new NativeEncounterBridge({
    metadata: encounterMetadata,
    onSaveState: snapshot => saveSpeed.update(snapshot),
    getHeap: () => (emulator as LanguageRuntime | undefined)?.getTaichungHeapU8?.(),
    isActive: () => running && !paused && !restarting,
    onState: ({ status: connection, snapshot }) => {
      if (encounterBridge !== bridge || restarting) return;
      const progress = { status: connection, snapshot };
      minimap.updateEncounter(progress);
      cityGuide.updateEncounter(progress);
      if ((connection === 'unavailable' || snapshot?.phase === 6) && !reportedFailure) {
        reportedFailure = true;
        message('Browser storage is unavailable. Download your save for a backup.', true);
      }
      if (connection === 'live' && snapshot?.phase === 0 && controller?.blocksSnapshots && Date.now() >= nextReconcile) {
        nextReconcile = Date.now() + 1000;
        void controller.reconcile(snapshot).catch(error => {
          console.info('Interrupted landmark save reconciliation unavailable:', error);
          if (!reportedFailure) { reportedFailure = true; message('Browser storage is unavailable. Download your save for a backup.', true); }
        });
      }
    },
    onDurableSave: async snapshot => {
      try {
        if (!controller) throw new Error('Browser save-intent storage is unavailable.');
        await controller.persist(snapshot);
        if (encounterBridge !== bridge || restarting) return;
        hasSave = true;
        savedAt = new Date().toISOString();
        try { localStorage.setItem(SAVE_STAMP, savedAt); } catch { /* Optional landing-page hint, not the durability fence. */ }
        landing.refresh();
      } catch (error) {
        reportedFailure = true;
        message('Browser storage is unavailable. Download your save for a backup.', true);
        throw error;
      }
    },
  });
  try {
    controller = new CaptureStorageController({
      romSha256: activeRomSha256, storage: localStorage,
      readSave: () => {
        try { return emulator?.FS.readFile(SAVE_PATH, { encoding: 'binary' }); } catch { return; }
      },
      flush: flushFilesystem,
      discardSnapshot: () => discardOwnedSnapshot(ownedSnapshotPath()),
      getCurrent: () => bridge.currentSnapshot,
    });
  } catch { /* The live packet client emits a failure ACK if an encounter is requested. */ }
  captureStorage = controller;
  encounterBridge = bridge;
  void bridge.start();
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
  if (blocksCaptureSnapshot()) {
    if (showFeedback) message('Finish this encounter before saving a spot.');
    return;
  }
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

async function installPreviewSave(runtime: mGBAEmulator, metadata: unknown, romSha256: string, romBytes: number) {
  if (!previewSaveWanted() || runtime.FS.analyzePath(SAVE_PATH).exists) return;
  const paths = runtime.filePaths();
  if (runtime.FS.readdir(paths.autosave).some((name) => isTaichungSnapshot(`${paths.autosave}/${name}`, paths.autosave))) return;
  try {
    const seed = await downloadPreviewSave(metadata, romSha256, romBytes);
    if (!seed || !previewSaveWanted()) return;
    const added = await addPreviewSave(seed, {
      database: SAVE_DATABASE, save: SAVE_PATH, saveDirectory: paths.savePath, snapshots: paths.autosave,
    }, previewSaveWanted);
    // Refresh the mounts before any cartridge or local writes. This also
    // picks up progress that another tab persisted during the download.
    await new Promise<void>((resolve, reject) => runtime.FS.syncfs(true, (error) => error ? reject(error) : resolve()));
    for (const directory of Object.values(paths)) if (!runtime.FS.analyzePath(directory).exists) runtime.FS.mkdir(directory);
    previewSeeded = added && runtime.FS.analyzePath(SAVE_PATH).exists;
    if (previewSeeded) hasSave = true;
  } catch (error) {
    console.info('Preview save unavailable. Starting normally:', error);
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
      playButton.hidden = true;
      copyLinkButton.hidden = false;
      throw new Error(unsupportedBrowserMessage(navigator.userAgent, navigator.maxTouchPoints));
    }
    const [response, metadataResponse] = await Promise.all([
      fetch(ROM_URL, { cache: 'no-cache' }),
      fetch('/roms/build.json', { cache: 'no-cache' }).catch(() => undefined),
    ]);
    if (!response.ok) throw new Error('The game cartridge is still being built. Try again once the Taichung build is ready.');
    const metadata = metadataResponse?.ok ? await metadataResponse.json().catch(() => undefined) : undefined;
    const rom = await readWithProgress(response, Number(metadata?.bytes) || undefined, showDownload);
    showDownload();
    if (rom.length < 192 || rom[0xb2] !== 0x96) throw new Error('The game cartridge is not ready yet. Build the Taichung ROM, then try again.');
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', rom));
    const romSha256 = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    const buildId = romSha256.slice(0, 16);
    const onboardingMetadata = parseOnboardingMetadata(metadata, romSha256, rom.length);
    encounterMetadata = parseEncounterMetadata(metadata, romSha256, rom.length);
    badgeMetadata = parseBadgeMetadata(metadata, romSha256, rom.length);
    badgeView.setPaired(pairedBadgePresentation(metadata, romSha256, rom.length));
    activeRomSha256 = romSha256;
    // The game's first settings screen shows this language (the website choice, else the
    // browser's), and the player can change it there. No web picker comes first.
    onboarding?.prepareLanguage(!!onboardingMetadata);
    if (!emulator) {
      const createEmulator = await getRuntimeFactory();
      emulator = await createEmulator({ canvas });
      if (location.hostname === "127.0.0.1" || location.hostname === "localhost") (window as unknown as { __taichungEmulator?: mGBAEmulator }).__taichungEmulator = emulator;
      await emulator.FSInit();
      await installPreviewSave(emulator, metadata, romSha256, rom.length);
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
        videoFrameEndedCallback: () => encounterBridge?.onFrame(),
        coreCrashedCallback: () => {
          if (restarting) return;
          navigationBridge?.stop();
          badgeBridge?.stop();
          onboarding?.stop();
          encounterBridge?.stop();
          minimap.updateEncounter({ status: 'unavailable' });
          cityGuide.updateEncounter({ status: 'unavailable' });
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
    const snapshotPath = ownedSnapshotPath()!;
    // A browser that only holds the old demo checkpoint starts a new game. A spot
    // still waiting in a snapshot, or a save the player imported, is left alone.
    if (cartridgeBootIntent !== 'import' && emulator.FS.analyzePath(SAVE_PATH).exists
      && (freshCartridgeBoot || !emulator.FS.analyzePath(snapshotPath).exists)
      && await isUntouchedDemoSave(emulator.FS.readFile(SAVE_PATH, { encoding: 'binary' }))) {
      emulator.FS.unlink(SAVE_PATH);
      await flushFilesystem();
    }
    if (freshCartridgeBoot) {
      discardOwnedSnapshot(snapshotPath);
      // This is a new runtime with no emulation thread running yet. Remove the
      // old CPU snapshot durably before loading the cartridge and its SRAM.
      await flushFilesystem();
      if (explicitCartridgeRestart) {
        try { localStorage.removeItem(CAPTURE_BOOT_INTENT_KEY); } catch { /* Continue conservatively from native SRAM. */ }
        explicitCartridgeRestart = false;
      }
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
    connectNativeEncounters();
    document.body.classList.add('game-active');
    gameInput?.refresh();
    el('start-screen').hidden = true;
    canvas.classList.add('playing');
    hdOverlay.start();
    document.querySelectorAll<HTMLButtonElement>('#pause-button, #sound-button, #game-sound-button, #save-button, #restart-button, #export-button, #import-button').forEach((button) => button.disabled = false);
    setStatus('OUT EXPLORING');
    message(freshCartridgeBoot && cartridgeBootIntent ? cartridgeBootIntent === 'import' ? 'Save imported. Choose Continue from the game’s title screen.' : 'Cartridge restarted. Continue your in-game save or begin a new adventure.' : !freshCartridgeBoot && emulator.getAutoSaveState() ? 'Welcome back. Your last saved spot is waiting for you.' : previewSeeded ? 'Choose Continue to open the playtest save.' : 'Wake up in the guest house near Old Station. Use City Map to discover Taichung’s landmarks.');
    canvas.focus({ preventScroll: true });
    // The Play button may have scrolled the intro into view. Collapsing that
    // intro must not leave a phone looking below its newly positioned game.
    if (matchMedia('(max-width:800px), (max-width:1000px) and (max-height:540px) and (min-aspect-ratio:6/5)').matches) window.scrollTo({ top: 0, behavior: 'instant' });
    track('Game started', { from: !freshCartridgeBoot && emulator.getAutoSaveState() ? 'saved spot' : 'title screen' });
    startSaveTimer();
    cityGuide.onGameStarted();
    // Metadata is already bound to the loaded ROM; don't start a fresh network
    // round trip while the initialized native startup gate is waiting.
    onboarding?.attach(onboardingMetadata);
    // The phone may have been turned while the cartridge was still loading.
    uprightScreen.hold();
    void connectNativeLanguage(romSha256, rom.length);
    void connectNativeNavigation(romSha256, rom.length);
    connectNativeBadges();
  } catch (error) {
    showDownload();
    const reason = error instanceof Error ? error.message : 'Something went wrong while loading the game.';
    track('Game could not start', { reason });
    message(reason, true);
    setStatus('WAITING FOR YOUR ADVENTURE');
  } finally {
    starting = false;
    playButton.disabled = false;
    refreshRuntimeLabels();
  }
}

function focusPauseAction() {
  if (paused && !document.hidden && gameView.immersive && !document.querySelector('dialog[open]'))
    el<HTMLButtonElement>('resume-button').focus({ preventScroll: true });
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
  if (paused) focusPauseAction();
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
const uprightScreen = createUprightScreen({
  getState: () => ({ running, paused }),
  pause: () => setPaused(true),
  resume: () => { if (gameView.immersive && !gameView.optionsOpen && !cityGuide.isOpen) setPaused(false); },
});
const minimapSetting = document.createElement('label');
minimapSetting.className = 'minimap-setting';
minimapSetting.innerHTML = '<span id="minimap-label" data-i18n="Minimap">Minimap</span><select id="minimap-visibility" aria-labelledby="minimap-label" aria-describedby="minimap-hint"><option value="on" data-i18n="On">On</option><option value="off" data-i18n="Off">Off</option></select><small id="minimap-hint"></small>';
el('options-toolbar-slot').before(minimapSetting);
if (BOULEVARD_PREVIEW) {
  const hud = document.createElement('div');
  hud.className = 'hud-layout-options';
  hud.innerHTML = `<label class="minimap-setting"><span data-i18n="Minimap view">Minimap view</span>
    <select id="minimap-view"><option value="nearby" data-i18n="Nearby">Nearby</option>
    <option value="districts" data-i18n="Districts">Districts</option>
    <option value="citywide" data-i18n="Citywide">Citywide</option></select></label>`;
  el('options-toolbar-slot').before(hud);
}
const minimap = createMinimap({
  screen: el('screen'), toggle: el<HTMLSelectElement>('minimap-visibility'), hint: el('minimap-hint'), geometry: minimapGeometry,
  zoom: BOULEVARD_PREVIEW ? el<HTMLSelectElement>('minimap-view') : undefined,
  openGuide: () => { if (!onboarding?.blocksCityMap) cityGuide.open(el('live-minimap')); },
});
onboarding = createOnboarding({
  host: el('console'),
  onState: (state) => minimap.updateOnboarding(state),
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
  skipPreviewSave();
  bootFromCartridge = true;
  explicitCartridgeRestart = true;
  savedAt = null;
  try { localStorage.removeItem(SAVE_STAMP); } catch { /* The snapshot itself is stored separately in IndexedDB. */ }
  openGame();
}
playButton.addEventListener('click', openGame);
copyLinkButton.addEventListener('click', async () => {
  const copied = await copyText(`${location.origin}/`, el('console'));
  copyLinkButton.dataset.i18n = copied ? 'Link copied' : location.host;
  copyLinkButton.textContent = t(copyLinkButton.dataset.i18n);
});
el('resume-button').addEventListener('click', openGame);
// A modal's own close handler restores its trigger first. If the game remains
// paused, place keyboard focus on the visible Continue action afterwards.
for (const id of ['game-options', 'city-guide']) el(id).addEventListener('close', () => queueMicrotask(focusPauseAction));
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
  encounterBridge?.stop();
  minimap.updateEncounter({ status: 'discovering' });
  cityGuide.updateEncounter({ status: 'discovering' });
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
    // Drain pending writes and flush SRAM, then invalidate the owned snapshot
    // before clearing any capture safeguard. The next runtime repeats removal.
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const saveWrites = (async () => {
        await flushFilesystem();
        if (cancelSaveWrite) return;
        if (importedSave) {
          emulator!.FS.writeFile(SAVE_PATH, importedSave);
          await flushFilesystem();
        }
        discardOwnedSnapshot(ownedSnapshotPath());
        await flushFilesystem();
      })();
      await Promise.race([
        saveWrites,
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Save flush timed out.')), 8_000); }),
      ]);
    } finally { if (timeout) clearTimeout(timeout); }
    console.info('Cartridge reboot: save files flushed.');
    skipPreviewSave();
    // The user confirmed this restart/import. The snapshot deletion and latest
    // SRAM are durable, so it is safe to clear the old encounter boot safeguard.
    try { localStorage.removeItem(CAPTURE_BOOT_INTENT_KEY); } catch { /* Conservative cartridge-only fallback remains. */ }
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
    connectNativeEncounters();
    connectNativeBadges();
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
  try {
    if (!isFireRedBackupSize(file.size)) {
      message('Choose a compatible FireRed .sav file (64 KB or 128 KB, including mGBA backups).', true);
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasReadableFireRedSave(bytes)) {
      message('Choose a readable FireRed backup with a completed in-game save.', true);
      return;
    }
    if (!(await confirmAction('Import game save', 'Import this save and restart the cartridge? It will replace the current in-game save in this browser.', 'Import save'))) return;
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
  pauseResume: {
    available: () => paused && !starting && gameInputAvailable() && !el('pause-screen').hidden,
    resume: () => setPaused(false),
  },
  tutorialInteract: { available: () => !!onboarding?.canAdvanceGuide, advance: () => onboarding?.advanceGuide() },
  focus: focusGame,
  press: (button) => emulator?.buttonPress(button),
  release: (button) => emulator?.buttonUnpress(button),
});
document.addEventListener('visibilitychange', () => {
  if (restarting || confirmationOpen) return;
  if (document.hidden && running && !paused) setPaused(true);
  else if (!document.hidden) focusPauseAction();
});
window.addEventListener('pagehide', () => { languageBridge?.stop(); navigationBridge?.stop(); badgeBridge?.stop(); onboarding?.stop(); encounterBridge?.stop(); releaseInputs(); if (saveInterval) clearInterval(saveInterval); });

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
startAnalytics();
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
      const read = database.transaction(SAVE_STORE).objectStore(SAVE_STORE).get(SAVE_PATH);
      read.onerror = () => { database.close(); resolve(false); };
      read.onsuccess = () => {
        database.close();
        const bytes = read.result?.contents instanceof Uint8Array ? read.result.contents : undefined;
        if (!bytes || !hasReadableFireRedSave(bytes)) { resolve(false); return; }
        isUntouchedDemoSave(bytes).then((demo) => resolve(!demo), () => resolve(true));
      };
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
