import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { DEFAULT_MAP_LAYERS, MAP_LAYERS, mapLayerLabel, namedStreetLabels } from '../src/map-layers.ts';
import { localizedPlace } from '../src/landing-model.ts';

const geometry = JSON.parse(readFileSync(new URL('../src/data/boulevard-preview.json', import.meta.url)));
test('the four independent overlays have the requested defaults and locale labels', () => {
  assert.deepEqual(MAP_LAYERS, ['gyms', 'landmarks', 'districts', 'streets']);
  assert.deepEqual(DEFAULT_MAP_LAYERS, { gyms: true, landmarks: true, districts: false, streets: false });
  assert.deepEqual(MAP_LAYERS.map(layer => mapLayerLabel(layer, 'en')), ['Gyms', 'Landmarks', 'Districts', 'Streets']);
  assert.deepEqual(MAP_LAYERS.map(layer => mapLayerLabel(layer, 'zh-Hant')), ['道館', '地標', '街區', '街道']);
});

test('street labels use the longest paired band without changing geometry or merging distinct bilingual names', () => {
  const before = JSON.stringify(geometry);
  const labels = namedStreetLabels(geometry);
  const names = labels.map(band => `${band.name.en}\0${band.name.zh}`);
  assert.equal(names.length, new Set(names).size);
  for (const label of labels) {
    assert.ok(geometry.world.streetBands.includes(label));
    const length = band => band.axis === 'h' ? band.bounds[2] - band.bounds[0] : band.bounds[3] - band.bounds[1];
    assert.ok(geometry.world.streetBands.filter(band => band.name.en === label.name.en && band.name.zh === label.name.zh).every(band => length(band) <= length(label)));
  }
  assert.equal(JSON.stringify(geometry), before);
});

test('visitor links name the actual place in both languages and retain the existing URL', () => {
  const sights = JSON.parse(readFileSync(new URL('../src/data/sights.json', import.meta.url)));
  const gyms = JSON.parse(readFileSync(new URL('../src/data/landmarks.json', import.meta.url)));
  const temple = [...gyms, ...sights].find(place => place.id === 'confucius-temple');
  assert.equal(localizedPlace(temple, 'en').visitLabel, 'Plan a visit to Taichung Confucius Temple');
  assert.equal(localizedPlace(temple, 'zh-Hant').visitLabel, `規劃參觀${temple.nameZh}`);
  assert.equal(localizedPlace(temple, 'en').url, new URL(temple.officialUrl).href);
  assert.equal(localizedPlace(temple, 'zh-Hant').url, new URL(temple.officialUrlZh ?? temple.officialUrl).href);
});
