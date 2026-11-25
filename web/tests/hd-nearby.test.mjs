import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';

const bundled = esbuild.buildSync({ entryPoints: [new URL('../src/hd-overlay.ts', import.meta.url).pathname], bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent' });
const module = { exports: {} }; new Function('module', 'exports', 'require', bundled.outputFiles[0].text)(module, module.exports, createRequire(import.meta.url));
const { HdOverlay } = module.exports;
const world = new URL('../public/hd/world/', import.meta.url);
const pack = JSON.parse(readFileSync(new URL('pack.json', world)));

/** Width and height of a WebP file, whichever of its three layouts it uses. */
function webpSize(file) {
  const b = readFileSync(file);
  assert.equal(b.toString('latin1', 0, 4) + b.toString('latin1', 8, 12), 'RIFFWEBP');
  const kind = b.toString('latin1', 12, 16);
  if (kind === 'VP8X') return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
  if (kind === 'VP8L') { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, (v >> 14 & 0x3fff) + 1]; }
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
}

test('every crisp picture is stored at the size the game shows it', () => {
  const size = new Map();
  for (const map of Object.values(pack.maps)) {
    assert.ok(existsSync(new URL(map.ref, world)), map.ref);
    for (const b of map.buildings) size.set(b.picture, [b.w * 2, b.h * 2]);
  }
  for (const [picture, shown] of size) assert.deepEqual(webpSize(new URL(picture, world)), shown, picture);
});

test('each city map prepares the maps a step away, and the guest house prepares the street outside', () => {
  for (const [key, map] of Object.entries(pack.maps)) {
    for (const next of map.near) {
      assert.ok(pack.maps[next], `${key} names ${next}`);
      assert.notEqual(next, key);
      if (map.buildings.length) assert.ok(pack.maps[next].near.includes(key), `${next} leads back to ${key}`);
    }
    if (map.buildings.length) assert.ok(map.near.length, `${key} has neighbours`);
  }
  const named = (name) => Object.keys(pack.maps).find((key) => pack.maps[key].name === name);
  for (const room of ['TaichungGuestHouse_2F', 'TaichungGuestHouse_1F']) assert.ok(pack.maps[named(room)].near.includes(named('TaichungBlvdOldStation')), room);
});

function overlay(maps) {
  const asked = [], waiting = new Map(), o = Object.create(HdOverlay.prototype);
  Object.assign(o, { pack: { maps }, ready: new Map(), preparing: new Map(), pictures: new Map(), camera: { x: 1, y: 1 },
    prepareMap(key) {
      if (this.ready.has(key)) return Promise.resolve();
      asked.push(key);
      return new Promise((done) => waiting.set(key, () => { this.ready.set(key, { key }); done(); }));
    } });
  const arrive = async (key) => { waiting.get(key)(); for (let i = 0; i < 4; i++) await Promise.resolve(); };
  const at = (map) => o.currentMap({ group: 43, map, x: 0, y: 0 });
  return { o, asked, arrive, at };
}

test('a prepared map is there on the first frame the player stands on it', async () => {
  const f = overlay({ '43.1': { near: ['43.2', '43.3', '43.4'] }, '43.2': { near: ['43.1'] }, '43.3': { near: ['43.1'] }, '43.4': { near: ['43.1'] } });
  assert.equal(f.at(1), undefined);
  assert.deepEqual(f.asked, ['43.1'], 'the map itself comes first');
  await f.arrive('43.1');
  assert.equal(f.at(1).key, '43.1');
  assert.deepEqual(f.asked, ['43.1', '43.2', '43.3'], 'then its neighbours, two at a time');
  await f.arrive('43.3');
  assert.deepEqual(f.asked, ['43.1', '43.2', '43.3', '43.4']);
  await f.arrive('43.2');
  f.o.camera = { x: 5, y: 5 };
  assert.equal(f.at(2).key, '43.2');
  assert.equal(f.o.camera, undefined, 'the screen is found afresh on the new map');
});

test('maps out of reach are let go, and a street left behind asks for no more', async () => {
  const f = overlay({ '43.1': { near: ['43.2', '43.3', '43.4', '43.5'] }, '43.2': { near: ['43.1', '43.6'] }, '43.3': { near: [] }, '43.4': { near: [] }, '43.5': { near: [] }, '43.6': { near: [] } });
  f.at(1); await f.arrive('43.1'); await f.arrive('43.2'); await f.arrive('43.3');
  assert.deepEqual([...f.o.ready.keys()], ['43.1', '43.2', '43.3']);
  f.at(2); await f.arrive('43.4');
  assert.deepEqual([...f.o.ready.keys()].filter((key) => key === '43.3'), [], 'out of reach from here');
  assert.ok(f.o.ready.has('43.1') && f.o.ready.has('43.2'));
  assert.equal(f.asked.filter((key) => key === '43.5').length, 1, 'already asked for, never again');
  assert.ok(f.asked.includes('43.6'), 'the new street prepares its own');
});

test('turning back before a map arrives leaves the street as it was', async () => {
  const f = overlay({ '43.1': { near: ['43.2'] }, '43.2': { near: ['43.1'] } });
  f.at(1); await f.arrive('43.1'); f.at(1);
  assert.equal(f.at(2), undefined);
  assert.equal(f.at(1).key, '43.1');
  assert.equal(f.o.currentKey, '43.1');
});
