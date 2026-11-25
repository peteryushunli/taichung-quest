import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { landmarkCaptureCopy } from '../src/capture-copy.ts';
import { setLocale, t } from '../src/i18n.ts';
import { isGym } from '../src/landing-model.ts';
import { bilingualNeighborhood, neighborhoodLabels } from '../src/neighborhood-labels.ts';

const places = ['landmarks', 'sights'].flatMap((name) => JSON.parse(
  readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), 'utf8'),
));

test('the existing twenty places route captures to nine signs and Wenchang host, never gyms or future sites', () => {
  assert.equal(places.length, 20);
  let signs = 0;
  let hosts = 0;
  for (const place of places) {
    for (const surface of ['guide', 'landing']) {
      const copy = landmarkCaptureCopy(place.id, surface);
      if (isGym(place)) {
        assert.equal(copy, undefined, place.id);
      } else {
        assert.ok(copy, place.id);
        assert.match(copy, /capture.*unlock.*TEAM/i, place.id);
        assert.match(copy, place.id === 'wenchang-temple' ? /hall host/ : /sign/, place.id);
      }
    }
    if (!isGym(place)) place.id === 'wenchang-temple' ? hosts++ : signs++;
  }
  assert.equal(signs, 9, 'eight outdoor sights plus the Maple Garden sign');
  assert.equal(hosts, 1, 'Wenchang is the hall-host route');
  for (const id of ['confucius-temple', 'luce-chapel', 'rainbow-village', 'city-hall', 'jingming-street', 'yuanbao-temple', 'unknown']) {
    assert.equal(landmarkCaptureCopy(id, 'guide'), undefined, id);
    assert.equal(landmarkCaptureCopy(id, 'landing'), undefined, id);
  }
});

test('real sign/host copy keeps capture-before-TEAM-unlock and the correct entry point in both languages', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  globalThis.document = { documentElement: { lang: 'en' }, querySelectorAll: () => [] };
  try {
    for (const locale of ['en', 'zh-Hant']) {
      setLocale(locale, 'native');
      for (const place of places.filter((entry) => !isGym(entry))) {
        for (const surface of ['guide', 'landing']) {
          const english = landmarkCaptureCopy(place.id, surface);
          const localized = t(english);
          if (locale === 'en') {
            assert.equal(localized, english);
            assert.match(localized, /capture.*unlock.*TEAM/i);
          } else {
            assert.notEqual(localized, english, `${place.id}: missing Traditional Chinese`);
            assert.match(localized, /捕捉.*解鎖.*TEAM/);
            assert.match(localized, place.id === 'wenchang-temple' ? /接待員/ : /告示牌/);
          }
        }
      }
      for (const surface of ['guide', 'landing']) {
        const charizard = landmarkCaptureCopy('yuanbao-temple', surface, true, 24);
        const chansey = landmarkCaptureCopy('shen-ji-new-village', surface, true, 28);
        assert.match(t(charizard), locale === 'en' ? /level 65 Charizard.*capture.*TEAM/ : /Lv\. 65 的噴火龍.*捕捉.*TEAM/);
        assert.match(t(chansey), locale === 'en' ? /level 60 Chansey.*capture.*TEAM/ : /Lv\. 60 的吉利蛋.*捕捉.*TEAM/);
      }
    }
  } finally {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else delete globalThis.document;
  }
});

test('the Boulevard guide includes encounters for every non-gym destination', () => {
  const { extraSights, markersById, world } = JSON.parse(
    readFileSync(new URL('../src/data/boulevard-preview.json', import.meta.url), 'utf8'),
  );
  const sights = [...places, ...extraSights].filter((place) => !isGym(place));
  // The checked-in artifact remains paired to its cartridge until Main exports
  // the combined ROM. Assert the entire rotation when it is present.
  const rotated = markersById['maple-garden']?.captureBit === 26;
  const temple = markersById['yuanbao-temple'];
  const reassigned = temple?.captureBit === 24;
  const newSites = [['national-trade-center', reassigned ? 7 : 21], ['ding-sheng-bhw', rotated ? 25 : 22], ['the-lin', 23]];
  if (rotated) {
    assert.equal(markersById['botanical-garden'].captureBit, 18);
    assert.equal(markersById['jingming-street'].captureBit, reassigned ? 21 : 24);
    assert.ok(!Object.values(markersById).some(marker => [0, 13, 22].includes(marker.captureBit)));
  }
  const hasNewXitun = newSites.some(([id]) => extraSights.some(place => place.id === id));
  assert.equal(sights.length, (hasNewXitun ? 20 : 17) + Number(Boolean(temple)));
  assert.equal(Object.values(markersById).filter((marker) => marker.kind === 'landmark-gym').length, 10);
  assert.ok(!Object.values(markersById).some((marker) => marker.captureBit === 27));
  if (temple) {
    const card = sights.find((place) => place.id === temple.id);
    assert.deepEqual(temple.captureInteraction, {
      nativeKey: '43:69', local: [4, 24], world: [285, 50], script: 'TaichungCity_Sign_YuanbaoTemple',
    });
    assert.deepEqual(temple.world, temple.captureInteraction.world);
    assert.equal(temple.kind, 'landmark');
    assert.equal(temple.captureBit, reassigned ? 24 : 28);
    assert.equal(card.nameZh, '元保宮');
    assert.equal(card.districtId, 'north');
    assert.equal(card.officialUrl, 'https://travel.taichung.gov.tw/en/Attractions/Intro/1659');
    assert.deepEqual([card.location.latitude, card.location.longitude], [24.1628328, 120.676291]);
  }
  const park = markersById['taichung-park'];
  assert.equal(markersById['taichung-park-lakeshore'], undefined);
  assert.equal(park.captureBit, undefined);
  assert.equal(park.kind, 'landmark-gym');
  assert.equal(landmarkCaptureCopy(park.id, 'guide'), undefined);
  assert.equal(landmarkCaptureCopy(park.id, 'landing'), undefined);
  assert.match(landmarkCaptureCopy('botanical-garden', 'landing', true, 18), /level 65 Victreebel.*encounter/i);
  if (hasNewXitun) {
    for (const [id, bit] of newSites) assert.equal(markersById[id]?.captureBit, bit, id);
    assert.equal(markersById['shen-ji-new-village'].captureBit, reassigned ? 28 : 3);
    assert.equal(markersById['confucius-temple'].captureBit, undefined);
  }
  assert.ok(!markersById['central-park']);
  assert.equal(markersById['green-museumbrary'].captureBit, 10);
  // Match the current exporter even when testing an older paired artifact.
  delete world.districtLabels;
  const neighborhoods = neighborhoodLabels(world).map(({ name }) => bilingualNeighborhood(name));
  assert.equal(neighborhoods.length, 9);
  assert.ok(neighborhoods.includes('Shuinan 水湳'));
  assert.ok(neighborhoods.includes('Fengjia 逢甲'));
  for (const place of sights) {
    // Retained pre-combination geometry is a ROM-bound artifact. Main exports
    // the swapped ShenJi bit3 only from the combined native cartridge.
    const bit = !hasNewXitun && place.id === 'shen-ji-new-village' && markersById['confucius-temple']?.captureBit === 3
      ? markersById['confucius-temple'].captureBit : markersById[place.id].captureBit;
    assert.notEqual(bit, undefined, place.id);
    assert.match(landmarkCaptureCopy(place.id, 'guide', true), /encounter.*capture.*unlock.*TEAM/i);
  }
});
