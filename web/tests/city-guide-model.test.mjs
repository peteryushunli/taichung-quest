import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { cityMapAreas, guideMapDrawing } from '../src/city-guide-model.ts';
import { markerPosition } from '../src/landing-model.ts';

const city = JSON.parse(readFileSync(new URL('../src/data/minimap-contract.json', import.meta.url)));
const places = JSON.parse(readFileSync(new URL('../src/data/landmarks.json', import.meta.url)));

test('the full City Map draws all five exterior contract shapes within 120x176', () => {
  const areas = cityMapAreas(city, places);
  assert.deepEqual(city.world.bounds, [0, 0, 120, 176]);
  assert.deepEqual(areas.map(({ key, left, top, width, height }) => [key, left, top, width, height]), [
    ['43:0', 80, 48, 40, 72],
    ['43:1', 40, 32, 40, 72],
    ['43:2', 0, 0, 40, 64],
    ['43:14', 0, 64, 40, 40],
    ['43:15', 0, 104, 64, 72],
  ]);
  assert.deepEqual(areas.slice(3).map((area) => area.name), [
    { en: 'Nantun · North', zh: '南屯北段' },
    { en: 'Nantun · Wanhe', zh: '南屯・萬和宮街廓' },
  ]);
  const svg = guideMapDrawing(city, places);
  assert.match(svg, /viewBox="0 0 120 176"/);
  assert.equal([...svg.matchAll(/data-native-key=/g)].length, 5);
  for (const area of areas) {
    assert.ok(svg.includes(`data-native-key="${area.key}" x="${area.left}" y="${area.top}" width="${area.width}" height="${area.height}"`));
  }
});

test('temple anchors share the native world projection used by both page maps', () => {
  assert.deepEqual(city.markersById['wanhe-temple'].world, [26, 137]);
  assert.deepEqual(city.markersById['wenchang-temple'].world, [16, 137]);
  for (const place of places) {
    const marker = city.markersById[place.id];
    const { x, y } = markerPosition(marker.world, city.world);
    assert.ok(x > 0 && x < 100 && y > 0 && y < 100, place.id);
  }
});

test('indoor rooms and invalid or out-of-world rectangles never become map shapes', () => {
  const maps = {
    '44:0': { kind: 'interior', worldRect: [0, 0, 20, 20] },
    '44:1': { kind: 'exterior', worldRect: [-1, 0, 20, 20] },
    '44:2': { kind: 'exterior', worldRect: [0, 0, 121, 176] },
    '44:3': { kind: 'exterior', worldRect: [20, 0, 10, 20] },
    '44:4': { kind: 'exterior', worldRect: [0, 0, Number.NaN, 20] },
  };
  assert.deepEqual(cityMapAreas({ ...city, mapsByNativeKey: maps }, places), []);
});
