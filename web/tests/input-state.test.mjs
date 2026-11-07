import test from 'node:test';
import assert from 'node:assert/strict';
import { InputState, KEY_BINDINGS, dpadDirection } from '../src/input-state.ts';

test('chosen F/D keys preserve arrows, legacy actions and shoulders; D never moves right', () => {
  assert.equal(KEY_BINDINGS.KeyF, 'A');
  assert.equal(KEY_BINDINGS.KeyD, 'B');
  assert.equal(KEY_BINDINGS.ArrowRight, 'Right');
  assert.equal(KEY_BINDINGS.KeyE, 'R');
  assert.equal(KEY_BINDINGS.KeyZ, 'A');
  assert.equal(KEY_BINDINGS.KeyX, 'B');
  assert.equal(KEY_BINDINGS.KeyM, 'Start');
  assert.equal(KEY_BINDINGS.Escape, undefined);
  assert.equal(KEY_BINDINGS.Space, undefined);
});

test('simultaneous pointer/key holds survive another owner releasing or cancelling', () => {
  const events = [];
  const state = new InputState({ press: (b) => events.push(`+${b}`), release: (b) => events.push(`-${b}`), changed() {} });
  state.set('pointer:1', 'Up');
  state.set('pointer:2', 'A');
  state.set('key:KeyF', 'A');
  state.set('pointer:2');
  assert.deepEqual([...state.buttons], ['Up', 'A']);
  assert.deepEqual(events, ['+Up', '+A']);
  state.set('key:KeyF');
  assert.deepEqual(events, ['+Up', '+A', '-A']);
  state.set('pointer:1', 'Right');
  assert.deepEqual(events.slice(-2), ['-Up', '+Right']);
  state.clear();
  assert.equal(state.buttons.size, 0);
  assert.equal(events.at(-1), '-Right');
  state.clear();
  assert.equal(events.filter((x) => x === '-Right').length, 1);
});

test('cartridge reboot can forget visual holds without entering the old native core', () => {
  const events = [];
  const state = new InputState({ press: (b) => events.push(`+${b}`), release: (b) => events.push(`-${b}`), changed() {} });
  state.set('pointer:3', 'B');
  state.clear(false);
  state.set('pointer:3');
  assert.deepEqual(events, ['+B']);
  assert.equal(state.buttons.size, 0);
});

test('directional drags choose cardinal targets, release at the center and outside the pad', () => {
  assert.equal(dpadDirection(0, -.8), 'Up');
  assert.equal(dpadDirection(.8, -.2), 'Right');
  assert.equal(dpadDirection(-.2, .8), 'Down');
  assert.equal(dpadDirection(-.8, .2), 'Left');
  assert.equal(dpadDirection(.1, -.1), undefined);
  assert.equal(dpadDirection(1.1, 0), undefined);
});
