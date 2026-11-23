// A phone held sideways: wide, short and touched with a finger. Tablets are taller.
const PHONE_SIDEWAYS = '(orientation: landscape) and (max-height: 540px) and (pointer: coarse)';

/** Split screen can make an upright phone's window wide and short, so a browser that
 * says the display itself is upright wins over the shape of the window. */
export function isSideways(wideAndShort: boolean, displayType?: string) {
  return wideAndShort && !displayType?.startsWith('portrait');
}

/** Android browsers can hold portrait while a page is fullscreen; iPhones cannot. */
export function lockPhoneUpright() {
  if (!matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) >= 600) return;
  const orientation = screen.orientation as (ScreenOrientation & { lock?: (type: string) => Promise<void> }) | undefined;
  try { void orientation?.lock?.('portrait').catch(() => undefined); } catch { /* The upright screen below still covers it. */ }
}

/** The site has no landscape phone view. Turning the phone covers it and holds the game. */
export function createUprightScreen(game: {
  getState(): { running: boolean; paused: boolean };
  pause(): void;
  resume(): void;
}) {
  const query = matchMedia(PHONE_SIDEWAYS);
  const panel = document.createElement('div');
  panel.className = 'upright-screen';
  panel.setAttribute('role', 'alert');
  // Manual popovers join the top layer, above fullscreen and any open dialog.
  panel.setAttribute('popover', 'manual');
  panel.innerHTML = `<svg viewBox="0 0 26 40" shape-rendering="crispEdges" aria-hidden="true">
      <path fill="#7b8975" d="M2 0h22v1h1v1h1v34h-2v2h-2v2H2v-1H1v-1H0V2h1V1h1z"/><path fill="#e6e9dd" d="M2 1h22v1h1v33h-2v2h-2v2H2v-1H1V2h1z"/>
      <path fill="#5b6468" d="M3 4h20v15H3z"/><path fill="#a9d3df" d="M5 6h16v11H5z"/><path fill="#e7ddb9" d="M5 14h16v3H5z"/><path fill="#c9503a" d="M9 10h8v4H9z"/><path fill="#4a5a6e" d="M10 9h6v1h-6zM12 7h2v2h-2z"/>
      <path fill="#3d5646" d="M5 22h3v3h3v3H8v3H5v-3H2v-3h3z"/><path fill="#d47854" d="M20 22h4v4h-4z"/><path fill="#788b72" d="M15 25h4v4h-4z"/><path fill="#adb5a3" d="M8 34h4v1H8zm6 0h4v1h-4z"/>
    </svg>
    <div><h2 data-i18n="Turn your phone upright">Turn your phone upright</h2><p data-i18n="Taichung Quest is played upright, like a handheld.">Taichung Quest is played upright, like a handheld.</p></div>`;
  document.body.append(panel);

  let open = false;
  let resumeWhenUpright = false;
  function hold() {
    const { running, paused } = game.getState();
    if (!open || !running || paused) return;
    resumeWhenUpright = true;
    game.pause();
  }
  function update() {
    const sideways = isSideways(query.matches, screen.orientation?.type);
    if (sideways === open) return;
    open = sideways;
    panel.toggleAttribute('data-open', open);
    try { if (open) panel.showPopover(); else panel.hidePopover(); } catch { /* Older browsers show it as a fixed layer. */ }
    if (open) hold();
    else if (resumeWhenUpright) { resumeWhenUpright = false; game.resume(); }
  }
  // An open dialog makes everything outside it inert, so taps would reach it through the cover.
  for (const type of ['pointerdown', 'click'])
    window.addEventListener(type, (event) => { if (open) { event.preventDefault(); event.stopPropagation(); } }, { capture: true });
  query.addEventListener('change', update);
  screen.orientation?.addEventListener('change', update);
  update();
  return { hold, get open() { return open; } };
}
