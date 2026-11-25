import assert from 'node:assert/strict';
import test from 'node:test';
import { encounterProgress, encounterOutcome } from '../src/encounter-progress.ts';

test('caught, every spent result, pending transactions and high bits stay distinct', () => {
  for (const bit of [0, 3, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26]) {
    const snapshot = { attempts: 1 << bit, unlocks: 0, site: bit, phase: 5 };
    for (const result of [2, 3, 4, 5, 6, 7]) {
      const progress = encounterProgress({ status: 'live', snapshot: { ...snapshot, result } });
      assert.equal(encounterOutcome(bit, progress), 'spent');
      assert.equal(encounterOutcome((bit + 1) % 27, progress), 'available');
    }
    for (const phase of [1, 2, 3, 4]) assert.equal(encounterOutcome(bit, { ...snapshot, phase }), 'pending');
    assert.equal(encounterOutcome(bit, { ...snapshot, unlocks: 1 << bit, phase: 4 }), 'caught');
    assert.equal(encounterOutcome(bit, { ...snapshot, site: 255, phase: 0 }), 'spent');
    assert.equal(encounterOutcome(bit, undefined, 1 << bit), 'caught');
  }
  for (const bit of [undefined, -1, 27, 28, 31, .5]) assert.equal(encounterOutcome(bit, { attempts: 0, unlocks: 0 }), 'unknown');
  assert.equal(encounterOutcome(0), 'unknown');
});

test('Lapras and Victreebel retain their history independently of replacement starters', () => {
  for (const caught of [false, true]) {
    const attempts = [0, 13, 18, 22].reduce((mask, bit) => mask | 1 << bit, 0);
    const progress = { attempts, unlocks: caught ? attempts : 0, site: 255, phase: 0 };
    assert.equal(encounterOutcome(0, progress), caught ? 'caught' : 'spent');
    for (const bit of [13, 18, 22]) assert.equal(encounterOutcome(bit, progress), caught ? 'caught' : 'spent');
    for (const bit of [24, 25, 26]) assert.equal(encounterOutcome(bit, progress), 'available');
  }
});

test('pause retains verified progress, reconnect clears it, and a replacement save may reduce masks', () => {
  const snapshot = { attempts: 7, unlocks: 1, site: 255, phase: 0 };
  const progress = encounterProgress({ status: 'live', snapshot });
  assert.equal(encounterProgress({ status: 'live', snapshot }, progress), progress);
  assert.equal(encounterProgress({ status: 'paused' }, progress), progress);
  for (const status of ['discovering', 'unavailable']) assert.equal(encounterProgress({ status }, progress), undefined);
  const replaced = encounterProgress({ status: 'live', snapshot: { ...snapshot, attempts: 0, unlocks: 0 } }, progress);
  assert.equal(encounterOutcome(0, replaced), 'available');
});
