import { createGameControls } from '../src/game-controls';
import { createGameView } from '../src/game-view';

const root = document.querySelector<HTMLElement>('.physical-controls')!;
const canvas = document.querySelector('canvas')!;
const pad = document.querySelector<HTMLElement>('.dpad')!;
const action = root.querySelector<HTMLButtonElement>('[data-gba="A"]')!;
const back = root.querySelector<HTMLButtonElement>('[data-gba="B"]')!;
const results = document.querySelector<HTMLElement>('#results')!;
const run = document.querySelector<HTMLButtonElement>('#run')!;
const events: string[] = [];
let enabled = true;
const captured = new Set<number>();
// Synthetic PointerEvents have no OS pointer to capture. Keep all other DOM
// listeners unchanged and make this boundary explicit in the fixture's UI.
root.setPointerCapture = (id) => { captured.add(id); };
root.hasPointerCapture = (id) => captured.has(id);
root.releasePointerCapture = (id) => { captured.delete(id); };
const controls = createGameControls({
  root, canvas, canPlay: () => enabled, focus: () => canvas.focus(),
  press: (button) => events.push(`+${button}`), release: (button) => events.push(`-${button}`),
});
function key(type: string, code: string, target: Element = canvas, repeat = false) {
  const event = new KeyboardEvent(type, { code, bubbles: true, cancelable: true, repeat });
  target.dispatchEvent(event);
  return event;
}
function pointer(type: string, id: number, target: Element, x = .5, y = .5) {
  const rect = target.getBoundingClientRect();
  if (['pointerup', 'pointercancel', 'lostpointercapture'].includes(type)) captured.delete(id);
  target.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', button: 0, buttons: type === 'pointerup' ? 0 : 1,
    clientX: rect.left + rect.width * x, clientY: rect.top + rect.height * y, bubbles: true, cancelable: true }));
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
    enabled = true;
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
