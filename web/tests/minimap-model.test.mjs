import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { projectNavigation, secondaryAction, readMinimapPreference } from '../src/minimap-model.ts';

const geometry = JSON.parse(readFileSync(new URL('../src/data/minimap-contract.json', import.meta.url), 'utf8'));
const packet = { sequence: 2, frame: 1, flags: 79, x: 30, y: 66, mapGroup: 43, mapNumber: 0, facing: 2, mapType: 1, width: 44, height: 77, contextFlags: 0 };

test('all exterior tiles project into their authored district, or to the nearest landmark anywhere when the district has none', () => {
  let checked = 0;
  for (const [key, map] of Object.entries(geometry.mapsByNativeKey).filter(([, map]) => map.kind === 'exterior')) {
    for (let x = 0; x < map.width; x++) for (let y = 0; y < map.height; y++) {
      const [mapGroup, mapNumber] = key.split(':').map(Number);
      const position = projectNavigation({ ...packet, mapGroup, mapNumber, width: map.width, height: map.height, x, y }, geometry);
      assert.equal(position.worldX, map.worldOrigin[0] + x);
      assert.equal(position.worldY, map.worldOrigin[1] + y);
      assert.equal(position.u, (position.worldX + .5) / geometry.world.width);
      assert.equal(position.v, (position.worldY + .5) / geometry.world.height);
      const own = Object.values(geometry.markersById).some((marker) => marker.exteriorNativeKey === key);
      assert.equal(geometry.markersById[position.landmarkId].exteriorNativeKey === key, own);
      checked++;
    }
  }
  assert.equal(checked, 21105);
  const station = projectNavigation(packet, geometry);
  assert.deepEqual([station.worldX, station.worldY], [115, 119]);
  assert.equal(station.landmarkId, 'old-taichung-station');
});

test('all gym rooms and Welcome ignore room coordinates and use their explicit entrance anchor', () => {
  let checked = 0;
  for (const [key, map] of Object.entries(geometry.mapsByNativeKey).filter(([, map]) => map.kind === 'interior')) {
    const [mapGroup, mapNumber] = key.split(':').map(Number);
    for (const [x, y] of [[0, 0], [map.width - 1, map.height - 1]]) {
      const p = projectNavigation({ ...packet, mapGroup, mapNumber, flags: 23, mapType: 8, width: map.width, height: map.height, x, y }, geometry);
      assert.deepEqual([p.worldX, p.worldY], map.parentEntranceWorld);
      assert.equal(p.indoor, true);
      assert.equal(p.landmarkId, map.parentMarkerId);
    }
    checked++;
  }
  assert.equal(checked, 13);
});

test('invalid contexts, unknown maps, dimensions, scopes and bounds hide instead of inventing a position', () => {
  for (const change of [{ flags: 0 }, { flags: 31 }, { flags: 0x100 | 15 }, { flags: 23 }, { mapType: 8 }, { contextFlags: 1 }, { contextFlags: 0x8000 }, { width: 45 }, { height: 0 }, { mapNumber: 99 }, { mapGroup: 0 }, { facing: 0 }, { facing: 5 }, { x: -1 }, { x: 44 }, { y: 77 }, { x: .5 }]) assert.equal(projectNavigation({ ...packet, ...change }, geometry), undefined, JSON.stringify(change));
});

test('secondary action needs positive native eligibility and a mapped field snapshot', () => {
  const position = projectNavigation(packet, geometry);
  assert.equal(secondaryAction(packet, position), 'Bike');
  assert.equal(secondaryAction({ ...packet, flags: 111 }, position), 'Get off');
  assert.equal(secondaryAction({ ...packet, flags: 15 }, position), 'Back');
  assert.equal(secondaryAction({ ...packet, contextFlags: 32 }, position), 'Back');
  assert.equal(secondaryAction(packet, { ...position, indoor: true }), 'Back');
  assert.equal(secondaryAction(packet), 'Back');
  assert.equal(secondaryAction(), 'Back');
});

test('minimap defaults On and tolerates unavailable browser storage', () => {
  assert.equal(readMinimapPreference(), true);
  assert.equal(readMinimapPreference({ getItem: () => null }), true);
  assert.equal(readMinimapPreference({ getItem: () => 'off' }), false);
  assert.equal(readMinimapPreference({ getItem: () => 'on' }), true);
  assert.equal(readMinimapPreference({ getItem: () => 'unexpected' }), true);
  assert.equal(readMinimapPreference({ getItem: () => { throw new Error('Storage blocked'); } }), true);
});
