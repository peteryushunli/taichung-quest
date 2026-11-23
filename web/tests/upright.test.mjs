import assert from 'node:assert/strict';
import test from 'node:test';
import { isSideways } from '../src/upright.ts';

test('a phone turned either way is sideways, and so is one that cannot report its display', () => {
  for (const type of ['landscape-primary', 'landscape-secondary', undefined]) assert.equal(isSideways(true, type), true);
});

test('an upright phone in split screen, a tablet and a computer keep the site', () => {
  assert.equal(isSideways(true, 'portrait-primary'), false);
  for (const type of ['landscape-primary', 'portrait-primary', undefined]) assert.equal(isSideways(false, type), false);
});
