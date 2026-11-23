import assert from 'node:assert/strict';
import test from 'node:test';
import { unsupportedBrowserMessage } from '../src/browser-support.ts';

const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9';
const webview = `${ANDROID} Build/AP3A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/142.0.0.0 Mobile Safari/537.36`;
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';

test('Android app browsers are sent to Chrome', () => {
  for (const agent of [webview, `${webview} [FB_IAB/FB4A;FBAV/500.0]`, `${webview} Instagram 400.0 Android`,
    `${ANDROID}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36 Line/15.0.0`])
    assert.match(unsupportedBrowserMessage(agent), /inside this app.*Chrome to play/);
});

test('iPhone and iPad app browsers are sent to Safari', () => {
  assert.match(unsupportedBrowserMessage(`${IPHONE} Mobile/15E148 [LinkedInApp]`), /Open this page in Safari to play/);
  assert.match(unsupportedBrowserMessage('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)', 5), /Safari to play/);
});

test('an outdated full browser is asked to update, not to open itself', () => {
  for (const agent of [
    `${ANDROID}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.0.0 Mobile Safari/537.36`,
    `${IPHONE} Version/14.0 Mobile/15E148 Safari/604.1`,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:70.0) Gecko/20100101 Firefox/70.0'])
    assert.match(unsupportedBrowserMessage(agent), /^This browser can’t run the game\. Update it/);
});
