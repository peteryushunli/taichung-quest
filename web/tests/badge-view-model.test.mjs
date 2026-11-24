import assert from 'node:assert/strict';
import test from 'node:test';
import { BADGE_ASSET_SET, BADGE_GYM_IDS, pairedBadgePresentation } from '../src/badge-view-model.ts';
const sha = 'a'.repeat(64);
const binding = { schemaVersion: 1, assetSetId: BADGE_ASSET_SET, gymIds: [...BADGE_GYM_IDS] };
const build = { sha256: sha, bytes: 16, badgePresentation: binding };
test('artwork requires exact ten-slot ROM-bound pairing, including historical slot5 and slot8 credit', () => {
  assert.equal(pairedBadgePresentation(build, sha, 16), true);
  assert.equal(BADGE_GYM_IDS[5], 'confucius-temple'); assert.equal(BADGE_GYM_IDS[8], 'wanhe-temple');
  for (const change of [{ sha256: 'b'.repeat(64) }, { bytes: 17 }, { badgePresentation: undefined },
    ...[{ schemaVersion: 2 }, { assetSetId: 'other' }, { gymIds: BADGE_GYM_IDS.slice(1) },
      { gymIds: [...BADGE_GYM_IDS].map((id, i) => i === 5 ? 'shen-ji-new-village' : id) },
      { gymIds: [...BADGE_GYM_IDS].reverse() }].map(p => ({ badgePresentation: { ...binding, ...p } }))])
    assert.equal(pairedBadgePresentation({ ...build, ...change }, sha, 16), false);
});
