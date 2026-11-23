import assert from 'node:assert/strict';
import test from 'node:test';
import { HdSceneTracker, scoreHdCamera } from '../src/hd-scene.ts';

const hidden = { phase: 'hidden' };
const opening = { status: 'live', snapshot: { flags: 5, mapGroup: 43, mapNumber: 76, x: 25, y: 26 } };
test('script location comes from the verified onboarding client and survives its pause only', () => {
  const tracker = new HdSceneTracker();
  const scene = { group: 43, map: 76, x: 25, y: 26 };
  assert.deepEqual(tracker.observe(hidden, opening), scene);
  assert.deepEqual(tracker.observe(hidden, { status: 'paused' }), scene);
  assert.equal(tracker.observe(hidden, { status: 'discovering' }), undefined);
  assert.equal(tracker.observe(hidden, { status: 'paused' }), undefined);
  tracker.observe(hidden, opening);
  tracker.reset();
  assert.equal(tracker.observe(hidden, { status: 'paused' }), undefined);
  assert.equal(tracker.observe(hidden, { ...opening, snapshot: { ...opening.snapshot, flags: 0 } }), undefined);
  const navigation = { phase: 'live', snapshot: { mapGroup: 43, mapNumber: 66, x: 3, y: 4 } };
  assert.deepEqual(tracker.observe(navigation, opening), { group: 43, map: 66, x: 3, y: 4 });
});

test('camera confidence excludes dialogue but rejects a changed scene, fade, and invalid crop', () => {
  const refW = 300, refH = 200, cx = 25, cy = 17;
  const ref = Uint16Array.from({ length: refW * refH }, (_, i) => (i * 157 + (i % 29) * 37) % 32767 + 1);
  const frame = Uint16Array.from({ length: 240 * 160 }, (_, i) => ref[(cy + Math.floor(i / 240)) * refW + cx + i % 240]);
  assert.equal(scoreHdCamera(frame, ref, refW, refH, cx, cy), 1);
  frame.fill(0, 112 * 240);
  assert.equal(scoreHdCamera(frame, ref, refW, refH, cx, cy), 1);
  assert.ok(scoreHdCamera(frame, ref, refW, refH, cx + 1, cy) < .75);
  frame.fill(0);
  assert.equal(scoreHdCamera(frame, ref, refW, refH, cx, cy), 0);
  assert.equal(scoreHdCamera(frame, ref, refW, refH, -1, cy), 0);
  assert.equal(scoreHdCamera(frame, ref, refW, refH, 100, cy), 0);
});
