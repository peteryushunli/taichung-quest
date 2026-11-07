/** View changes never replace the canvas or restart the native game. */
export function createGameView(options: {
  console: HTMLElement;
  dialog: HTMLDialogElement;
  returnTarget: HTMLElement;
  getState(): { running: boolean; paused: boolean };
  pause(): void;
  resume(): void;
  release(): void;
  refresh(): void;
}) {
  let immersive = false;
  let resumeAfterOptions = false;
  let returnFocus: HTMLElement | undefined;

  function enter() {
    immersive = true;
    options.release();
    options.console.dataset.immersive = 'true';
    document.body.classList.add('game-immersive');
    document.body.classList.toggle('game-active', options.getState().running);
    // Called directly by Play/Resume's click handler, before any await. Phones
    // without this API still enter the same viewport-filling CSS game mode.
    if (document.fullscreenElement !== options.console && options.console.requestFullscreen) {
      try {
        void options.console.requestFullscreen().then(() => {
          if (!immersive && document.fullscreenElement === options.console) void document.exitFullscreen().catch(() => undefined);
        }).catch(() => undefined);
      } catch { /* CSS mode is already active. */ }
    }
    options.refresh();
  }

  function leave() {
    options.release();
    resumeAfterOptions = false;
    if (options.dialog.open) options.dialog.close();
    const state = options.getState();
    if (state.running && !state.paused) options.pause();
    immersive = false;
    delete options.console.dataset.immersive;
    document.body.classList.remove('game-immersive', 'game-active');
    if (document.fullscreenElement && document.exitFullscreen) void document.exitFullscreen().catch(() => undefined);
    options.refresh();
    options.returnTarget.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function openOptions(trigger: HTMLElement) {
    if (options.dialog.open) return;
    const state = options.getState();
    resumeAfterOptions = state.running && !state.paused;
    returnFocus = trigger;
    options.release();
    if (resumeAfterOptions) options.pause();
    options.dialog.showModal();
    options.refresh();
    options.dialog.querySelector<HTMLButtonElement>('[data-close-options]')!.focus();
  }
  options.dialog.querySelector('[data-close-options]')!.addEventListener('click', () => options.dialog.close());
  options.dialog.addEventListener('close', () => {
    options.release();
    const resume = resumeAfterOptions;
    resumeAfterOptions = false;
    if (resume && immersive && options.getState().running) options.resume();
    options.refresh();
    if (immersive) returnFocus?.focus({ preventScroll: true });
  });

  return {
    enter, leave, openOptions,
    closeOptions: () => options.dialog.close(),
    get immersive() { return immersive; },
    get optionsOpen() { return options.dialog.open; },
  };
}
