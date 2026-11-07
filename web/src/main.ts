import './style.css';
import type { mGBAEmulator } from '@thenick775/mgba-wasm';
import { createCityGuide } from './city-guide';
import { getLocale, initializeLocalization, languageControl, onLocaleChange, t } from './i18n';

type Button = 'Up' | 'Down' | 'Left' | 'Right' | 'A' | 'B' | 'Start' | 'Select' | 'L' | 'R';
type RuntimeFactory = (options: { canvas: HTMLCanvasElement }) => Promise<mGBAEmulator>;
type RuntimeWindow = Window & { taichungCreateEmulator?: RuntimeFactory };

const ROM_URL = '/roms/taichung-firered.gba';
const SAVE_PATH = '/data/saves/taichung-firered.sav';
const SAVE_STAMP = 'taichung-quest-save-time';
let savedAt: string | null = null;
try { savedAt = localStorage.getItem(SAVE_STAMP); } catch { /* Storage can be disabled in private browser sessions. */ }

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

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="site-header">
    <a class="wordmark" href="/" aria-label="Taichung Quest home"><span class="brand-mark" aria-hidden="true">✳</span> TAICHUNG QUEST</a>
    <span class="header-note"><span class="live-dot"></span><span data-i18n="A TAICHUNG ADVENTURE">A TAICHUNG ADVENTURE</span></span>
    <div class="header-settings">${languageControl('interface-language')}<span class="edition"><span data-i18n="FIELD EDITION">FIELD EDITION</span> <b>001</b></span></div>
  </header>
  <main>
    <section class="intro" aria-labelledby="page-title">
      <div><p class="eyebrow" data-i18n="TAIWAN, WITH A LITTLE WONDER">TAIWAN, WITH A LITTLE WONDER</p><h1 id="page-title" data-i18n="Take the scenic route.">Take the scenic route.</h1></div>
      <p class="intro-copy" data-i18n="A pocket-sized adventure through Taichung.&#10;Slow down. Meet the neighbors. See what turns up.">A pocket-sized adventure through Taichung.<br>Slow down. Meet the neighbors. See what turns up.</p>
    </section>
    <div class="adventure-layout">
      <section class="game-column" aria-label="Playable game">
        <div class="console" id="console">
          <div class="console-top"><span><i class="power-light"></i> TAICHUNG QUEST</span><span>WEST DISTRICT · 台中西區</span></div>
          <div class="screen-bezel">
            <div class="screen" id="screen">
              <canvas id="game-canvas" width="240" height="160" tabindex="0" aria-label="Taichung Quest game screen. Arrow keys to move, Z to interact, X to go back, Enter for menu."></canvas>
              <div class="start-screen" id="start-screen">
                <div class="pixel-postcard" aria-hidden="true"><div class="pixel-cloud cloud-one"></div><div class="pixel-cloud cloud-two"></div><div class="pixel-sun"></div><div class="postcard-hill"></div><div class="pixel-path"></div><div class="pixel-tree tree-one"></div><div class="pixel-tree tree-two"></div><div class="pixel-tree tree-three"></div><div class="pixel-shop"><span></span></div><div class="pixel-person"></div></div>
                <div class="start-content"><p class="screen-eyebrow" data-i18n="YOUR NEXT LITTLE ADVENTURE">YOUR NEXT LITTLE ADVENTURE</p><h2 data-i18n="Somewhere&#10;in Taichung.">Somewhere<br>in Taichung.</h2><button class="start-button" id="play-button">${icon('play')} <span>Start exploring</span></button><p class="start-hint" data-i18n="A sunny afternoon. A whole new story.">A sunny afternoon. A whole new story.</p></div>
              </div>
              <div class="pause-screen" id="pause-screen" hidden><p class="screen-eyebrow" data-i18n="TAKE YOUR TIME">TAKE YOUR TIME</p><h2 data-i18n="A little breather.">A little breather.</h2><button class="start-button" id="resume-button">${icon('play')} <span data-i18n="Keep exploring">Keep exploring</span></button></div>
            </div>
            <div class="screen-caption"><span><i></i> <span id="game-status">READY WHEN YOU ARE</span></span><span>240 × 160 · GBA</span></div>
          </div>
          <div class="physical-controls" aria-label="Game controls">
            <div class="dpad" aria-label="Movement controls"><span class="dpad-center"></span><button data-gba="Up" class="direction up" aria-label="Move up">▲</button><button data-gba="Left" class="direction left" aria-label="Move left">◀</button><button data-gba="Right" class="direction right" aria-label="Move right">▶</button><button data-gba="Down" class="direction down" aria-label="Move down">▼</button></div>
            <div class="middle-controls"><div class="small-control-pair"><button data-gba="Select">SELECT</button><button data-gba="Start">START</button></div><span class="console-model">TC—01</span></div>
            <div class="action-buttons"><button data-gba="B" class="action b" aria-label="B button, back"><b>B</b></button><button data-gba="A" class="action a" aria-label="A button, interact"><b>A</b></button></div>
          </div>
          <div class="console-bottom"><span data-i18n="A LITTLE CURIOSITY GOES A LONG WAY">A LITTLE CURIOSITY GOES A LONG WAY</span><div class="speaker" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div></div>
        </div>
        <div class="game-navigation"><span><span data-i18n="Get to know the city.">Get to know the city.</span><small data-i18n="Real places behind the adventure.">Real places behind the adventure.</small></span><button id="city-map-button" class="city-map-button" aria-haspopup="dialog" aria-controls="city-guide">${icon('map')} <span data-i18n="City Map">City Map</span> <span class="city-map-chinese" lang="zh-Hant">城市地圖</span></button></div>
        <div class="game-toolbar" aria-label="Emulator controls">
          <div class="toolbar-group"><button id="pause-button" class="tool-button" disabled>${icon('pause')} <span>Pause</span></button><button id="sound-button" class="tool-button" disabled aria-pressed="false">${icon('sound')} <span>Sound on</span></button></div>
          <div class="toolbar-group"><button id="save-button" class="tool-button" disabled>${icon('save')} <span data-i18n="Save spot">Save spot</span></button><button id="fullscreen-button" class="tool-button icon-only" aria-label="Enter fullscreen">${icon('fullscreen')}</button><button id="restart-button" class="tool-button icon-only" disabled aria-label="Restart game">${icon('restart')}</button></div>
        </div>
        <p class="feedback" id="feedback" role="status" aria-live="polite">${savedAt ? 'Your last saved spot is waiting in this browser.' : 'No downloads. Just a little time to wander.'}</p>
      </section>
      <aside class="field-notes" aria-label="Adventure guide">
        <div class="notebook-heading"><span class="eyebrow" data-i18n="A FEW FIELD NOTES">A FEW FIELD NOTES</span><span class="note-number">NO. 01</span></div>
        <div class="destination"><span class="destination-caption" data-i18n="FIRST STOP">FIRST STOP</span><h2><span class="district-name" data-i18n="West District">West District</span><span class="district-chinese" lang="zh-Hant">西區</span></h2><p data-i18n="Leafy paths, neighborhood corners, and a tea break along the way.">Leafy paths, neighborhood corners, and a tea break along the way.</p><div class="stamp" aria-hidden="true">TAICHUNG<br><b>24° N</b><br>TAIWAN</div></div>
        <div class="note-section"><span class="note-index">01</span><div><h3 data-i18n="Follow your curiosity.">Follow your curiosity.</h3><p data-i18n="Explore the Greenway, meet the locals, and find your first little errand.">Explore the Greenway, meet the locals, and find your first little errand.</p></div></div>
        <div class="note-section"><span class="note-index">02</span><div><h3 data-i18n="Say hello.">Say hello.</h3><p><span data-i18n="Walk up to someone and press">Walk up to someone and press</span> <kbd>Z</kbd> <span data-i18n="or">or</span> <kbd>A</kbd> <span data-i18n="to see what they have to say.">to see what they have to say.</span></p></div></div>
        <div class="keyboard-guide"><h3 data-i18n="Make yourself at home.">Make yourself at home.</h3><div class="key-row"><span><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span><span data-i18n="Wander around">Wander around</span></div><div class="key-row"><span><kbd>Z</kbd> <small>/</small> <kbd>X</kbd></span><span data-i18n="Interact / back">Interact / back</span></div><div class="key-row"><span><kbd>ENTER</kbd></span><span data-i18n="Open the menu">Open the menu</span></div><p data-i18n="Touch controls work too. A little old-school, wherever you are.">Touch controls work too. A little old-school, wherever you are.</p></div>
        <details class="save-details"><summary><span data-i18n="Your saved adventures">Your saved adventures</span><span class="details-plus">+</span></summary><p data-i18n="Your spot is saved here every 20 seconds. Keep an extra backup using a game save from the in-game menu.">Your spot is saved here every 20 seconds. Keep an extra backup using a game save from the in-game menu.</p><div class="save-actions"><button id="export-button" disabled><span data-i18n="Download save">Download save</span> ${icon('arrow')}</button><button id="import-button" disabled><span data-i18n="Import save">Import save</span> ${icon('arrow')}</button></div><input type="file" id="save-file" accept=".sav" hidden></details>
        <div class="notebook-footer"><span class="tiny-sun" aria-hidden="true">✳</span><span data-i18n="MADE FOR A SUNNY AFTERNOON.">MADE FOR A SUNNY AFTERNOON.</span></div>
      </aside>
    </div>
  </main>
  <footer class="site-footer"><span>TAICHUNG QUEST <span class="footer-dot">·</span> <span data-i18n="AN EXPERIMENT IN LOCAL ADVENTURE">AN EXPERIMENT IN LOCAL ADVENTURE</span></span><span><span data-i18n="POWERED BY">POWERED BY</span> <a href="https://github.com/thenick775/mgba/tree/feature/wasm" target="_blank" rel="noreferrer">mGBA</a> <span class="footer-dot">/</span> <a href="/emulator/SOURCE.txt" target="_blank" data-i18n="RUNTIME LICENSE">RUNTIME LICENSE</a> <span class="footer-dot">/</span> <a href="/licenses/NotoSansTC-OFL.txt" target="_blank" rel="noopener" data-i18n="FONT LICENSE">FONT LICENSE</a></span></footer>
