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
  for (const id of ['confucius-temple', 'luce-chapel', 'rainbow-village', 'city-hall', 'jingming-street', 'unknown']) {
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
  const newSites = [['national-trade-center', 21], ['ding-sheng-bhw', rotated ? 25 : 22], ['the-lin', 23]];
  if (rotated) {
    assert.equal(markersById['botanical-garden'].captureBit, 0);
    assert.equal(markersById['jingming-street'].captureBit, 24);
    assert.ok(!Object.values(markersById).some(marker => [13, 18, 22].includes(marker.captureBit)));
  }
  const hasNewXitun = newSites.some(([id]) => extraSights.some(place => place.id === id));
  assert.equal(sights.length, hasNewXitun ? 20 : 17);
  if (hasNewXitun) {
    for (const [id, bit] of newSites) assert.equal(markersById[id]?.captureBit, bit, id);
    assert.equal(markersById['shen-ji-new-village'].captureBit, 3);
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
