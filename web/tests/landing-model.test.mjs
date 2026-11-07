import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { districtCount, gymStatusSummary, isGymOpen, localizedPlace, markerPosition } from '../src/landing-model.ts';

const landmarks = JSON.parse(readFileSync(new URL('../src/data/landmarks.json', import.meta.url), 'utf8'));
const assets = readFileSync(new URL('../src/landing-assets.ts', import.meta.url), 'utf8');
const open = landmarks.filter(isGymOpen);

test('only Station and Park gyms are open, and only they name a leader', () => {
  assert.deepEqual(open.map((place) => place.id), ['old-taichung-station', 'taichung-park']);
  for (const place of landmarks) {
    for (const locale of ['en', 'zh-Hant']) {
      const { leader } = localizedPlace(place, locale);
      if (isGymOpen(place)) assert.ok(leader, place.id);
      else assert.equal(leader, undefined, place.id);
    }
  }
  assert.equal(localizedPlace(open[0], 'en').leader, 'Jun');
  assert.equal(localizedPlace(open[1], 'zh-Hant').leader, '莉安');
});

test('a gym without playable status never gets a leader, even with one recorded', () => {
  const planned = { ...open[0], gymStatus: 'pending-verification' };
  assert.equal(localizedPlace(planned, 'en').leader, undefined);
});

test('the gym status line follows the data in both languages', () => {
  assert.equal(gymStatusSummary(landmarks, 'en'), 'Old Station and Taichung Park gyms are battle-ready; the other eight are in development.');
  assert.match(gymStatusSummary(landmarks, 'zh-Hant'), /其餘八座仍在開發中/);
  const one = landmarks.map((place, index) => ({ ...place, gymStatus: index === 0 ? 'playable' : 'planned' }));
  assert.equal(gymStatusSummary(one, 'en'), 'Old Station gym is battle-ready; the other nine are in development.');
  const none = landmarks.map((place) => ({ ...place, gymStatus: 'planned' }));
  assert.equal(gymStatusSummary(none, 'en'), 'All gyms are still in development.');
  const all = landmarks.map((place) => ({ ...place, gymStatus: 'playable' }));
  assert.equal(gymStatusSummary(all, 'en'), 'All gyms are battle-ready.');
});

test('stats and marker positions come from the landmark data', () => {
  assert.equal(landmarks.length, 10);
  assert.equal(districtCount(landmarks), 3);
  const maple = landmarks.find((place) => place.id === 'maple-garden');
  assert.deepEqual(markerPosition(maple), { x: maple.mapX, y: 28.4 });
  for (const place of landmarks.filter((candidate) => candidate.id !== 'maple-garden')) {
    assert.deepEqual(markerPosition(place), { x: place.mapX, y: place.mapY });
  }
});

test('localized places use their own language and secure links', () => {
  for (const place of landmarks) {
    const zh = localizedPlace(place, 'zh-Hant');
    assert.equal(zh.name, place.nameZh);
    assert.equal(zh.otherName, place.nameEn);
    assert.ok(zh.mapLabel && localizedPlace(place, 'en').mapLabel);
    assert.ok(zh.url.startsWith('https://'));
  }
  assert.throws(() => localizedPlace({ ...landmarks[0], officialUrl: 'http://example.com/' }, 'en'), /secure/);
});

test('map pins and gym cards use the short English names', () => {
  assert.deepEqual(landmarks.map((place) => localizedPlace(place, 'en').mapLabel), ['Old Station', 'Taichung Park', 'Miyahara', 'Science Museum', 'Greenway', 'Shen Ji', 'Fine Arts Museum', 'Fengjia Night Market', 'Maple Garden', 'Taichung Theater']);
  assert.equal(localizedPlace(landmarks[4], 'en').shortName, 'Greenway');
  assert.equal(localizedPlace(landmarks[4], 'zh-Hant').mapLabel, '草悟道');
});

test('every landmark has facade art wired in', () => {
  for (const place of landmarks) {
    assert.match(assets, new RegExp(`'?${place.id}'?: \\{ facade: \\w+`), place.id);
  }
});
