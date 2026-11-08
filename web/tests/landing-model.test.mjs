import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { cityPlaceSummary, districtCount, gymStatusSummary, isGym, isGymOpen, localizedPlace, markerPosition, placeStatus } from '../src/landing-model.ts';

const landmarks = JSON.parse(readFileSync(new URL('../src/data/landmarks.json', import.meta.url), 'utf8'));
const city = JSON.parse(readFileSync(new URL('../src/data/minimap-contract.json', import.meta.url), 'utf8'));
const assets = readFileSync(new URL('../src/landing-assets.ts', import.meta.url), 'utf8');
const open = landmarks.filter(isGymOpen);

test('the ten-gym release names every open leader in both languages', () => {
  assert.equal(open.length, 10);
  assert.deepEqual(open.map((place) => [place.id, place.gymLeaderEn, place.gymLeaderZh]), [
    ['old-taichung-station', 'Jun', '俊'],
    ['taichung-park', 'Lian', '莉安'],
    ['miyahara', 'Peiqi', '沛琪'],
    ['natural-science-museum', 'Yicheng', '以澄'],
    ['calligraphy-greenway', 'Xingan', '行安'],
    ['shen-ji-new-village', 'Axiu', '阿修'],
    ['fine-arts-museum', 'Caining', '采寧'],
    ['fengjia-night-market', 'Jiahe', '嘉禾'],
    ['maple-garden', 'Muqing', '沐晴'],
    ['taichung-theater', 'Ling', '聆'],
  ]);
  for (const place of landmarks) {
    for (const locale of ['en', 'zh-Hant']) {
      const { leader } = localizedPlace(place, locale);
      if (isGymOpen(place)) assert.ok(leader, place.id);
      else assert.equal(leader, undefined, place.id);
    }
  }
  assert.equal(localizedPlace(open[0], 'en').leader, 'Jun');
  assert.equal(localizedPlace(open[1], 'zh-Hant').leader, '莉安');
  assert.equal(localizedPlace(open[2], 'en').leader, 'Peiqi');
  assert.equal(localizedPlace(open[2], 'zh-Hant').leader, '沛琪');
});

test('pending, unknown and visit statuses never reveal a recorded leader', () => {
  for (const gymStatus of ['pending-verification', 'planned', 'unknown', undefined]) {
    for (const locale of ['en', 'zh-Hant']) {
      assert.equal(localizedPlace({ ...open[0], gymStatus }, locale).leader, undefined);
    }
  }
  const visit = { ...open[0], kind: 'visit' };
  assert.equal(isGymOpen(visit), false);
  assert.equal(placeStatus(visit), 'Visit');
  assert.equal(localizedPlace(visit, 'en').leader, undefined);
});

test('the gym status line follows the data in both languages', () => {
  assert.equal(gymStatusSummary(landmarks, 'en'), 'All gyms are battle-ready.');
  assert.equal(gymStatusSummary(landmarks, 'zh-Hant'), '所有道館都已開放挑戰。');
  const three = landmarks.map((place, index) => ({ ...place, gymStatus: index < 3 ? 'playable' : 'planned' }));
  assert.equal(gymStatusSummary(three, 'en'), 'Old Station, Taichung Park and Miyahara gyms are battle-ready; the other seven are in development.');
  assert.equal(gymStatusSummary(three, 'zh-Hant'), '舊車站、臺中公園與宮原眼科道館已開放挑戰；其餘七座仍在開發中。');
  const two = landmarks.map((place, index) => ({ ...place, gymStatus: index < 2 ? 'playable' : 'planned' }));
  assert.equal(gymStatusSummary(two, 'en'), 'Old Station and Taichung Park gyms are battle-ready; the other eight are in development.');
  assert.equal(gymStatusSummary(two, 'zh-Hant'), '舊車站與臺中公園道館已開放挑戰；其餘八座仍在開發中。');
  const one = landmarks.map((place, index) => ({ ...place, gymStatus: index === 0 ? 'playable' : 'planned' }));
  assert.equal(gymStatusSummary(one, 'en'), 'Old Station gym is battle-ready; the other nine are in development.');
  const none = landmarks.map((place) => ({ ...place, gymStatus: 'planned' }));
  assert.equal(gymStatusSummary(none, 'en'), 'All gyms are still in development.');
  const all = landmarks.map((place) => ({ ...place, gymStatus: 'playable' }));
  assert.equal(gymStatusSummary(all, 'en'), 'All gyms are battle-ready.');
});

test('stats come from the landmark data', () => {
  assert.equal(landmarks.length, 12);
  assert.equal(districtCount(landmarks), 4);
  assert.equal(landmarks.filter(isGym).length, 10);
  assert.equal(cityPlaceSummary(landmarks, 'en'), '4 districts. 12 real places.');
  assert.equal(cityPlaceSummary(landmarks, 'zh-Hant'), '4 個街區，12 個真實地點。');
});

