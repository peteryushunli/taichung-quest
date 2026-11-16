import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { boundPresentation, districtLabelsInGeometry, homeWorldInGeometry, placeWorldInGeometry, streetsInGeometry } from '../src/city-geometry.ts';
import { currentStreet } from '../src/street-label-model.ts';
import { districtLabelSpots, visitorMapUrl } from '../src/landing-model.ts';

const fingerprint = 'a'.repeat(64);
function geometry() {
  return { schemaVersion: 1, geometryFingerprintSha256: fingerprint, world: { width: 231, height: 149 },
    mapsByNativeKey: {
      '7:1': { kind: 'exterior', width: 81, height: 50, projection: 'local-plus-world-origin', worldOrigin: [17, 41] },
      '7:2': { kind: 'exterior', width: 81, height: 50, projection: 'local-plus-world-origin', worldOrigin: [98, 41] },
      '7:3': { kind: 'interior', width: 13, height: 10, projection: 'parent-entrance', parentNativeKey: '7:1', parentMarkerId: 'station', parentEntranceWorld: [24,47] },
    }, markersById: { station: { id: 'station', world: [24,47], exteriorNativeKey: '7:1', name: { en: 'Station', zh: '車站' } } },
    presentation: { geometryFingerprintSha256: fingerprint, homeWorld: [25,47], districtLabels: [{ label: 'CITY 舊城', world: [45,43] }], streets: [
      { id: 'boulevard', name: { en: 'Taiwan Boulevard', zh: '臺灣大道' }, worldRects: [[17,48,179,51]], priority: 2 },
      { id: 'connector', name: { en: 'Connector', zh: '聯絡道' }, worldRects: [[40,41,43,91]], priority: 1 },
    ] } };
}
const packet = { frame: 2, sequence: 4, flags: 79, x: 8, y: 7, width: 81, height: 50, mapGroup: 7, mapNumber: 1, facing: 2, mapType: 1, contextFlags: 0 };
const live = (change = {}) => ({ phase: 'live', snapshot: { ...packet, ...change } });

test('a road persists while stationary, through facing/bike changes and across a chunk seam', () => {
  const g = geometry();
  for (const facing of [1,2,3,4]) assert.equal(currentStreet(live({ facing }), g)?.id, 'boulevard');
  assert.equal(currentStreet(live({ flags: 111 }), g)?.name.zh, '臺灣大道');
  assert.equal(currentStreet(live({ x: 80 }), g)?.id, 'boulevard');
  assert.equal(currentStreet(live({ x: 0, mapNumber: 2 }), g)?.id, 'boulevard');
});
test('half-open road bounds and explicit overlap priority name only the actual road region', () => {
  const g = geometry();
  assert.equal(currentStreet(live({ x: 23 }),g)?.id,'boulevard');
  assert.equal(currentStreet(live({ x: 23, y: 10 }),g)?.id,'connector');
  assert.equal(currentStreet(live({ x: 23, y: 6 }),g)?.id,'connector');
  assert.equal(currentStreet(live({ x: 26, y: 6 }),g),undefined);
  assert.equal(currentStreet(live({ y: 10 }),g),undefined);
  g.presentation.streets[1].priority=2;
  assert.equal(currentStreet(live({ x: 23 }),g),undefined,'Ambiguous tied junction must hide');
});
test('road names hide in interiors, menus, battles, stale/unknown/bad native contexts', () => {
  const g=geometry();
  for (const phase of ['hidden','connecting','unavailable']) assert.equal(currentStreet({phase,snapshot:packet},g),undefined);
  for (const change of [{contextFlags:1},{contextFlags:4},{contextFlags:32},{contextFlags:0x8000},{mapNumber:99},{x:-1},{x:81},{width:80},{flags:0}]) assert.equal(currentStreet(live(change),g),undefined,JSON.stringify(change));
  assert.equal(currentStreet(live({flags:23,mapNumber:3,mapType:8,x:6,y:5,width:13,height:10}),g),undefined);
});
test('missing or mismatched geometry annotations never retain a plausible road or home', () => {
  const g=geometry();g.presentation.geometryFingerprintSha256='b'.repeat(64);
  assert.equal(boundPresentation(g),undefined);assert.equal(currentStreet(live(),g),undefined);assert.equal(homeWorldInGeometry(g),undefined);assert.deepEqual(districtLabelsInGeometry(g),[]);
  delete g.presentation;assert.equal(currentStreet(live(),g),undefined);
});
test('malformed, unbounded or duplicate road regions fail closed', () => {
  for (const change of [r=>r.worldRects=[[0,0,232,1]],r=>r.worldRects=[[0,0,0,1]],r=>r.worldRects=[[0,0,1.5,2]],r=>r.name.zh='',r=>r.priority=NaN,r=>r.id='connector']) {
    const g=geometry();change(g.presentation.streets[0]);assert.deepEqual(streetsInGeometry(g),[]);
  }
});
test('new geometry uses only exported markers, home and labels, never old catalog coordinates', () => {
  const g=geometry();assert.deepEqual(placeWorldInGeometry({id:'station',world:[200,120]},g),[24,47]);
  assert.equal(placeWorldInGeometry({id:'unexported',world:[25,47]},g),undefined);
  assert.deepEqual(homeWorldInGeometry(g),[25,47]);assert.deepEqual(districtLabelSpots(g),districtLabelsInGeometry(g));
  g.markersById.station.world=[99,47];assert.equal(placeWorldInGeometry({id:'station'},g),undefined,'Marker must belong to its actual exterior map');
  delete g.presentation;assert.deepEqual(districtLabelSpots(g),[]);
});
test('released geometry retains its eight legacy outdoor sights and home until Maps replaces it', () => {
  const g=JSON.parse(readFileSync(new URL('./fixtures/released48fe-minimap-contract.json',import.meta.url)));
  const sights=JSON.parse(readFileSync(new URL('./fixtures/released48fe-sights.json',import.meta.url)));
  for(const p of sights) assert.deepEqual(placeWorldInGeometry(p,g),p.world);
  assert.deepEqual(homeWorldInGeometry(g),[105,120]);
});
test('visitor map links use real geographic coordinates, independent of game-world rotation', () => {
  const location={latitude:24.137,longitude:120.686};
  const url=new URL(visitorMapUrl(location));assert.equal(url.hostname,'www.google.com');assert.equal(url.searchParams.get('query'),'24.137,120.686');
  for(const bad of [undefined,{latitude:91,longitude:120},{latitude:24,longitude:181},{latitude:NaN,longitude:120}]) assert.equal(visitorMapUrl(bad),undefined);
});

test('full guide and radar art dimensions match the bundled geometry, catching a stale render after export', () => {
  const g=JSON.parse(readFileSync(new URL('../src/data/minimap-contract.json',import.meta.url)));
  const full=readFileSync(new URL('../src/assets/landing/city-map.png',import.meta.url));
  const radar=readFileSync(new URL('../src/assets/minimap/city.png',import.meta.url));
  assert.deepEqual([full.readUInt32BE(16),full.readUInt32BE(20)],[g.world.width*16,g.world.height*16]);
  assert.deepEqual([radar.readUInt32BE(16),radar.readUInt32BE(20)],[g.world.width+4,g.world.height+4]);
});
