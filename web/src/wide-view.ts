import './wide-view.css';
import { CartridgeMaps } from './rom-maps';
import type { WorldPixels } from './rom-maps';
import type { NavigationState } from './navigation-bridge';
import { t } from './i18n';
import { ACQUIRE_RADIUS, FOCUS_DELAY_MS, GBA_H, GBA_W, GOOD_MATCH, LOST_FRAMES, MIN_MATCH, PAD, TRACK_RADIUS, VIEW_PREFERENCE, ZOOM, isViewMode, readViewPreference, registerFrame, samplePoints, wideGeometry } from './wide-view-model';

/** Wide view: the live 240×160 picture stays untouched in the middle, and the
 * browser paints the surrounding map from the cartridge's own tiles. The
 * camera offset comes from matching each live frame against those tiles, so
 * no game memory is read for it and nothing is written. */

type FrameTap = { enabled: boolean };
/** Read each finished emulator frame right after it is drawn to the page.
 * Reading later is unreliable because the drawing buffer is not preserved. */
function tapFrames(canvas: HTMLCanvasElement, onFrame: (frame: Uint32Array) => void): FrameTap | undefined {
  const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGL2RenderingContext | WebGLRenderingContext | null;
  if (!gl) return;
  const bytes = new Uint8Array(GBA_W * GBA_H * 4), raw = new Uint32Array(bytes.buffer), frame = new Uint32Array(GBA_W * GBA_H);
  const tap: FrameTap = { enabled: false };
  const context = gl as unknown as Record<string, (...args: unknown[]) => void>;
  for (const name of ['drawArrays', 'drawElements']) {
    const draw = context[name].bind(gl);
    context[name] = (...args: unknown[]) => {
      draw(...args);
      if (!tap.enabled || gl.drawingBufferWidth !== GBA_W || gl.drawingBufferHeight !== GBA_H || gl.getParameter(gl.FRAMEBUFFER_BINDING)) return;
      gl.readPixels(0, 0, GBA_W, GBA_H, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
      for (let y = 0; y < GBA_H; y++) frame.set(raw.subarray((GBA_H - 1 - y) * GBA_W, (GBA_H - y) * GBA_W), y * GBA_W);
      onFrame(frame);
    };
  }
  return tap;
}

export function createWideView(options: {
  console: HTMLElement; screen: HTMLElement; canvas: HTMLCanvasElement;
  select: HTMLSelectElement; hint: HTMLElement;
  isActive(): boolean;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}) {
  let storage = options.storage;
  if (!storage) { try { storage = localStorage; } catch { /* the choice still works for this visit */ } }
  let mode = readViewPreference(location.search, storage, matchMedia('(pointer: coarse)').matches);
  let navigation: NavigationState = { phase: 'unavailable' };
  let cartridge: Uint8Array | undefined;
  let maps: CartridgeMaps | undefined;
  let mapsFailed = false;
  let tap: FrameTap | undefined;
  let running = false;
  let world: (WorldPixels & { canvas: HTMLCanvasElement }) | undefined;
  let lock: { x: number; y: number } | undefined;
  let painted: { x: number; y: number } | undefined;
  let lostFrames = 0;
  let unfocusedAt = 0;
  let geometry = wideGeometry(GBA_W, GBA_H, 1);
  const samples = samplePoints();
  const debug = new URLSearchParams(location.search).has('view-debug');
  const surround = document.createElement('canvas');
  surround.className = 'wide-surround';
  surround.setAttribute('aria-hidden', 'true');
  options.screen.prepend(surround);
  const paint = surround.getContext('2d', { alpha: false })!;
  const spacer = document.createElement('div');
  spacer.className = 'wide-spacer';
  spacer.setAttribute('aria-hidden', 'true');
  options.console.querySelector('.physical-controls')?.after(spacer);

  options.select.value = mode;
  options.select.addEventListener('change', () => {
    if (!isViewMode(options.select.value)) return;
    mode = options.select.value;
    try { storage?.setItem(VIEW_PREFERENCE, mode); } catch { /* the choice still works for this visit */ }
    apply();
  });

  // The opening tutorial aligns its coach to the classic picture, and the
  // surround needs the live position packet to know which map is on screen.
  const suspended = () => !running || navigation.phase === 'unavailable' || !!options.screen.querySelector('.outdoor-coach[open]');
  const wide = () => mode !== 'classic' && !suspended();

  function apply() {
    const on = wide();
    if (on) options.console.dataset.view = mode; else delete options.console.dataset.view;
    options.hint.textContent = t(mode === 'classic' ? 'The Game Boy picture on its own.' : 'More of the map around the game. People and animation show only in the middle.');
    if (on && !tap && running) tap = tapFrames(options.canvas, onFrame);
    if (tap) tap.enabled = on;
    if (!on) release();
    layout();
  }

  function release() {
    lock = undefined; painted = undefined; lostFrames = 0; unfocusedAt = 0;
    surround.classList.remove('locked');
    options.screen.classList.remove('focused');
  }

  function layout() {
    const style = options.screen.style;
    if (!wide()) {
      for (const name of ['--gba-x', '--gba-y', '--gba-w', '--gba-h', '--gba-focus']) style.removeProperty(name);
      return;
    }
    const width = options.screen.clientWidth, height = options.screen.clientHeight;
    if (!width || !height) return;
    geometry = wideGeometry(width, height, ZOOM[mode]);
    const { scale, marginX, marginY, cols, rows, fit } = geometry;
    const left = (width - cols * scale) / 2, top = (height - rows * scale) / 2;
    if (surround.width !== cols || surround.height !== rows) { surround.width = cols; surround.height = rows; painted = undefined; }
    Object.assign(surround.style, { left: `${left}px`, top: `${top}px`, width: `${cols * scale}px`, height: `${rows * scale}px` });
    style.setProperty('--gba-x', `${left + marginX * scale}px`);
    style.setProperty('--gba-y', `${top + marginY * scale}px`);
    style.setProperty('--gba-w', `${GBA_W * scale}px`);
    style.setProperty('--gba-h', `${GBA_H * scale}px`);
    style.setProperty('--gba-focus', String(fit / scale));
    if (lock) draw(true);
  }

  function ensureWorld() {
    if (navigation.phase !== 'live' || !navigation.snapshot || !maps) return world;
    const { mapGroup, mapNumber } = navigation.snapshot;
    const key = `${mapGroup}.${mapNumber}.${PAD}`;
    if (world?.key === key) return world;
    const pixels = maps.world(mapGroup, mapNumber, PAD);
    if (!pixels) return world;
    const canvas = document.createElement('canvas');
    canvas.width = pixels.width; canvas.height = pixels.height;
    canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(pixels.pixels.buffer as ArrayBuffer), pixels.width, pixels.height), 0, 0);
    world = { ...pixels, canvas };
    lock = undefined;
    return world;
  }

  function draw(force = false) {
    if (!world || !lock || (!force && painted?.x === lock.x && painted.y === lock.y)) return;
    paint.drawImage(world.canvas, lock.x - geometry.marginX, lock.y - geometry.marginY, geometry.cols, geometry.rows, 0, 0, geometry.cols, geometry.rows);
    painted = { ...lock };
  }

  function onFrame(frame: Uint32Array) {
    if (!wide() || !options.isActive()) { if (lock) release(); return; }
    if (!maps && !mapsFailed) {
      try { maps = cartridge ? new CartridgeMaps(cartridge) : undefined; } catch (error) { mapsFailed = true; console.info('Wide view map tables unavailable:', error); }
    }
    const current = ensureWorld();
    if (debug) options.screen.dataset.wideState = `${navigation.phase} maps:${!!maps} world:${current?.key ?? '-'}`;
    if (!current) return;
    let found = lock ? registerFrame(frame, current, lock.x, lock.y, TRACK_RADIUS, samples) : undefined;
    if ((!found || found.match < GOOD_MATCH) && navigation.phase === 'live' && navigation.snapshot) {
      // The field camera centres the player's tile: 7 tiles left, 4.5 above.
      const guessX = (current.pad + navigation.snapshot.x) * 16 - 112, guessY = (current.pad + navigation.snapshot.y) * 16 - 72;
      const wider = registerFrame(frame, current, guessX, guessY, ACQUIRE_RADIUS, samples);
      if (wider && (!found || wider.match > found.match)) found = wider;
    }
    if (debug) options.screen.dataset.wideMatch = `${current.key} ${found ? `${found.x},${found.y} ${found.match.toFixed(2)}` : 'none'}`;
    if (found && found.match >= MIN_MATCH) {
      lock = { x: found.x, y: found.y };
      lostFrames = 0;
      draw();
      surround.classList.add('locked');
    } else if (lock && ++lostFrames > LOST_FRAMES) release();
    focus();
  }

  /** B and C bring the picture back to full size for menus, battles and
   * transitions, so their text stays as readable as today. */
  function focus() {
    const field = navigation.phase === 'live' && !!lock;
    const now = performance.now();
    if (field) unfocusedAt = 0; else if (!unfocusedAt) unfocusedAt = now;
    options.screen.classList.toggle('focused', wide() && ZOOM[mode] < 1 && !!unfocusedAt && now - unfocusedAt > FOCUS_DELAY_MS);
  }

  new ResizeObserver(() => layout()).observe(options.screen);
  apply();

  return {
    /** The loaded cartridge bytes (read-only) and whether the game is running. */
    setCartridge(rom: Uint8Array) { if (cartridge !== rom) { cartridge = rom; maps = undefined; mapsFailed = false; world = undefined; release(); } },
    setRunning(value: boolean) { if (running !== value) { running = value; apply(); } },
    update(state: NavigationState) {
      const wasSuspended = suspended();
      navigation = state;
      if (suspended() !== wasSuspended) apply(); else focus();
    },
    refresh() { apply(); },
    get mode() { return mode; },
  };
}
