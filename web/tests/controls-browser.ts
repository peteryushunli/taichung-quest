import '../src/controls.css';
import { createGameControls } from '../src/game-controls';
import { createGameView } from '../src/game-view';
import { protectGameDisplay } from '../src/game-display';

const root = document.querySelector<HTMLElement>('.physical-controls')!;
const canvas = document.querySelector('canvas')!;
const pad = document.querySelector<HTMLElement>('.dpad')!;
const action = root.querySelector<HTMLButtonElement>('[data-gba="A"]')!;
const back = root.querySelector<HTMLButtonElement>('[data-gba="B"]')!;
const results = document.querySelector<HTMLElement>('#results')!;
const run = document.querySelector<HTMLButtonElement>('#run')!;
const events: string[] = [];
let enabled = true;
let guideAvailable = false;
let guideAdvances = 0;
const captured = new Set<number>();
// Synthetic PointerEvents have no OS pointer to capture. Keep all other DOM
// listeners unchanged and make this boundary explicit in the fixture's UI.
root.setPointerCapture = (id) => { captured.add(id); };
root.hasPointerCapture = (id) => captured.has(id);
root.releasePointerCapture = (id) => { captured.delete(id); };
const controls = createGameControls({
  root, canvas, canPlay: () => enabled, focus: () => canvas.focus(),
  tutorialInteract: { available: () => guideAvailable, advance() { guideAdvances++; guideAvailable = false; } },
  press: (button) => events.push(`+${button}`), release: (button) => events.push(`-${button}`),
});
function key(type: string, code: string, target: Element = canvas, repeat = false) {
  const event = new KeyboardEvent(type, { code, bubbles: true, cancelable: true, repeat });
  target.dispatchEvent(event);
  return event;
}
function pointer(type: string, id: number, target: Element, x = .5, y = .5, pointerType = 'touch') {
  const rect = target.getBoundingClientRect();
  if (['pointerup', 'pointercancel', 'lostpointercapture'].includes(type)) captured.delete(id);
  target.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType, button: 0, buttons: type === 'pointerup' ? 0 : 1,
    clientX: rect.left + rect.width * x, clientY: rect.top + rect.height * y, bubbles: true, cancelable: true }));
}
/** A live finger on `target` at a fraction of its box, as a TouchEvent's touches list carries it. */
function finger(identifier: number, target: Element, x = .5, y = .5) {
  const rect = target.getBoundingClientRect();
  return new Touch({ identifier, target, clientX: rect.left + rect.width * x, clientY: rect.top + rect.height * y });
}
function equal(actual: unknown, expected: unknown) {
  if (actual instanceof Node || expected instanceof Node) {
    if (actual !== expected) throw new Error('Expected the original DOM node or focus target');
    return;
  }
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function held(value: string) { equal(root.dataset.heldInputs, value); }

run.addEventListener('click', async () => {
  run.disabled = true;
  const lines: string[] = [];
  async function check(name: string, test: () => void | Promise<void>) {
    enabled = true; guideAvailable = false; guideAdvances = 0;
    controls.releaseAll();
    events.length = 0;
    canvas.focus();
    try { await test(); lines.push(`PASS ${name}`); }
    catch (error) { lines.push(`FAIL ${name}: ${error}`); }
    results.textContent = lines.join('\n');
  }
  await check('F confirms, D only goes back, arrows move', () => {
    for (const code of ['KeyF', 'KeyD', 'ArrowRight']) { key('keydown', code); key('keyup', code); }
    equal(events, ['+A', '-A', '+B', '-B', '+Right', '-Right']);
  });
  await check('game display blocks selection, callouts and dragging without consuming clicks or keys', () => {
    const display = document.createElement('div');
    display.className = 'screen';
    display.innerHTML = '<button><svg><text>Fine Arts</text></svg><span>Fine Arts</span></button><button data-next-tip>A / Continue</button>';
    document.body.append(display);
    protectGameDisplay(display);
    let clicks = 0;
    for (const button of display.querySelectorAll('button')) button.addEventListener('click', () => clicks++);
    try {
      for (const target of display.querySelectorAll('text, span, [data-next-tip]')) {
        const style = getComputedStyle(target);
        equal(style.userSelect, 'none');
        equal(style.getPropertyValue('-webkit-user-select'), 'none');
        for (const type of ['selectstart', 'contextmenu', 'dragstart']) {
          const event = new Event(type, { bubbles: true, cancelable: true });
          target.dispatchEvent(event);
          equal(event.defaultPrevented, true);
          const outside = new Event(type, { bubbles: true, cancelable: true });
          document.querySelector('input')!.dispatchEvent(outside);
          equal(outside.defaultPrevented, false);
        }
      }
      for (const button of display.querySelectorAll('button')) button.click();
      equal(clicks, 2);
      const parent = canvas.parentElement!, next = canvas.nextSibling;
      display.append(canvas);
      try {
        canvas.focus();
        equal(document.activeElement, canvas);
        key('keydown', 'KeyF'); key('keyup', 'KeyF');
        equal(events, ['+A', '-A']);
      } finally { parent.insertBefore(canvas, next); }
    } finally { display.remove(); }
  });
  await check('tutorial Interact routes F, touch and assistive activation without native input or pending repeats', () => {
    enabled = false; guideAvailable = true; controls.refresh();
    equal(action.disabled, false); equal(back.disabled, true);
    key('keydown', 'KeyD'); key('keydown', 'ArrowRight');
    key('keydown', 'KeyF', canvas, true); equal(guideAdvances, 0);
    key('keydown', 'KeyF'); equal(guideAdvances, 1); equal(action.disabled, true);
    key('keydown', 'KeyF'); pointer('pointerdown', 70, action);
    equal(guideAdvances, 1); equal(events, []); held('');
    guideAvailable = true; controls.refresh();
    pointer('pointerdown', 71, action); pointer('pointerup', 71, root);
    equal(guideAdvances, 2); equal(events, []); held('');
    guideAvailable = true; controls.refresh();
    action.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    equal(guideAdvances, 3); equal(events, []);
    guideAvailable = true; controls.refresh();
    key('keydown', 'Enter', action); key('keyup', 'Enter', action);
    equal(guideAdvances, 4); equal(events, []);
    enabled = true; controls.refresh();
    key('keydown', 'KeyF', canvas, true); held('');
    key('keyup', 'KeyF'); key('keydown', 'KeyF'); key('keyup', 'KeyF');
    equal(events, ['+A', '-A']);
  });
  await check('two pointers and a key hold independently, with directional drag', () => {
    pointer('pointerdown', 1, pad, .5, .1);
    pointer('pointerdown', 2, action);
    key('keydown', 'KeyF');
    pointer('pointercancel', 2, root);
    held('A,Up');
    pointer('pointermove', 1, pad, .9, .5);
    held('A,Right');
    pointer('pointerup', 1, root);
    held('A');
    key('keyup', 'KeyF');
    held('');
    equal(events, ['+Up', '+A', '-Up', '+Right', '-Right', '-A']);
  });
  await check('lost capture, center and outside drags release the right source', () => {
    pointer('pointerdown', 3, pad, .1, .5);
    pointer('pointermove', 3, pad, .5, .5);
    held('');
    pointer('pointermove', 3, pad, .9, .5);
    pointer('pointermove', 3, pad, 1.1, .5);
    held('');
    pointer('pointerdown', 4, back);
    pointer('lostpointercapture', 4, root);
    held('');
    equal(events, ['+Left', '-Left', '+Right', '-Right', '+B', '-B']);
  });
  await check('off-root pointerup clears native Right and its pressed appearance even when bubbling is stopped', () => {
    pointer('pointerdown', 70, pad, .9, .5);
    held('Right'); equal(root.querySelector('[data-gba="Right"]')!.classList.contains('pressed'), true);
    document.body.addEventListener('pointerup', event => event.stopPropagation(), { once: true });
    pointer('pointerup', 70, document.body);
    held(''); equal(root.querySelector('[data-gba="Right"]')!.classList.contains('pressed'), false);
    equal(events, ['+Right', '-Right']);
  });
  await check('off-root cancellation and capture loss clear only the ending owner, including a disabled target', () => {
    pointer('pointerdown', 71, pad, .9, .5);
    pointer('pointerdown', 72, action);
    action.disabled = true;
    pointer('pointercancel', 71, document.body);
    held('A');
    pointer('lostpointercapture', 72, document.body);
    held(''); equal(action.classList.contains('pressed'), false);
    pointer('pointerdown', 80, pad, .9, .5);
    // A child's implicit capture can be lost when capture transfers to root.
    pad.dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 80, bubbles: true }));
    held('Right');
    pointer('pointerup', 80, document.body); held('');
    equal(events, ['+Right', '+A', '-Right', '-A', '+Right', '-Right']);
  });
  await check('a lifted finger releases its hold even without its pointer event, and never another finger\'s', () => {
    pointer('pointerdown', 73, pad, .9, .5);
    pointer('pointerdown', 74, action);
    // Touch.identifier is independent of pointerId. Do not assume they match.
    const rightTouch = finger(901, pad, .9, .5);
    const actionTouch = finger(902, action);
    document.body.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [actionTouch], changedTouches: [rightTouch] }));
    held('A'); // No finger is left on the pad; the finger still on A keeps A.
    pointer('pointerup', 73, document.body);
    held('A'); equal(root.querySelector('[data-gba="Right"]')!.classList.contains('pressed'), false);
    document.body.dispatchEvent(new TouchEvent('touchcancel', { bubbles: true, touches: [], changedTouches: [actionTouch] }));
    held(''); equal(events, ['+Right', '+A', '-Right', '-A']);
  });
  await check('a touch hold whose finger vanished without any end event clears on the next touch', () => {
    // iOS can hand a touch to a long-press callout or system gesture and never end it for us.
    pointer('pointerdown', 82, action);
    held('A');
    pointer('pointerdown', 83, pad, .9, .5);
    document.body.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [finger(905, pad, .9, .5)], changedTouches: [finger(905, pad, .9, .5)] }));
    held('Right'); // The A finger is gone: no live touch is over the A button.
    document.body.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, touches: [finger(905, pad, .9, .5)], changedTouches: [finger(905, pad, .9, .5)] }));
    held('Right'); // A finger still on the pad keeps its hold.
    pointer('pointerup', 83, document.body); held('');
    equal(events, ['+A', '+Right', '-A', '-Right']);
  });
  await check('touches on controls cannot start selection, callouts or zoom', () => {
    for (const target of [action, pad.querySelector('.direction')!]) {
      const event = new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [finger(906, target)], changedTouches: [finger(906, target)] });
      target.dispatchEvent(event);
      equal(event.defaultPrevented, true);
      const select = new Event('selectstart', { bubbles: true, cancelable: true });
      target.dispatchEvent(select);
      equal(select.defaultPrevented, true);
      document.body.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [finger(906, target)] }));
    }
    held(''); equal(events, []);
    equal(getComputedStyle(action).webkitUserSelect || getComputedStyle(action).userSelect, 'none');
  });
  await check('continuous holds survive time and another finger ending; final touch preserves keyboard/mouse owners', async () => {
    pointer('pointerdown', 75, pad, .9, .5);
    await new Promise(resolve => setTimeout(resolve, 1200));
    held('Right');
    pointer('pointerdown', 76, action);
    const rightTouch = finger(903, pad, .9, .5);
    const actionTouch = finger(904, action);
    pointer('pointerup', 76, document.body);
    document.body.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [rightTouch], changedTouches: [actionTouch] }));
    held('Right');
    key('keydown', 'ArrowRight');
    pointer('pointerdown', 81, back, .5, .5, 'mouse');
    document.body.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [rightTouch] }));
    held('B,Right');
    pointer('pointerup', 81, document.body, .5, .5, 'mouse');
    held('Right');
    key('keyup', 'ArrowRight'); held('');
    equal(events, ['+Right', '+A', '-A', '+B', '-B', '-Right']);
  });
  await check('a no-contact move outside the root releases its pointer and page lifecycle clears all owners', () => {
    pointer('pointerdown', 77, pad, .9, .5);
    document.body.dispatchEvent(new PointerEvent('pointermove', { pointerId: 77, pointerType: 'touch', buttons: 0, bubbles: true }));
    held('');
    pointer('pointerdown', 78, pad, .9, .5); key('keydown', 'KeyF');
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })); held('');
    pointer('pointerdown', 79, action);
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); held('');
    equal(events, ['+Right', '-Right', '+Right', '+A', '-Right', '-A', '+A', '-A']);
  });
  await check('text, editable content and City Map cannot leak keys', () => {
    key('keydown', 'ArrowUp');
    const input = document.querySelector('input')!;
    input.focus();
    held('');
    key('keydown', 'KeyF', input);
    key('keyup', 'ArrowUp', input);
    key('keydown', 'KeyD', document.querySelector('[contenteditable]')!);
    key('keydown', 'ArrowRight', document.querySelector('#map')!);
    equal(events, ['+Up', '-Up']);
  });
  await check('modal close cannot reactivate a key that is still physically held', () => {
    key('keydown', 'ArrowUp');
    enabled = false;
    controls.releaseAll();
    const dialog = document.querySelector('dialog')!;
    dialog.showModal();
    key('keydown', 'KeyF', dialog.querySelector('button')!);
    dialog.close();
    enabled = true;
    canvas.focus();
    key('keydown', 'ArrowUp', canvas, true);
    held('');
    key('keyup', 'ArrowUp');
    key('keydown', 'ArrowUp');
    key('keyup', 'ArrowUp');
    equal(events, ['+Up', '-Up', '+Up', '-Up']);
  });
  await check('focused game buttons support F/D and independent Enter/Space holds', () => {
    action.focus();
    key('keydown', 'KeyD', action); key('keyup', 'KeyD', action);
    equal(key('keydown', 'Enter', action).defaultPrevented, true);
    key('keydown', 'Space', action);
    key('keyup', 'Enter', action);
    held('A');
    equal(key('keyup', 'Space', action).defaultPrevented, true);
    held('');
    equal(events, ['+B', '-B', '+A', '-A']);
  });
  await check('focus loss, rotation and fullscreen transitions clear held inputs', () => {
    key('keydown', 'ArrowLeft'); window.dispatchEvent(new Event('blur')); held('');
    key('keydown', 'KeyF'); window.dispatchEvent(new Event('orientationchange')); held('');
    pointer('pointerdown', 5, back); document.dispatchEvent(new Event('fullscreenchange')); held('');
    equal(captured.size, 0);
    equal(events, ['+Left', '-Left', '+A', '-A', '+B', '-B']);
  });
  await check('assistive click sends one bounded pulse', async () => {
    action.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    held('A');
    await new Promise((resolve) => setTimeout(resolve, 140));
    held(''); equal(events, ['+A', '-A']);
  });
  await check('reboot forgets holds without calling the old core', () => {
    pointer('pointerdown', 6, back);
    controls.forgetAll();
    pointer('pointerup', 6, root);
    held(''); equal(events, ['+B']);
  });
  const viewRoot = document.createElement('section');
  const viewCanvas = document.createElement('canvas');
  const viewDialog = document.createElement('dialog');
  viewDialog.innerHTML = '<button data-close-options>Close options</button>';
  const trigger = document.createElement('button');
  trigger.textContent = 'Options fixture';
  viewRoot.append(viewCanvas, trigger, viewDialog);
  document.body.append(viewRoot);
  let viewPaused = false;
  const calls: string[] = [];
  viewRoot.requestFullscreen = () => { calls.push('fullscreen'); return Promise.reject(new Error('Unsupported fixture API')); };
  const view = createGameView({
    console: viewRoot, dialog: viewDialog, returnTarget: run,
    getState: () => ({ running: true, paused: viewPaused }),
    pause: () => { viewPaused = true; calls.push('pause'); },
    resume: () => { viewPaused = false; calls.push('resume'); },
    release: () => calls.push('release'), refresh() {},
  });
  const closeViewOptions = () => new Promise<void>((resolve) => {
    viewDialog.addEventListener('close', () => resolve(), { once: true });
    view.closeOptions();
  });
  await check('Play requests fullscreen synchronously and retains CSS mode after rejection', async () => {
    view.enter();
    equal(calls.slice(0, 2), ['release', 'fullscreen']);
    equal(viewRoot.dataset.immersive, 'true');
    await Promise.resolve();
    equal(view.immersive, true);
    equal(viewRoot.querySelector('canvas'), viewCanvas);
  });
  await check('options pause and release, then restore prior running state and focus', async () => {
    viewPaused = false;
    view.openOptions(trigger);
    equal(viewPaused, true);
    equal(view.optionsOpen, true);
    await closeViewOptions();
    equal(viewPaused, false);
    equal(document.activeElement, trigger);
  });
  await check('options preserve an already-paused game', async () => {
    viewPaused = true;
    const resumes = calls.filter(value => value === 'resume').length;
    view.openOptions(trigger);
    await closeViewOptions();
    equal(viewPaused, true);
    equal(calls.filter(value => value === 'resume').length, resumes);
  });
  await check('exit closes options without resuming, preserves canvas and returns to intro', async () => {
    viewPaused = false;
    view.openOptions(trigger);
    const closed = new Promise<void>(resolve => viewDialog.addEventListener('close', () => resolve(), { once: true }));
    view.leave();
    await closed;
    equal(viewPaused, true);
    equal(view.immersive, false);
    equal(viewRoot.dataset.immersive, undefined);
    equal(viewRoot.querySelector('canvas'), viewCanvas);
    equal(document.body.classList.contains('game-immersive'), false);
  });
  viewRoot.remove();
  controls.releaseAll();
  const failed = lines.filter((line) => line.startsWith('FAIL')).length;
  results.textContent += `\n\n${lines.length - failed}/${lines.length} passed. Synthetic DOM tests; no physical-device claim.`;
  run.disabled = false;
});
