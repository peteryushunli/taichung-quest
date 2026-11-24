import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { bilingualNeighborhood, neighborhoodLabels, boxesOverlap, placeNeighborhoodLabels } from '../src/neighborhood-labels.ts';
import { districtLabelSpots } from '../src/landing-model.ts';

const geometry = JSON.parse(readFileSync(new URL('../src/data/boulevard-preview.json', import.meta.url)));
const expected = ['Fengjia 逢甲', 'Shuinan 水湳', 'Beitun 北屯', 'North District 北區', 'Xitun 西屯', 'Dadun 大墩', 'West District 西區', 'Old City 舊城', 'Nantun 南屯'];
test('both full maps and radar share the nine native neighborhood anchors and expanded names', () => {
  const before = JSON.stringify(geometry);
  const radar = neighborhoodLabels(geometry.world);
  const full = districtLabelSpots(geometry);
  assert.deepEqual(radar.map(entry => bilingualNeighborhood(entry.name)), expected);
  assert.deepEqual(full.map(entry => entry.label), expected);
  full.forEach((entry, index) => {
    assert.equal(entry.x, radar[index].tile[0] / geometry.world.width * 100);
    assert.equal(entry.y, radar[index].tile[1] / geometry.world.height * 100);
  });
  assert.equal(bilingualNeighborhood({ en: 'North District', zh: '北區' }), 'North District 北區');
  assert.equal(bilingualNeighborhood({ en: 'West', zh: '西區' }), 'West District 西區');
  assert.equal(JSON.stringify(geometry), before, 'Presentation must not change the paired native geometry');
  const exporter = readFileSync(new URL('../scripts/prepare-boulevard-preview.py', import.meta.url), 'utf8');
  assert.ok(exporter.includes('("North District", "北區"') && exporter.includes('("West District", "西區"'));
  assert.ok(!exporter.includes('LABELS =') && !exporter.includes('"districtLabels":'));
});

test('nine citywide labels fit at every neighborhood and landmark without covering the player', () => {
  const world = geometry.world, font = 3.2;
  const scale = Math.max((world.width + 4) / 60, (world.height + 4) / 44);
  const ox = (world.width - 60 * scale) / 2, oy = (world.height - 44 * scale) / 2;
  const labels = neighborhoodLabels(world);
  const boxes = labels.map(entry => {
    const width = Math.max(entry.name.en.length * font * .53, entry.name.zh.length * font) + 1;
    return { x: (entry.tile[0] + .5 - ox) / scale - width / 2, y: (entry.tile[1] + .5 - oy) / scale - 4, width, height: font * 2.25 + .6 };
  });
  for (const tile of [...labels.map(entry => entry.tile), ...Object.values(geometry.markersById).map(entry => entry.world)]) {
    const player = { x: (tile[0] + .5 - ox) / scale - 3.8, y: (tile[1] + .5 - oy) / scale - 3.8, width: 7.6, height: 7.6 };
    const placed = placeNeighborhoodLabels(60, 44, boxes, [player], 36, 1.5, .8);
    assert.ok(placed.every(Boolean), `All names must fit around player at ${tile}`);
    placed.forEach((box, index) => {
      assert.ok(box.x >= 1 && box.y >= 1 && box.x + box.width <= 59 && box.y + box.height <= 43);
      assert.ok(!boxesOverlap(box, player, .8));
      assert.ok(!placed.slice(index + 1).some(other => boxesOverlap(box, other, .8)));
    });
  }
});

test('a crowded local crop omits text rather than moving a marker or expanding the viewport', () => {
  const labels = [{ x: 3, y: 3, width: 12, height: 10 }];
  const obstacles = [{ x: 0, y: 0, width: 60, height: 44 }];
  const before = JSON.stringify([labels, obstacles]);
  assert.equal(placeNeighborhoodLabels(60, 44, labels, obstacles, 12)[0], undefined);
  assert.equal(JSON.stringify([labels, obstacles]), before);
});
