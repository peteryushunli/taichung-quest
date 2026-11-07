export type GameButton = 'Up' | 'Down' | 'Left' | 'Right' | 'A' | 'B' | 'Start' | 'Select' | 'L' | 'R';

// F/D are the player's chosen actions. D must never be a movement alias.
export const KEY_BINDINGS: Record<string, GameButton> = {
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  KeyW: 'Up', KeyS: 'Down', KeyA: 'Left',
  KeyF: 'A', KeyD: 'B', KeyZ: 'A', KeyX: 'B',
  KeyM: 'Start', Enter: 'Start', ShiftRight: 'Select', Backspace: 'Select', KeyQ: 'L', KeyE: 'R',
};

export function dpadDirection(x: number, y: number): GameButton | undefined {
  if (Math.abs(x) > 1 || Math.abs(y) > 1 || Math.max(Math.abs(x), Math.abs(y)) < .32) return;
  return Math.abs(x) > Math.abs(y) ? (x < 0 ? 'Left' : 'Right') : (y < 0 ? 'Up' : 'Down');
}

/** Each key/pointer owns its hold. Releasing one finger cannot release another. */
type InputCallbacks = { press(button: GameButton): void; release(button: GameButton): void; changed(buttons: Set<GameButton>): void };
export class InputState {
  private held = new Map<string, GameButton>();
  private callbacks: InputCallbacks;
  constructor(callbacks: InputCallbacks) { this.callbacks = callbacks; }

  get buttons() { return new Set(this.held.values()); }

  set(source: string, button?: GameButton) {
    const previous = this.held.get(source);
    if (previous === button) return;
    if (previous) {
      this.held.delete(source);
      if (!this.buttons.has(previous)) this.callbacks.release(previous);
    }
    if (button) {
      const alreadyHeld = this.buttons.has(button);
      this.held.set(source, button);
      if (!alreadyHeld) this.callbacks.press(button);
    }
    this.callbacks.changed(this.buttons);
  }

  clear(releaseNative = true) {
    const buttons = this.buttons;
    this.held.clear();
    if (releaseNative) for (const button of buttons) this.callbacks.release(button);
    this.callbacks.changed(this.buttons);
  }
}
