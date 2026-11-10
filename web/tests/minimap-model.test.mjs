import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { projectNavigation, secondaryAction, readMinimapPreference, radarPosition, radarViewBox, radarBlip, RADAR, RADAR_ART, HOME_WORLD, FACING_DEGREES } from '../src/minimap-model.ts';

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

test('the radar hides in every interior and follows every exterior position', () => {
  for (const [key, map] of Object.entries(geometry.mapsByNativeKey).filter(([, map]) => map.kind === 'interior')) {
    const [mapGroup, mapNumber] = key.split(':').map(Number);
    const indoor = projectNavigation({ ...packet, mapGroup, mapNumber, flags: 23, mapType: 8, width: map.width, height: map.height, x: 1, y: 1 }, geometry);
    assert.equal(indoor.indoor, true, key);
    assert.equal(radarPosition(indoor), undefined, key);
  }
  const station = projectNavigation(packet, geometry);
  assert.equal(radarPosition(station), station);
  assert.equal(radarPosition(undefined), undefined);
});

test('the radar is zoomed out and stays centred on the player even at the world edge', () => {
  assert.ok(RADAR.diameter >= 56 && RADAR.diameter <= 64);
  assert.ok(RADAR.rim < RADAR.diameter / 2 - 2, 'pinned blips must sit fully inside the circle');
  assert.deepEqual(radarViewBox({ x: 115, y: 119 }), { x: 85.5, y: 89.5, size: RADAR.diameter });
  assert.deepEqual(radarViewBox({ x: 0, y: 0 }), { x: .5 - RADAR.diameter / 2, y: .5 - RADAR.diameter / 2, size: RADAR.diameter });
  const corner = radarViewBox({ x: geometry.world.width - 1, y: geometry.world.height - 1 });
  assert.equal(corner.x + corner.size / 2, geometry.world.width - .5);
  assert.equal(corner.y + corner.size / 2, geometry.world.height - .5);
  assert.deepEqual(FACING_DEGREES, { 1: 180, 2: 0, 3: 270, 4: 90 });
});

test('the radar art covers the world plus its dark margin at the declared scale', () => {
  const png = readFileSync(new URL('../src/assets/minimap/city.png', import.meta.url));
  const size = [png.readUInt32BE(16), png.readUInt32BE(20)];
  assert.deepEqual(size, [geometry.world.width, geometry.world.height].map((tiles) => (tiles + 2 * RADAR_ART.margin) * RADAR_ART.tile));
  assert.ok(png.length < 8192, 'the radar art is a few flat colours, not a render');
});

test('an off-screen gym is pinned to the rim along its true bearing; other places hide out of range', () => {
  const player = { x: 3, y: 40 };
  const station = geometry.markersById['old-taichung-station'].world;
  const pinned = radarBlip(player, station, true);
  assert.equal(pinned.onRim, true);
  const dx = pinned.x - (player.x + .5), dy = pinned.y - (player.y + .5);
  assert.ok(Math.abs(Math.hypot(dx, dy) - RADAR.rim) < 1e-9, 'pinned on the rim');
  assert.ok(Math.abs(Math.atan2(dy, dx) - Math.atan2(station[1] - player.y, station[0] - player.x)) < 1e-9, 'bearing preserved');
  assert.ok(dx > 0 && dy > 0, 'the Station is east-south-east of the west highway');
  assert.equal(radarBlip(player, station, false), undefined);
  // Due north, exactly at the rim: still in place.
  assert.deepEqual(radarBlip(player, [3, 40 - RADAR.rim], true), { x: 3.5, y: 40.5 - RADAR.rim, onRim: false });
  assert.deepEqual(radarBlip(player, [8, 37], false), { x: 8.5, y: 37.5, onRim: false });
  const west = radarBlip({ x: 120, y: 40 }, [10, 40], true);
  assert.deepEqual([west.x, west.y], [120.5 - RADAR.rim, 40.5]);
});

test('home is the starting house door, an outdoor tile of the Station district, pinned like a gym', () => {
  const district = geometry.mapsByNativeKey['43:0'];
  const [x, y] = [HOME_WORLD[0] - district.worldOrigin[0], HOME_WORLD[1] - district.worldOrigin[1]];
  const position = projectNavigation({ ...packet, x, y }, geometry);
  assert.deepEqual([position.worldX, position.worldY], HOME_WORLD);
  assert.equal(radarBlip({ x: 115, y: 119 }, HOME_WORLD, true).onRim, false);
  assert.equal(radarBlip({ x: 31, y: 143 }, HOME_WORLD, true).onRim, true);
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
