import { InputState, KEY_BINDINGS, dpadDirection } from './input-state';
import type { GameButton } from './input-state';

export function createGameControls(options: {
  root: HTMLElement;
  canPlay(): boolean;
  focus(): void;
  press(button: GameButton): void;
  release(button: GameButton): void;
}) {
  const { root } = options;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-gba]')];
  const pad = root.querySelector<HTMLElement>('.dpad')!;
  const pointers = new Map<number, { pad: true } | { button: HTMLButtonElement }>();
  const state = new InputState({
    press: options.press,
    release: options.release,
    changed: (held) => {
      for (const button of buttons) button.classList.toggle('pressed', held.has(button.dataset.gba as GameButton));
      root.dataset.heldInputs = [...held].sort().join(',');
    },
  });

  function refresh() {
    const enabled = options.canPlay();
    root.dataset.active = String(enabled);
    for (const button of buttons) button.disabled = !enabled;
  }
  function clear(releaseNative = true) {
    state.clear(releaseNative);
    const captured = [...pointers.keys()];
    pointers.clear();
    for (const id of captured) if (root.hasPointerCapture(id)) root.releasePointerCapture(id);
    refresh();
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
    if (pad.contains(event.target)) pointers.set(event.pointerId, { pad: true });
    else if (button && root.contains(button)) pointers.set(event.pointerId, { button });
    else return;
    event.preventDefault();
    options.focus();
    root.setPointerCapture(event.pointerId);
    state.set(`pointer:${event.pointerId}`, pointerButton(event));
  });
  root.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    event.preventDefault();
    state.set(`pointer:${event.pointerId}`, pointerButton(event));
  });
  const releasePointer = (event: PointerEvent) => {
    state.set(`pointer:${event.pointerId}`);
    pointers.delete(event.pointerId);
  };
  root.addEventListener('pointerup', releasePointer);
  root.addEventListener('pointercancel', releasePointer);
  root.addEventListener('lostpointercapture', releasePointer);
  root.addEventListener('contextmenu', (event) => event.preventDefault());

  for (const button of buttons) {
    const binding = button.dataset.gba as GameButton;
    button.addEventListener('keydown', (event) => {
      if (!['Space', 'Enter'].includes(event.code) || !options.canPlay()) return;
      event.preventDefault();
      state.set(`control:${binding}`, binding);
    });
    button.addEventListener('keyup', (event) => {
      if (!['Space', 'Enter'].includes(event.code)) return;
      event.preventDefault();
      state.set(`control:${binding}`);
    });
    button.addEventListener('blur', () => state.set(`control:${binding}`));
    // Assistive technology may activate a button without pointer/key events.
    button.addEventListener('click', (event) => {
      if (event.detail !== 0 || !options.canPlay()) return;
      state.set(`assistive:${binding}`, binding);
      setTimeout(() => state.set(`assistive:${binding}`), 100);
    });
  }
  window.addEventListener('keydown', (event) => {
    if (!options.canPlay() || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof Element && event.target.closest('input, textarea, select, button, summary, a, [contenteditable="true"]')) return;
    const button = KEY_BINDINGS[event.code];
    if (!button) return;
    event.preventDefault();
    state.set(`key:${event.code}`, button);
  });
  window.addEventListener('keyup', (event) => {
    if (!KEY_BINDINGS[event.code]) return;
    state.set(`key:${event.code}`);
  });
  window.addEventListener('blur', () => clear());
  window.addEventListener('orientationchange', () => clear());
  matchMedia('(orientation: portrait)').addEventListener('change', () => clear());
  refresh();
  return { refresh, releaseAll: () => clear(), forgetAll: () => clear(false) };
}
