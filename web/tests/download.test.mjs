import assert from 'node:assert/strict';
import test from 'node:test';
import { readWithProgress } from '../src/download.ts';

const body = (...sizes) => new Response(new ReadableStream({
  start(controller) {
    let value = 0;
    for (const size of sizes) controller.enqueue(new Uint8Array(size).fill(++value));
    controller.close();
  },
}));

test('the whole body is returned in order while progress climbs to 100', async () => {
  const seen = [];
  const bytes = await readWithProgress(body(1, 2, 1), 4, (percent) => seen.push(percent));
  assert.deepEqual([...bytes], [1, 2, 2, 3]);
  assert.deepEqual(seen, [25, 75, 100]);
});

test('a body larger than the metadata claims stays at 100 and is not cut short', async () => {
  const seen = [];
  const bytes = await readWithProgress(body(6, 6), 4, (percent) => seen.push(percent));
  assert.equal(bytes.length, 12);
  assert.deepEqual(seen, [100]);
});

test('without a known size the body still loads, with no progress to report', async () => {
  const seen = [];
  assert.equal((await readWithProgress(body(3, 3), undefined, (percent) => seen.push(percent))).length, 6);
  assert.deepEqual(seen, []);
});
