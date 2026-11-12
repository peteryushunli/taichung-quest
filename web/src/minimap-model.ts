import { isFieldSnapshot, NAVIGATION_FLAGS } from './navigation-bridge.ts';
import type { NavigationSnapshot } from './navigation-bridge';
import type { OnboardingSnapshot } from './onboarding-bridge';

type Pair = number[];
type LocalizedName = { en: string; zh: string };
export type MinimapGeometry = {
  schemaVersion: number;
  geometryFingerprintSha256: string;
  world: { width: number; height: number };
  mapsByNativeKey: Record<string, {
    kind: string; width: number; height: number; projection: string;
    worldOrigin?: Pair; worldRect?: Pair; parentNativeKey?: string;
    parentMarkerId?: string; parentEntranceWorld?: Pair; indoorLabel?: LocalizedName;
  }>;
  markersById: Record<string, { id: string; world: Pair; exteriorNativeKey: string; name: LocalizedName }>;
};
export type MinimapPosition = {
  worldX: number; worldY: number; u: number; v: number; facing: number;
  districtKey: string; indoor: boolean; indoorLabel?: LocalizedName;
  landmarkId: string; landmarkName: LocalizedName;
};

export function projectNavigation(packet: NavigationSnapshot, geometry: MinimapGeometry): MinimapPosition | undefined {
  if (geometry.schemaVersion !== 1 || !isFieldSnapshot(packet)) return;
  const key = `${packet.mapGroup}:${packet.mapNumber}`;
  const map = geometry.mapsByNativeKey[key];
  if (!map || packet.width !== map.width || packet.height !== map.height) return;
  const indoor = map.kind === 'interior';
  const outdoor = map.kind === 'exterior';
  if ((!indoor && !outdoor) || !!(packet.flags & NAVIGATION_FLAGS.INDOOR) !== indoor || !!(packet.flags & NAVIGATION_FLAGS.OUTDOOR) !== outdoor) return;
  // Match the native map-type categories as well as its positive scope flag.
  if (indoor ? ![4, 8, 9].includes(packet.mapType) : ![1, 2, 3, 5, 6].includes(packet.mapType)) return;
  let world: Pair | undefined;
  let districtKey: string;
  if (indoor) {
    if (map.projection !== 'parent-entrance' || !map.parentNativeKey || !map.parentMarkerId) return;
    const parent = geometry.mapsByNativeKey[map.parentNativeKey];
    const marker = geometry.markersById[map.parentMarkerId];
    if (parent?.kind !== 'exterior' || !marker || marker.exteriorNativeKey !== map.parentNativeKey || !map.parentEntranceWorld || marker.world.some((v, i) => v !== map.parentEntranceWorld![i])) return;
    world = map.parentEntranceWorld;
    districtKey = map.parentNativeKey;
  } else {
    if (map.projection !== 'local-plus-world-origin' || !map.worldOrigin) return;
    world = [map.worldOrigin[0] + packet.x, map.worldOrigin[1] + packet.y];
    districtKey = key;
  }
  if (!world || world.length !== 2 || !world.every(Number.isInteger) || world[0] < 0 || world[1] < 0 || world[0] >= geometry.world.width || world[1] >= geometry.world.height) return;
  // A district with no landmark of its own (Nantun North, Old City North) names the nearest landmark anywhere in the city.
  const own = Object.values(geometry.markersById).filter((marker) => marker.exteriorNativeKey === districtKey);
  const candidates = own.length ? own : Object.values(geometry.markersById);
  const nearest = candidates.reduce<typeof candidates[number] | undefined>((best, marker) => {
    const distance = (m: typeof marker) => (m.world[0] - world![0]) ** 2 + (m.world[1] - world![1]) ** 2;
    return !best || distance(marker) < distance(best) ? marker : best;
  }, undefined);
  if (!nearest) return;
  return {
    worldX: world[0], worldY: world[1], u: (world[0] + .5) / geometry.world.width, v: (world[1] + .5) / geometry.world.height,
    facing: packet.facing, districtKey, indoor, indoorLabel: indoor ? map.indoorLabel : undefined,
    landmarkId: nearest.id, landmarkName: nearest.name,
  };
}

/** The radar only follows the player outdoors; indoors (any interior) it hides like in menus and battles. */
export function radarPosition(position?: MinimapPosition) {
  return position && !position.indoor ? position : undefined;
}

/** The native tour publishes its real position even while dialogue hides navigation.
 * Only its minimap topic through farewell may use this separate, non-navigation view.
 */
