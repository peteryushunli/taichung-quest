import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { browserLocale, getLocale, setLocale, t } from '../src/i18n.ts';

test('first visits follow the browser: the first Chinese or English preference wins', () => {
  assert.equal(browserLocale(['zh-TW', 'en-US']), 'zh-Hant');
  assert.equal(browserLocale(['zh-Hant-TW']), 'zh-Hant');
  assert.equal(browserLocale(['zh-CN']), 'zh-Hant', 'Traditional is the only Chinese the game has');
  assert.equal(browserLocale(['en-GB', 'zh-TW']), 'en');
  assert.equal(browserLocale(['ja-JP', 'zh-TW']), 'zh-Hant');
  assert.equal(browserLocale(['ja-JP', 'fr-FR']), 'en');
  assert.equal(browserLocale([]), 'en');
});

// Both geographic introductions use this existing translation key; numeric game
// progress and the separate landing facts continue to derive from their data.
test('map introduction switches between the requested English and Traditional Chinese', () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const previousLocale = getLocale();
  globalThis.document = { documentElement: { lang: 'en' }, querySelectorAll: () => [] };
  try {
    const english = 'Explore Taichung’s real neighborhoods and landmarks.';
    setLocale('en', 'native'); assert.equal(t(english), english);
    setLocale('zh-Hant', 'native'); assert.equal(t(english), '探索臺中的真實街區與地標。');
    setLocale('en', 'native'); assert.equal(t(english), english);
  } finally {
    setLocale(previousLocale, 'native');
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else delete globalThis.document;
  }
});


test('every current gym partner has an English and Traditional Chinese icon label', () => {
  const roster = JSON.parse(readFileSync(new URL('./fixtures/gym-rosters-3349d1f1.json', import.meta.url)));
  const names = [...new Set(Object.values(roster.sites).flatMap(site => site.species))]
    .map(species => ({FARFETCHD:'Farfetch’d',MR_MIME:'Mr. Mime'}[species] ?? species[0] + species.slice(1).toLowerCase()));
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const previousLocale = getLocale();
  globalThis.document = { documentElement: { lang: 'en' }, querySelectorAll: () => [] };
  try {
    setLocale('en', 'native');
    for (const name of names) assert.equal(t(name), name);
    setLocale('zh-Hant', 'native');
    for (const name of names) assert.match(t(name), /[\u3400-\u9fff]/, `${name} has a Traditional Chinese label`);
    assert.equal(t('Pidgeot'), '大比鳥'); assert.equal(t('Mr. Mime'), '魔牆人偶'); assert.equal(t('Poliwrath'), '蚊香泳士');
  } finally {
    setLocale(previousLocale, 'native');
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else delete globalThis.document;
  }
});
