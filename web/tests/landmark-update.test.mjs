import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { isGym, localizedPlace } from '../src/landing-model.ts';
import { landmarkCaptureCopy } from '../src/capture-copy.ts';
const read = name => JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url)));

test('slot five is Confucius/Rites, ShenJi is visit-only, and only the three approved new destinations have visitor copy', () => {
  const gyms = read('landmarks').filter(isGym);
  assert.equal(gyms.length, 10); assert.equal(gyms[5].id, 'confucius-temple');
  assert.deepEqual([gyms[5].gymLeaderEn, gyms[5].gymLeaderZh, gyms[5].badgeNameEn, gyms[5].badgeNameZh], ['Wenyi', '文儀', 'Rites Badge', '禮儀徽章']);
  const shenji = read('sights').find(p => p.id === 'shen-ji-new-village');
  assert.equal(isGym(shenji), false); assert.equal(shenji.gymLeaderEn, undefined);
  assert.ok(landmarkCaptureCopy(shenji.id, 'guide')); assert.equal(landmarkCaptureCopy('confucius-temple', 'guide'), undefined);
  const copy = read('boulevard-sight-copy');
  for (const id of ['national-trade-center', 'ding-sheng-bhw', 'the-lin']) {
    assert.ok(copy[id].description && copy[id].descriptionZh && copy[id].descriptionSources.length);
    for (const locale of ['en', 'zh-Hant']) assert.match(localizedPlace({ ...copy[id], nameEn: id, nameZh: id }, locale).url, /^https:/);
    assert.doesNotMatch(copy[id].description, /opening hours|ticket|open daily|free entry|public observation/i);
  }
  for (const id of ['sakura-evening-market', 'huimin-park', 'xitun-civic-housing']) assert.equal(copy[id], undefined);
  assert.equal(new URL(copy['national-trade-center'].officialUrl).searchParams.get('query'), 'NTC國家商貿中心 臺中市西屯區市政北二路282號');
  assert.equal(new URL(copy['ding-sheng-bhw'].officialUrl).searchParams.get('query'), '鼎盛BHW 臺中市西屯區市政北二路230號');
  assert.equal(new URL(copy['the-lin'].officialUrl).hostname, 'www.thelin.com.tw');
});