export function projectTutorial(packet: OnboardingSnapshot, geometry: MinimapGeometry): MinimapPosition | undefined {
  if (geometry.schemaVersion !== 1 || packet.phase < 6 || packet.phase > 9 ||
      !(packet.flags & 1) || !(packet.flags & 4)) return;
  const key = `${packet.mapGroup}:${packet.mapNumber}`;
  const map = geometry.mapsByNativeKey[key];
  if (map?.kind !== 'exterior' || map.projection !== 'local-plus-world-origin' || !map.worldOrigin ||
      !Number.isInteger(packet.x) || !Number.isInteger(packet.y) || packet.x < 0 || packet.y < 0 ||
      packet.x >= map.width || packet.y >= map.height) return;
  const [worldX, worldY] = [map.worldOrigin[0] + packet.x, map.worldOrigin[1] + packet.y];
  if (worldX < 0 || worldY < 0 || worldX >= geometry.world.width || worldY >= geometry.world.height) return;
  const own = Object.values(geometry.markersById).filter((marker) => marker.exteriorNativeKey === key);
  const candidates = own.length ? own : Object.values(geometry.markersById);
  const nearest = candidates.reduce<typeof candidates[number] | undefined>((best, marker) => {
    const distance = (m: typeof marker) => (m.world[0] - worldX) ** 2 + (m.world[1] - worldY) ** 2;
    return !best || distance(marker) < distance(best) ? marker : best;
  }, undefined);
  if (!nearest) return;
  return { worldX, worldY, u: (worldX + .5) / geometry.world.width, v: (worldY + .5) / geometry.world.height,
    // The tour has no facing field. Use a dot, rather than inventing a heading.
    facing: 0, districtKey: key, indoor: false, landmarkId: nearest.id, landmarkName: nearest.name };
}

/**
 * The minimap is a north-up rectangle `width` x `height` world tiles, one GBA pixel per tile,
 * always centred on the player (no clamping at the world edge, so the dark surround outlines
 * the city). Vector markers are centred on their exact tile. Places within `pinX`/`pinY` tiles
 * of the player show in place; pinned blips (gyms, home) further out sit on that inner box
 * along their bearing, so they always point the way without touching the frame.
 */
export const RADAR = { width: 60, height: 44, pinX: 27, pinY: 19 } as const;
/** src/assets/minimap/city.png: `tile` px per world tile plus a `margin`-tile dark border (scripts/derive-city-art.py). */
export const RADAR_ART = { tile: 1, margin: 2 } as const;
/** Logical 64×48 drawing with a 2-unit frame; CSS renders it at 48×36 GBA-equivalent pixels. */
export const RADAR_PANEL = { width: RADAR.width + 4, height: RADAR.height + 4, frame: 2 } as const;
/** World tile of the door of the house the game starts in. */
export const HOME_WORLD: Pair = [105, 120];
/** Native facing (1 south, 2 north, 3 west, 4 east) as a clockwise rotation from north. */
export const FACING_DEGREES: Record<number, number> = { 1: 180, 2: 0, 3: 270, 4: 90 };

/** The map's viewBox in tiles: the player's tile sits at column width/2 and row height/2. */
export function radarViewBox(tile: { x: number; y: number }, radar = RADAR) {
  return { x: tile.x - radar.width / 2, y: tile.y - radar.height / 2, width: radar.width, height: radar.height };
}

/**
 * Which tile a blip is drawn on: its own when within the pin box, otherwise (only when
 * `pinned`) the box edge along its bearing from the player, rounded to a whole tile.
 */
export function radarBlip(player: { x: number; y: number }, target: Pair, pinned: boolean, radar = RADAR) {
  const dx = target[0] - player.x;
  const dy = target[1] - player.y;
  if (Math.abs(dx) <= radar.pinX && Math.abs(dy) <= radar.pinY) return { x: target[0], y: target[1], onRim: false };
  if (!pinned) return;
  const scale = Math.min(dx ? radar.pinX / Math.abs(dx) : Infinity, dy ? radar.pinY / Math.abs(dy) : Infinity);
  return { x: player.x + Math.round(dx * scale), y: player.y + Math.round(dy * scale), onRim: true };
}

export function secondaryAction(packet?: NavigationSnapshot, position?: MinimapPosition): 'Back' | 'Bike' | 'Get off' {
  if (!packet || !position || position.indoor || !isFieldSnapshot(packet) || !(packet.flags & NAVIGATION_FLAGS.CAN_TOGGLE_BIKE)) return 'Back';
  return packet.flags & NAVIGATION_FLAGS.CYCLING ? 'Get off' : 'Bike';
}

export const MINIMAP_PREFERENCE = 'taichung-quest-minimap';
export function readMinimapPreference(storage?: Pick<Storage, 'getItem'>) {
  try { return storage?.getItem(MINIMAP_PREFERENCE) !== 'off'; } catch { return true; }
}
