import { InputState, KEY_BINDINGS, dpadDirection } from './input-state';
import type { GameButton } from './input-state';

/** CSS pixels around a control that still count as a finger being on it. The d-pad gets more,
 * so a thumb rolling just off its edge keeps its hold; A and B sit close, so they get little. */
const PAD_SLACK = 48;
const BUTTON_SLACK = 8;

export function createGameControls(options: {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  canPlay(): boolean;
  focus(): void;
  press(button: GameButton): void;
  release(button: GameButton): void;
  tutorialInteract?: { available(): boolean; advance(): void };
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
    for (const button of buttons) button.disabled = !enabled && !(button.dataset.gba === 'A' && options.tutorialInteract?.available());
  }
  function tutorialInteract(button: GameButton | undefined) {
    if (button !== 'A' || !options.tutorialInteract?.available()) return false;
    options.tutorialInteract.advance();
    refresh();
    return true;
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
    if (event.button !== 0 || !(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('[data-gba]');
    if (!options.canPlay()) {
      if (button && root.contains(button) && tutorialInteract(button.dataset.gba as GameButton)) event.preventDefault();
      return;
    }
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
  const reconcileTouches = (event: TouchEvent) => {
    if (!pointers.size) return;
    // iOS (Safari and Chrome alike) can end or hijack a touch, for a long-press
    // callout or a system gesture, without any pointer terminal event. Touch
    // identifiers are not pointer IDs, so check geometry instead: a touch hold
    // stays only while some live finger is still over its pad or button. Any
    // finger activity re-checks, so a stuck hold clears on the next tap.
    // Keyboard, mouse and pen holds are never touched here.
    const live = [...event.touches];
    for (const [id, pointer] of pointers) {
      if (pointer.pointerType !== 'touch') continue;
      const rect = ('pad' in pointer ? pad : pointer.button).getBoundingClientRect();
      const slack = 'pad' in pointer ? PAD_SLACK : BUTTON_SLACK;
      const held = live.some((touch) => touch.clientX >= rect.left - slack && touch.clientX <= rect.right + slack
        && touch.clientY >= rect.top - slack && touch.clientY <= rect.bottom + slack);
      if (!held) releasePointer(id);
    }
  };
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const) {
    window.addEventListener(type, reconcileTouches, { capture: true, passive: true });
  }
  // A long press on a control must never start text selection, the copy/search
  // callout or the magnifier: each of those takes the touch away mid-hold.
  root.addEventListener('touchstart', (event) => {
    if (event.target instanceof Element && (pad.contains(event.target) || event.target.closest('[data-gba]'))) event.preventDefault();
  }, { passive: false });
  for (const type of ['contextmenu', 'selectstart', 'dragstart'] as const) root.addEventListener(type, (event) => event.preventDefault());

  for (const button of buttons) {
    const binding = button.dataset.gba as GameButton;
    button.addEventListener('keydown', (event) => {
      if (!['Space', 'Enter'].includes(event.code)) return;
      if (!options.canPlay()) {
        if (binding === 'A' && options.tutorialInteract?.available()) {
          event.preventDefault();
          if (!event.repeat) tutorialInteract(binding);
        }
        return;
      }
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
      if (event.detail !== 0) return;
      if (!options.canPlay()) { tutorialInteract(binding); return; }
      state.set(`assistive:${binding}`, binding);
      setTimeout(() => state.set(`assistive:${binding}`), 100);
    });
  }
  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.defaultPrevented || !receivesKeys(event.target)) return;
    const button = KEY_BINDINGS[event.code];
    if (!button) return;
    if (!options.canPlay()) {
      if (button === 'A' && options.tutorialInteract?.available()) {
        event.preventDefault();
        if (!event.repeat) tutorialInteract(button);
      }
      return;
    }
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
