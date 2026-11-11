import { test } from 'node:test';
import assert from 'node:assert/strict';
import { browserLocale } from '../src/i18n.ts';

test('first visits follow the browser: the first Chinese or English preference wins', () => {
  assert.equal(browserLocale(['zh-TW', 'en-US']), 'zh-Hant');
  assert.equal(browserLocale(['zh-Hant-TW']), 'zh-Hant');
  assert.equal(browserLocale(['zh-CN']), 'zh-Hant', 'Traditional is the only Chinese the game has');
  assert.equal(browserLocale(['en-GB', 'zh-TW']), 'en');
  assert.equal(browserLocale(['ja-JP', 'zh-TW']), 'zh-Hant');
  assert.equal(browserLocale(['ja-JP', 'fr-FR']), 'en');
  assert.equal(browserLocale([]), 'en');
});
