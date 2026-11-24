import assert from 'node:assert/strict';
import test from 'node:test';
import { EncounterSaveSpeed } from '../src/encounter-save-speed.ts';
const pending = (extra = {}) => ({ request: 7, acknowledgement: 0, phase: 1, saveStatus: 0, ...extra });
function fixture(initial = 1) {
  let value = initial;
  const writes = [];
  const runtime = { getFastForwardMultiplier: () => value, setFastForwardMultiplier: n => { writes.push(n); value = n; } };
  return { speed: new EncounterSaveSpeed(runtime), writes, get value() { return value; }, set value(n) { value = n; } };
}
test('only pending native flash enables burst; full browser commit retains it until ACK and restores exact prior speed', () => {
  const f = fixture(2);
  f.speed.update({ ...pending(), phase: 0 }); assert.deepEqual(f.writes, []);
  f.speed.update(pending()); assert.equal(f.value, 8);
  f.speed.update(pending()); assert.deepEqual(f.writes, [8]);
  f.speed.update(pending({ saveStatus: 1 })); assert.equal(f.value, 8);
  f.speed.update(pending({ saveStatus: 1, acknowledgement: 7 })); assert.equal(f.value, 2);
  assert.deepEqual(f.writes, [8, 2]);
});
test('ordinary gameplay, unsignalled old ROMs, results already saved and unknown requests never get a burst', () => {
  const f = fixture();
  for (const s of [undefined, pending({ request: 0 }), pending({ phase: 3 }), pending({ phase: 5 }), pending({ saveStatus: 1 })]) f.speed.update(s);
  assert.deepEqual(f.writes, []);
});
test('failure, pause/reset/heap invalidation and explicit stop restore; a new result request may accelerate independently', () => {
  const f = fixture();
  for (const ending of [undefined, pending({ phase: 6 }), pending({ acknowledgement: 7 })]) {
    f.speed.update(pending()); f.speed.update(ending); assert.equal(f.value, 1);
  }
  f.speed.update(pending({ phase: 4, request: 8 })); assert.equal(f.value, 8);
  f.speed.release(); assert.equal(f.value, 1);
});
test('existing faster/unlimited settings and later owner speed changes are preserved', () => {
  for (const initial of [0, 8, 16, NaN]) { const f = fixture(initial); f.speed.update(pending()); assert.deepEqual(f.writes, []); }
  const f = fixture(); f.speed.update(pending()); f.value = 4; f.speed.release(); assert.equal(f.value, 4);
});
