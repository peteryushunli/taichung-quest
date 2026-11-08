import './game-display.css';

/** Suppress browser selection/callouts on the display without consuming game input. */
export function protectGameDisplay(screen: HTMLElement) {
  for (const type of ['selectstart', 'contextmenu', 'dragstart']) {
    screen.addEventListener(type, (event) => event.preventDefault(), { capture: true });
  }
}
