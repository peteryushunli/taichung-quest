import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { cityPlaceSummary, districtCount, districtLabelSpots, gymStatusSummary, isGym, isGymOpen, localizedPlace, markerPosition, orderPlaces, placeStatus, placeWorld } from '../src/landing-model.ts';

const landmarks = JSON.parse(readFileSync(new URL('../src/data/landmarks.json', import.meta.url), 'utf8'));
const sights = JSON.parse(readFileSync(new URL('../src/data/sights.json', import.meta.url), 'utf8'));
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
  assert.equal(placeStatus(visit), 'Landmark');
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
  // The station sits at world (117,117); the city rework (save v10) grew the canvas to 129x181 behind a raised freeway.
  assert.deepEqual(city.markersById['old-taichung-station'].world, [117, 117]);
  assert.deepEqual(markerPosition([117, 117], city.world), { x: 117.5 / 129 * 100, y: 117.5 / 181 * 100, side: 'left' });
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

test('temple visits are source-anchored stops with no badge or leader, linking only to the temple’s own site', () => {
  const visits = landmarks.filter((place) => !isGym(place));
  assert.deepEqual(visits.map((place) => place.id), ['wanhe-temple', 'wenchang-temple']);
  for (const place of visits) {
    assert.equal(place.gymStatus, 'not-a-gym');
    assert.equal(placeStatus(place), 'Landmark');
    assert.equal(place.playable, true);
    assert.equal(place.districtId, 'nantun');
    assert.equal(place.gameAreaRef, city.mapsByNativeKey['43:15'].mapId);
    assert.deepEqual([place.cityAnchor.x, place.cityAnchor.y], city.markersById[place.id].localEntrance);
    assert.equal(city.markersById[place.id].kind, 'landmark');
    assert.match(place.officialSourceTitle, /official site/);
    for (const locale of ['en', 'zh-Hant']) {
      assert.equal(localizedPlace(place, locale).leader, undefined);
      assert.match(localizedPlace(place, locale).url, /^https:\/\/www\.(wanhegong\.org\.tw|wcgt\.org)\//);
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

test('the ten set-piece landmarks join the map as non-gym places, after the ten gyms', () => {
  const places = orderPlaces([...landmarks, ...sights]);
  assert.equal(places.length, 20);
  assert.equal(new Set(places.map((place) => place.id)).size, 20);
  assert.deepEqual(places.slice(0, 10).map(isGym), Array(10).fill(true));
  assert.deepEqual(places.slice(10).map(isGym), Array(10).fill(false));
  assert.equal(cityPlaceSummary(places, 'en'), '4 districts. 20 real places.');
  assert.equal(sights.length, 8);
  for (const place of sights) {
    assert.equal(place.kind, 'sight', place.id);
    assert.equal(place.gymStatus, 'not-a-gym', place.id);
    assert.equal(placeStatus(place), 'Landmark');
    assert.equal(city.markersById[place.id], undefined, `${place.id} must not touch the fingerprinted contract`);
    for (const locale of ['en', 'zh-Hant']) {
      const info = localizedPlace(place, locale);
      assert.equal(info.leader, undefined, place.id);
      assert.ok(info.url?.startsWith('https://'), place.id);
    }
    assert.ok(place.description.length > 200 && place.descriptionZh.length > 60, place.id);
  }
});

test('every place has a map position inside the 129x181 world, and every non-gym a map-view crop around it', () => {
  for (const place of [...landmarks, ...sights]) {
    const [x, y] = placeWorld(place, city.markersById);
    const pin = markerPosition([x, y], city.world);
    assert.ok(pin.x > 0 && pin.x < 100 && pin.y > 0 && pin.y < 100, place.id);
    if (isGym(place)) continue;
    const [left, top, right, bottom] = place.artRect;
    assert.ok(left <= x && x <= right && top <= y && y <= bottom, `${place.id} crop misses its pin`);
    assert.ok(right <= city.world.width && bottom <= city.world.height, place.id);
    assert.ok(existsSync(new URL(`../src/assets/landmarks/map/${place.id}.png`, import.meta.url)), `${place.id} map-view crop`);
  }
  assert.deepEqual(placeWorld(landmarks[0], city.markersById), city.markersById[landmarks[0].id].world);
  assert.throws(() => placeWorld({ id: 'nowhere' }, city.markersById), /No map position/);
});

test('district names sit on the freeway for the north and beside Wanhe for Nantun', () => {
  const spots = districtLabelSpots(city);
  assert.deepEqual(spots.map((spot) => [spot.label, spot.sign]), [['XITUN 西屯', true], ['GREENWAY 草悟道', true], ['OLD CITY 舊城', true], ['NANTUN 南屯', false]]);
  for (const spot of spots) assert.ok(spot.x > 0 && spot.x < 100 && spot.y > 0 && spot.y < 100, spot.label);
  assert.equal(spots[0].y, 3 / 181 * 100);
});