`;

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

const canvas = el<HTMLCanvasElement>('game-canvas');
const playButton = el<HTMLButtonElement>('play-button');
const feedback = el('feedback');
const status = el('game-status');
let emulator: mGBAEmulator | undefined;
let gamePath: string | undefined;
let starting = false;
let running = false;
let paused = false;
let muted = false;
let saving = false;
let saveInterval: ReturnType<typeof setInterval> | undefined;
const pressed = new Map<string, Button>();
let statusText = 'READY WHEN YOU ARE';
let feedbackText = savedAt ? 'Your last saved spot is waiting in this browser.' : 'No downloads. Just a little time to wander.';

function message(text: string, error = false) {
  feedbackText = text;
  feedback.textContent = t(text);
  feedback.classList.toggle('error', error);
}

function setStatus(text: string) { statusText = text; status.textContent = t(text); }

function focusGame() { if (running && !paused && !cityGuide.isOpen) canvas.focus({ preventScroll: true }); }

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
  for (const button of new Set(pressed.values())) emulator?.buttonUnpress(button);
  pressed.clear();
  document.querySelectorAll('[data-gba].pressed').forEach((button) => button.classList.remove('pressed'));
}

function press(source: string, button: Button) {
  if (!running || paused || !emulator || pressed.has(source)) return;
  pressed.set(source, button);
  emulator.buttonPress(button);
}

function unpress(source: string) {
  const button = pressed.get(source);
  if (!button) return;
  pressed.delete(source);
  if (![...pressed.values()].includes(button)) emulator?.buttonUnpress(button);
}

async function persist(showFeedback = false) {
  if (!emulator || !running || saving) return;
  saving = true;
  try {
    if (!emulator.forceAutoSaveState()) throw new Error('The game could not capture your spot yet.');
    await emulator.FSSync();
    try { localStorage.setItem(SAVE_STAMP, new Date().toISOString()); } catch { /* The snapshot itself is stored separately in IndexedDB. */ }
    if (showFeedback) message('Spot saved. Your next visit will pick up right here.');
  } catch (error) {
    console.error('Saving failed', error);
    message('Your spot could not be saved in this browser. Use the in-game Save menu and Download save for a backup.', true);
  } finally {
    saving = false;
  }
}

async function startGame() {
  if (starting || running) return;
  starting = true;
  playButton.disabled = true;
  playButton.querySelector('span')!.textContent = t('Packing your bag…');
  setStatus('LOADING YOUR ADVENTURE');
  message('Getting your adventure ready…');
  try {
    if (!window.crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') {
      throw new Error('This emulator needs an isolated browser tab. Open the game directly in a current browser; the server must send COOP and COEP headers.');
    }
    const response = await fetch(ROM_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('The game cartridge is still being built. Try again once the Taichung build is ready.');
    const rom = new Uint8Array(await response.arrayBuffer());
    if (rom.length < 192 || rom[0xb2] !== 0x96) throw new Error('The game cartridge is not ready yet. Build the Taichung ROM, then try again.');
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', rom));
    const buildId = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16);
    if (!emulator) {
      const createEmulator = await getRuntimeFactory();
      emulator = await createEmulator({ canvas });
      await emulator.FSInit();
      emulator.setCoreSettings({
        autoSaveStateEnable: true,
        autoSaveStateTimerIntervalSeconds: 20,
        restoreAutoSaveStateOnLoad: true,
        rewindEnable: false,
        allowOpposingDirections: false,
      });
      emulator.addCoreCallbacks({
        coreCrashedCallback: () => {
          setStatus('ADVENTURE INTERRUPTED');
          message('The game stopped unexpectedly. Restart it to return to your saved progress.', true);
        },
        saveDataUpdatedCallback: () => { void emulator?.FSSync().catch(() => message('Browser storage is unavailable. Download your save for a backup.', true)); },
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
    if (!emulator.loadGame(gamePath, SAVE_PATH)) throw new Error('The emulator could not open this game cartridge.');
    emulator.toggleInput(false);
    emulator.setVolume(muted ? 0 : 0.55);
    emulator.resumeAudio();
    void emulator.SDL2?.audioContext?.resume();
    running = true;
    paused = false;
    el('start-screen').hidden = true;
    canvas.classList.add('playing');
    document.querySelectorAll<HTMLButtonElement>('#pause-button, #sound-button, #save-button, #restart-button, #export-button, #import-button').forEach((button) => button.disabled = false);
    setStatus('OUT EXPLORING');
    message(emulator.getAutoSaveState() ? 'Welcome back. Your last saved spot is waiting for you.' : 'You’re here. Use the arrows to wander and Z to say hello.');
    canvas.focus({ preventScroll: true });
    saveInterval = setInterval(() => { if (!paused) void persist(); }, 20_000);
    cityGuide.onGameStarted();
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Something went wrong while loading the game.';
    message(reason, true);
    setStatus('WAITING FOR YOUR ADVENTURE');
  } finally {
    starting = false;
    playButton.disabled = false;
    playButton.querySelector('span')!.textContent = t('Start exploring');
  }
}

function setPaused(value: boolean) {
  if (!running || !emulator) return;
  releaseInputs();
  paused = value;
  if (paused) {
    emulator.pauseGame();
    void persist();
  } else {
    emulator.resumeGame();
    if (muted) emulator.setVolume(0);
    else { emulator.resumeAudio(); void emulator.SDL2?.audioContext?.resume(); }
    canvas.focus({ preventScroll: true });
  }
  el('pause-screen').hidden = !paused;
  el('pause-button').innerHTML = `${icon(paused ? 'play' : 'pause')} <span>${t(paused ? 'Resume' : 'Pause')}</span>`;
  setStatus(paused ? 'TAKING A BREATHER' : 'OUT EXPLORING');
}

const cityGuide = createCityGuide({
  getState: () => ({ running, paused }),
  pause: () => setPaused(true),
  resume: () => setPaused(false),
  releaseInputs,
});
el('city-map-button').addEventListener('click', () => cityGuide.open(el('city-map-button')));

playButton.addEventListener('click', () => { void startGame(); });
el('pause-button').addEventListener('click', () => setPaused(!paused));
el('resume-button').addEventListener('click', () => setPaused(false));
el('sound-button').addEventListener('click', () => {
  if (!emulator) return;
  muted = !muted;
  emulator.setVolume(muted ? 0 : 0.55);
  if (!muted && !paused) { emulator.resumeAudio(); void emulator.SDL2?.audioContext?.resume(); }
  el('sound-button').innerHTML = `${icon(muted ? 'mute' : 'sound')} <span>${t(muted ? 'Sound off' : 'Sound on')}</span>`;
  el('sound-button').setAttribute('aria-pressed', String(muted));
  focusGame();
});
el('save-button').addEventListener('click', () => { releaseInputs(); void persist(true); focusGame(); });
el('fullscreen-button').addEventListener('click', () => {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void el('console').requestFullscreen().catch(() => message('Fullscreen isn’t available in this browser. You can still explore right here.'));
  focusGame();
});
el('restart-button').addEventListener('click', () => {
  if (!emulator || !running || !confirm(t('Restart the cartridge? Your in-game save is kept, but progress since that save will restart.'))) return;
  releaseInputs();
  emulator.setCoreSettings({ restoreAutoSaveStateOnLoad: false });
  emulator.quickReload();
  emulator.setCoreSettings({ restoreAutoSaveStateOnLoad: true });
  setPaused(false);
  message('A fresh start. Your in-game save is still available from the title screen.');
});

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
  const activeGamePath = gamePath;
  if (file.size !== 131072 && file.size !== 65536) { message('Choose a compatible FireRed .sav file (64 KB or 128 KB).', true); input.value = ''; return; }
  if (!confirm(t('Import this save and restart the cartridge? It will replace the current in-game save in this browser.'))) { input.value = ''; return; }
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    releaseInputs();
    emulator.quitGame();
    emulator.FS.writeFile(SAVE_PATH, bytes);
    if (emulator.autoSaveStateName && emulator.FS.analyzePath(emulator.autoSaveStateName).exists) emulator.FS.unlink(emulator.autoSaveStateName);
    await emulator.FSSync();
    emulator.setCoreSettings({ restoreAutoSaveStateOnLoad: false });
    if (!emulator.loadGame(activeGamePath, SAVE_PATH)) throw new Error('Could not reload the game.');
    emulator.setCoreSettings({ restoreAutoSaveStateOnLoad: true });
    emulator.toggleInput(false);
    setPaused(false);
    message('Save imported. Choose Continue from the game’s title screen.');
  } catch (error) {
    console.error(error);
    message('The save could not be imported. Restart the page to reload your last saved spot.', true);
  } finally { input.value = ''; }
});

const keyboard: Record<string, Button> = {
  ArrowUp: 'Up', KeyW: 'Up', ArrowDown: 'Down', KeyS: 'Down',
  ArrowLeft: 'Left', KeyA: 'Left', ArrowRight: 'Right', KeyD: 'Right',
  KeyZ: 'A', KeyX: 'B', Enter: 'Start', ShiftRight: 'Select', Backspace: 'Select', KeyQ: 'L', KeyE: 'R',
};
window.addEventListener('keydown', (event) => {
  if (cityGuide.isOpen) return;
  if (event.ctrlKey || event.metaKey || event.altKey || (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'SUMMARY', 'A'].includes(event.target.tagName))) return;
  const button = keyboard[event.code];
  if (!button || !running || paused) return;
  event.preventDefault();
  press(`key:${event.code}`, button);
});
window.addEventListener('keyup', (event) => { if (cityGuide.isOpen) return; if (keyboard[event.code]) { if (running) event.preventDefault(); unpress(`key:${event.code}`); } });
document.querySelectorAll<HTMLButtonElement>('[data-gba]').forEach((button) => {
  const input = button.dataset.gba as Button;
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    if (!running || paused) return;
    focusGame();
    button.setPointerCapture(event.pointerId);
    button.classList.add('pressed');
    press(`pointer:${event.pointerId}`, input);
  });
  const release = (event: PointerEvent) => { button.classList.remove('pressed'); unpress(`pointer:${event.pointerId}`); };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
  button.addEventListener('keydown', (event) => { if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); button.classList.add('pressed'); press(`button:${input}`, input); } });
  button.addEventListener('keyup', (event) => { if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); button.classList.remove('pressed'); unpress(`button:${input}`); } });
  button.addEventListener('contextmenu', (event) => event.preventDefault());
});
window.addEventListener('blur', releaseInputs);
document.addEventListener('visibilitychange', () => { if (document.hidden && running && !paused) setPaused(true); });
window.addEventListener('pagehide', () => { releaseInputs(); if (saveInterval) clearInterval(saveInterval); });

// These labels describe the browser player and City Map. The cartridge's own
// language is selected inside the game; changing this control never resets it.
document.querySelectorAll<HTMLElement>('[aria-label]').forEach((element) => {
  if (!element.hasAttribute('data-i18n-label') && !element.matches('[data-locale-select]')) element.dataset.i18nLabel = element.getAttribute('aria-label')!;
});
function refreshRuntimeLabels() {
  setStatus(statusText);
  message(feedbackText, feedback.classList.contains('error'));
  playButton.querySelector('span')!.textContent = t(starting ? 'Packing your bag…' : 'Start exploring');
  el('pause-button').innerHTML = `${icon(paused ? 'play' : 'pause')} <span>${t(paused ? 'Resume' : 'Pause')}</span>`;
  el('sound-button').innerHTML = `${icon(muted ? 'mute' : 'sound')} <span>${t(muted ? 'Sound off' : 'Sound on')}</span>`;
  document.title = getLocale() === 'zh-Hant' ? 'Taichung Quest · 台中小冒險' : 'Taichung Quest · A little adventure';
}
onLocaleChange(refreshRuntimeLabels);
initializeLocalization();
refreshRuntimeLabels();

// A compact, read-only hook for local game verification; no gameplay state is sent anywhere.
Object.assign(window, { taichungQuest: {
  get running() { return running; },
  get paused() { return paused; },
  get emulator() { return emulator; },
  get guideOpen() { return cityGuide.isOpen; },
} });
