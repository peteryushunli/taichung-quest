import { test } from 'node:test';
import assert from 'node:assert/strict';
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
