import { isFieldSnapshot, NAVIGATION_FLAGS } from './navigation-bridge.ts';
import type { NavigationSnapshot } from './navigation-bridge';
import type { OnboardingSnapshot } from './onboarding-bridge';

type Pair = number[];
type LocalizedName = { en: string; zh: string };
type StreetBand = { name: LocalizedName; bounds: number[]; axis: string };
export type MinimapGeometry = {
  schemaVersion: number;
  geometryFingerprintSha256: string;
  coordinateSystem?: { northUp?: boolean };
  world: {
    width: number; height: number;
    homeWorld?: Pair;
    districtLabels?: { label: string; x: number; y: number }[];
    streetBands?: StreetBand[];
    neighborhoods?: { name: LocalizedName; tile: Pair }[];
  };
  mapsByNativeKey: Record<string, {
    kind: string; width: number; height: number; projection: string;
    worldOrigin?: Pair; worldRect?: Pair; parentNativeKey?: string;
    parentMarkerId?: string; parentEntranceWorld?: Pair; indoorLabel?: LocalizedName;
    districtName?: LocalizedName;
    districtBefore?: { y: number; name: LocalizedName };
  }>;
  markersById: Record<string, { id: string; world: Pair; exteriorNativeKey: string; name: LocalizedName; captureBit?: number }>;
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

export function districtAt(position: MinimapPosition | undefined, geometry: MinimapGeometry) {
  if (!position || position.indoor) return;
  const map = geometry.mapsByNativeKey[position.districtKey];
  const split = map?.districtBefore;
  return split && position.worldY < split.y ? split.name : map?.districtName;
}

export function streetAt(position: MinimapPosition | undefined, geometry: MinimapGeometry) {
  if (!position || position.indoor) return;
  const { worldX: x, worldY: y, facing } = position;
  const axis = facing >= 3 ? 'h' : 'v';
  let street: LocalizedName | undefined;
  let closest = Infinity;
  for (const band of geometry.world.streetBands ?? []) {
    const [left, top, right, bottom] = band.bounds;
    if (x < left || x >= right || y < top || y >= bottom) continue;
    const distance = band.axis === 'h'
      ? Math.abs(y + .5 - (top + bottom) / 2) / (bottom - top)
      : Math.abs(x + .5 - (left + right) / 2) / (right - left);
    // At crossings, prefer the street the player is facing along.
    const score = distance + Number(band.axis !== axis);
    if (score < closest) { street = band.name; closest = score; }
  }
  return street;
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

export const RADAR = { width: 60, height: 44 } as const;
export type RadarMode = 'nearby' | 'districts' | 'citywide';
type RadarBounds = { width: number; height: number };
/** src/assets/minimap/city.png: `tile` px per world tile plus a `margin`-tile dark border (scripts/derive-city-art.py). */
export const RADAR_ART = { tile: 1, margin: 2 } as const;
/** Logical 64×48 drawing with a 2-unit frame; CSS renders it at 48×36 GBA-equivalent pixels. */
export const RADAR_PANEL = { width: RADAR.width + 4, height: RADAR.height + 4, frame: 2 } as const;
/** World tile of the door of the house the game starts in. */
export const HOME_WORLD: Pair = [105, 120];
/** Native facing (1 south, 2 north, 3 west, 4 east) as a clockwise rotation from north. */
export const FACING_DEGREES: Record<number, number> = { 1: 180, 2: 0, 3: 270, 4: 90 };

/** The map's viewBox in tiles: the player's tile sits at column width/2 and row height/2. */
export function radarViewBox(tile: { x: number; y: number }, radar: RadarBounds = RADAR) {
  return { x: tile.x - radar.width / 2, y: tile.y - radar.height / 2, width: radar.width, height: radar.height };
}

export function radarViewport(tile: { x: number; y: number }, mode: RadarMode, world: RadarBounds) {
  if (mode === 'nearby') return radarViewBox(tile);
  const scale = mode === 'citywide' ? Math.max((world.width + 4) / RADAR.width, (world.height + 4) / RADAR.height) : 2.1;
  const size = { width: RADAR.width * scale, height: RADAR.height * scale };
  const center = mode === 'citywide' ? { x: world.width / 2, y: world.height / 2 } : {
    x: Math.max(size.width / 2, Math.min(world.width - size.width / 2, tile.x)),
    y: Math.max(size.height / 2, Math.min(world.height - size.height / 2, tile.y)),
  };
  return radarViewBox(center, size);
}

export function radarContains(view: ReturnType<typeof radarViewBox>, tile: Pair) {
  const x = tile[0] + .5;
  const y = tile[1] + .5;
  return x >= view.x && x < view.x + view.width && y >= view.y && y < view.y + view.height;
}

export function secondaryAction(packet?: NavigationSnapshot, position?: MinimapPosition): 'Back' | 'Bike' | 'Get off' {
  if (!packet || !position || position.indoor || !isFieldSnapshot(packet) || !(packet.flags & NAVIGATION_FLAGS.CAN_TOGGLE_BIKE)) return 'Back';
  return packet.flags & NAVIGATION_FLAGS.CYCLING ? 'Get off' : 'Bike';
}

export const MINIMAP_PREFERENCE = 'taichung-quest-minimap';
export function readMinimapPreference(storage?: Pick<Storage, 'getItem'>) {
  try { return storage?.getItem(MINIMAP_PREFERENCE) !== 'off'; } catch { return true; }
}
