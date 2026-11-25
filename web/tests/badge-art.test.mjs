import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { isGym } from '../src/landing-model.ts';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));

test('all ten sharp masters preserve Story hashes, stable completion bits and bilingual gym names', () => {
  const manifest = read('../src/data/badge-display.json');
  const gyms = read('../src/data/landmarks.json').filter(isGym);
  assert.equal(manifest.assetSetId, 'taichung-badges-masters-v1');
  assert.equal(manifest.sourceManifestSha256, 'fe6a3224012d2ff5e3d050f4e8c511a2201cdca9f927505a04229048f8cd47de');
  assert.equal(manifest.badges.length, 10);
  manifest.badges.forEach((badge, index) => {
    assert.equal(badge.gymIndex, index); assert.equal(badge.completionBit, index);
    assert.equal(badge.landmarkId, gyms[index].id);
    assert.equal(badge.name.en, gyms[index].badgeNameEn); assert.equal(badge.name.zh, gyms[index].badgeNameZh);
    const svg = readFileSync(new URL(`../src/assets/badges/masters-v1/${badge.landmarkId}.svg`, import.meta.url));
    assert.equal(createHash('sha256').update(svg).digest('hex'), badge.svgSha256);
    assert.match(svg.toString(), /viewBox="0 0 256 256"/);
    assert.doesNotMatch(svg.toString(), /<script|<image|href=/i);
  });
  assert.equal(manifest.badges[8].landmarkId, 'wanhe-temple'); // Legacy native maple-garden identity.
  assert.match(manifest.provenance, /faithful vector redraws/);
});