test('map pins sit on each entrance tile of the rendered city, labels facing the middle', () => {
  for (const place of landmarks) assert.ok(city.markersById[place.id], place.id);
  // The station sits at world (112,112); the canvas grew to 120x176 when Nantun was added below Xitun and the Greenway.
  assert.deepEqual(city.markersById['old-taichung-station'].world, [112, 112]);
  assert.deepEqual(markerPosition([112, 112], city.world), { x: 93.75, y: 112.5 / 176 * 100, side: 'left' });
  assert.deepEqual(markerPosition([59, 0], { width: 120, height: 120 }).side, 'right');
  assert.deepEqual(markerPosition([60, 0], { width: 120, height: 120 }).side, 'left');
});

test('localized places use their own language and secure links', () => {
  for (const place of landmarks) {
    const zh = localizedPlace(place, 'zh-Hant');
    assert.equal(zh.name, place.nameZh);
    assert.equal(zh.otherName, place.nameEn);
    assert.ok(zh.mapLabel && localizedPlace(place, 'en').mapLabel);
    if (place.officialUrl) assert.ok(zh.url.startsWith('https://'));
    else assert.equal(zh.url, undefined);
  }
  assert.throws(() => localizedPlace({ ...landmarks[0], officialUrl: 'http://example.com/' }, 'en'), /secure/);
});

test('map pins and gym cards use the short English names', () => {
  assert.deepEqual(landmarks.map((place) => localizedPlace(place, 'en').mapLabel), ['Old Station', 'Taichung Park', 'Miyahara', 'Science Museum', 'Greenway', 'Shen Ji', 'Fine Arts Museum', 'Fengjia Night Market', 'Maple Garden', 'Taichung Theater', 'Wanhe Temple', 'Wenchang Temple']);
  assert.equal(localizedPlace(landmarks[4], 'en').shortName, 'Greenway');
  assert.equal(localizedPlace(landmarks[4], 'zh-Hant').mapLabel, '草悟道');
});

test('every gym landmark retains its existing facade art', () => {
  for (const place of landmarks.filter(isGym)) {
    assert.match(assets, new RegExp(`'?${place.id}'?: \\{ facade: \\w+`), place.id);
  }
});

test('temple visits are source-anchored stops with no badge, leader or invented visitor link', () => {
  const visits = landmarks.filter((place) => !isGym(place));
  assert.deepEqual(visits.map((place) => place.id), ['wanhe-temple', 'wenchang-temple']);
  for (const place of visits) {
    assert.equal(place.gymStatus, 'not-a-gym');
    assert.equal(placeStatus(place), 'Visit');
    assert.equal(place.playable, true);
    assert.equal(place.districtId, 'nantun');
    assert.equal(place.gameAreaRef, city.mapsByNativeKey['43:15'].mapId);
    assert.deepEqual([place.cityAnchor.x, place.cityAnchor.y], city.markersById[place.id].localEntrance);
    assert.equal(city.markersById[place.id].kind, 'landmark');
    for (const locale of ['en', 'zh-Hant']) {
      assert.equal(localizedPlace(place, locale).leader, undefined);
      assert.equal(localizedPlace(place, locale).url, undefined);
    }
  }
  assert.equal(gymStatusSummary(landmarks, 'en'), gymStatusSummary(landmarks.filter(isGym), 'en'));
});

test('every open gym has its leader portrait and team wired in', () => {
  for (const place of open) {
    assert.match(assets, new RegExp(`'?${place.id}'?: \\{[^}]*leader: \\w+, team: \\[mon\\(`), place.id);
  }
});

test('the remaining seven team orders match native source b7b027d', () => {
  const expected = {
    'natural-science-museum': ['Magneton', 'Porygon', 'Omastar'],
    'calligraphy-greenway': ['Bellsprout', 'Vileplume', 'Tangela'],
    'shen-ji-new-village': ['Meowth', 'Machoke', 'Ditto'],
    'fine-arts-museum': ['Butterfree', 'Ditto', 'Porygon'],
    'fengjia-night-market': ['Farfetch’d', 'Magmar', 'Snorlax'],
    'maple-garden': ['Poliwhirl', 'Butterfree', 'Vaporeon'],
    'taichung-theater': ['Jigglypuff', 'Jynx', 'Mr. Mime'],
  };
  for (const [id, names] of Object.entries(expected)) {
    const entry = assets.split('\n').find((line) => line.includes(`'${id}':`));
    assert.ok(entry, id);
    assert.deepEqual([...entry.matchAll(/mon\('([^']+)', \w+\)/g)].map((match) => match[1]), names, id);
  }
});
