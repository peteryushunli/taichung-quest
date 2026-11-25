import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const old = JSON.parse(readFileSync(new URL('./helpers/capture-registry-ec02.json', import.meta.url)));
const scriptDir = fileURLToPath(new URL('../scripts/', import.meta.url));
function validate(registry, named) {
  const result = spawnSync('python3', ['-B', '-c', `
import json, sys
sys.path.insert(0, sys.argv[1])
from capture_sites import captures_from_registry, validate_named_bindings
data = json.load(sys.stdin)
captures = captures_from_registry(data['registry'])
if data.get('named') is not None: validate_named_bindings(data['named'], captures)
print(json.dumps({place: site['stableSiteId'] for place, site in captures.items()}))
`, scriptDir], { input: JSON.stringify({ registry, named }), encoding: 'utf8' });
  if (result.error) throw result.error;
  return result;
}
function named(bhw) {
  return { sites: [['national-trade-center', 21], ['ding-sheng-bhw', bhw], ['the-lin', 23]]
    .map(([id, captureSiteId]) => ({ id, captureSiteId })) };
}
// Synthetic candidate using the confirmed identity rotation, without geometry
// or SRAM fields. Main must still export the actual combined native source.
function rotated() {
  const registry = structuredClone(old), sites = registry.sites;
  sites[0].siteSlug = 'taichung-park-lakeshore';
  sites[0].currentBinding = 'TaichungEncounter_TaichungParkLakeshore';
  for (const [stableSiteId, prior, speciesDex] of [[24, 13, 6], [25, 22, 9], [26, 0, 3]]) {
    const source = old.sites[prior];
    sites.push({ stableSiteId, siteSlug: source.siteSlug, currentBinding: source.currentBinding, speciesDex, level: 65 });
  }
  for (const bit of [13, 22]) Object.assign(sites[bit], { retired: true, currentBinding: null });
  return registry;
}

test('exporter preserves the old pair and assigns the active encounters without retired markers', () => {
  const baseline = validate(old, named(22));
  assert.equal(baseline.status, 0, baseline.stderr);
  assert.equal(JSON.parse(baseline.stdout)['maple-garden'], 0);
  const candidate = validate(rotated(), named(25));
  assert.equal(candidate.status, 0, candidate.stderr);
  const bits = JSON.parse(candidate.stdout);
  for (const [place, bit] of [['taichung-park-lakeshore', 0], ['botanical-garden', 18], ['jingming-street', 24], ['ding-sheng-bhw', 25], ['maple-garden', 26]])
    assert.equal(bits[place], bit);
  assert.ok(!Object.values(bits).some(bit => [13, 22].includes(bit)));
  for (const [place, bit] of Object.entries(JSON.parse(baseline.stdout))) {
    if (!['botanical-garden', 'maple-garden', 'jingming-street', 'ding-sheng-bhw'].includes(place)) assert.equal(bits[place], bit, place);
  }
});

test('a stale Xitun manifest cannot silently give Blastoise the retired Kabutops bit', () => {
  assert.notEqual(validate(rotated(), named(22)).status, 0);
  assert.notEqual(validate(old, named(25)).status, 0);
});

test('exporter rejects reused history, wrong species, missing slots and ambiguous active bindings', () => {
  const mutations = [
    sites => { sites[26].stableSiteId = 22; },
    sites => { sites[25].speciesDex = 141; },
    sites => { sites[24].level = 60; },
    sites => { sites[0].siteSlug = 'maple-garden'; },
    sites => { sites[18].retired = true; },
    sites => { sites[18].currentBinding = 'old-site'; },
    sites => { sites[0].speciesDex = 71; },
    sites => { sites[18].speciesDex = 131; },
    sites => { sites[13].speciesDex = 6; },
    sites => { sites.pop(); },
    sites => { sites[23].currentBinding = sites[21].currentBinding; },
  ];
  for (const mutate of mutations) {
    const registry = rotated(); mutate(registry.sites);
    assert.notEqual(validate(registry).status, 0, mutate.toString());
  }
});

function yuanbao() {
  const registry = rotated();
  registry.sites.push(
    { stableSiteId: 27, siteSlug: 'central-park-mew-reserved', reserved: true, species: null,
      speciesDex: null, level: null, entryScript: null, currentBinding: null },
    { stableSiteId: 28, siteSlug: 'yuanbao-temple', speciesDex: 113, level: 60,
      entryScript: 'TaichungEncounter_YuanbaoTemple', currentBinding: 'TaichungCity_Sign_YuanbaoTemple' },
  );
  return registry;
}

test('Yuanbao uses slot 28 while reserved slot 27 has no marker or interaction', () => {
  const candidate = validate(yuanbao(), named(25));
  assert.equal(candidate.status, 0, candidate.stderr);
  const bits = JSON.parse(candidate.stdout);
  assert.equal(bits['yuanbao-temple'], 28);
  assert.ok(!Object.values(bits).includes(27));
  for (const mutate of [
    slots => { slots[27].currentBinding = 'TaichungEncounter_CentralParkMew'; },
    slots => { slots[27].reserved = false; },
    slots => { slots[27].speciesDex = 151; },
    slots => { slots[28].level = 65; },
    slots => { slots[28].currentBinding = null; },
  ]) {
    const registry = yuanbao(); mutate(registry.sites);
    assert.notEqual(validate(registry).status, 0, mutate.toString());
  }
});
