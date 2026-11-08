import { InputState, KEY_BINDINGS, dpadDirection } from './input-state';
import type { GameButton } from './input-state';

export function createGameControls(options: {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  canPlay(): boolean;
  focus(): void;
  press(button: GameButton): void;
  release(button: GameButton): void;
}) {
  const { root } = options;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-gba]')];
  const pad = root.querySelector<HTMLElement>('.dpad')!;
  const pointers = new Map<number, ({ pad: true } | { button: HTMLButtonElement }) & { pointerType: string }>();
  const state = new InputState({
    press: options.press,
    release: options.release,
    changed: (held) => {
      for (const button of buttons) button.classList.toggle('pressed', held.has(button.dataset.gba as GameButton));
      root.dataset.heldInputs = [...held].sort().join(',');
    },
  });
  function receivesKeys(target: EventTarget | null) {
    return target === options.canvas || target === document.body ||
      (target instanceof Element && root.contains(target) && !!target.closest('[data-gba]'));
  }

  function refresh() {
    const enabled = options.canPlay();
    root.dataset.active = String(enabled);
    for (const button of buttons) button.disabled = !enabled;
  }
  function clear(releaseNative = true) {
    state.clear(releaseNative);
    const captured = [...pointers.keys()];
    pointers.clear();
    for (const id of captured) releaseCapture(id);
    refresh();
  }
  function releaseCapture(id: number) {
    // A browser may already have ended the pointer during focus/lifecycle work.
    try { if (root.hasPointerCapture(id)) root.releasePointerCapture(id); } catch { /* Already released. */ }
  }
  function releasePointer(id: number) {
    if (!pointers.delete(id)) return;
    state.set(`pointer:${id}`);
    releaseCapture(id);
  }
  function direction(event: PointerEvent) {
    const rect = pad.getBoundingClientRect();
    return dpadDirection((event.clientX - rect.left) / rect.width * 2 - 1, (event.clientY - rect.top) / rect.height * 2 - 1);
  }
  function pointerButton(event: PointerEvent) {
    const owner = pointers.get(event.pointerId);
    if (!owner || !options.canPlay()) return;
    if ('pad' in owner) return direction(event);
    const rect = owner.button.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
    return owner.button.dataset.gba as GameButton;
  }
  root.addEventListener('pointerdown', (event) => {
    if (!options.canPlay() || event.button !== 0 || !(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('[data-gba]');
    if (pad.contains(event.target)) pointers.set(event.pointerId, { pad: true, pointerType: event.pointerType });
    else if (button && root.contains(button)) pointers.set(event.pointerId, { button, pointerType: event.pointerType });
    else return;
    event.preventDefault();
    options.focus();
    if (!pointers.has(event.pointerId)) return;
    // Global terminal listeners remain responsible even if capture is unavailable.
    try { root.setPointerCapture(event.pointerId); } catch { /* Use global delivery. */ }
    state.set(`pointer:${event.pointerId}`, pointerButton(event));
  });
  window.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    if (!(event.buttons & 1)) { releasePointer(event.pointerId); return; }
    event.preventDefault();
    state.set(`pointer:${event.pointerId}`, pointerButton(event));
  }, { capture: true });
  // Terminal events can land outside the controls or on a disabled/removed
  // target. Capture them before target handlers can stop their propagation.
  window.addEventListener('pointerup', event => releasePointer(event.pointerId), { capture: true });
  window.addEventListener('pointercancel', event => releasePointer(event.pointerId), { capture: true });
  window.addEventListener('lostpointercapture', event => {
    // Ignore loss of a child's implicit capture while capture moves to root.
    if (!root.hasPointerCapture(event.pointerId)) releasePointer(event.pointerId);
  }, { capture: true });
  const releaseFinalTouches = (event: TouchEvent) => {
    if (event.touches.length) return;
    // iOS may end its touch stream without delivering our pointer terminal
    // event. Touch identifiers are not pointer IDs: only the last-touch signal
    // authorizes clearing touch owners; keyboard/mouse/pen holds stay intact.
    for (const [id, pointer] of pointers) if (pointer.pointerType === 'touch') releasePointer(id);
  };
  window.addEventListener('touchend', releaseFinalTouches, { capture: true, passive: true });
  window.addEventListener('touchcancel', releaseFinalTouches, { capture: true, passive: true });
  root.addEventListener('contextmenu', (event) => event.preventDefault());

  for (const button of buttons) {
    const binding = button.dataset.gba as GameButton;
    button.addEventListener('keydown', (event) => {
      if (!['Space', 'Enter'].includes(event.code) || !options.canPlay()) return;
      event.preventDefault();
      if (!event.repeat) state.set(`key:${event.code}`, binding);
    });
    button.addEventListener('keyup', (event) => {
      if (!['Space', 'Enter'].includes(event.code)) return;
      event.preventDefault();
      state.set(`key:${event.code}`);
    });
    button.addEventListener('blur', () => {
      state.set('key:Space');
      state.set('key:Enter');
    });
    // Assistive technology may activate a button without pointer/key events.
    button.addEventListener('click', (event) => {
      if (event.detail !== 0 || !options.canPlay()) return;
      state.set(`assistive:${binding}`, binding);
      setTimeout(() => state.set(`assistive:${binding}`), 100);
    });
  }
  window.addEventListener('keydown', (event) => {
    if (!options.canPlay() || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.defaultPrevented || !receivesKeys(event.target)) return;
    const button = KEY_BINDINGS[event.code];
    if (!button) return;
    event.preventDefault();
    // After a modal, focus loss or rotation, a still-held key must be released
    // before it can drive the game again. OS repeat must not reacquire it.
    if (!event.repeat) state.set(`key:${event.code}`, button);
  });
  window.addEventListener('keyup', (event) => {
    state.set(`key:${event.code}`);
  }, { capture: true });
  document.addEventListener('focusin', (event) => { if (!receivesKeys(event.target)) clear(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  window.addEventListener('blur', () => clear());
  window.addEventListener('pagehide', () => clear());
  window.addEventListener('pageshow', () => clear());
  document.addEventListener('fullscreenchange', () => clear());
  window.addEventListener('orientationchange', () => clear());
  matchMedia('(orientation: portrait)').addEventListener('change', () => clear());
  refresh();
  return { refresh, releaseAll: () => clear(), forgetAll: () => clear(false) };
}
