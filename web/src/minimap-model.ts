import { isFieldSnapshot, NAVIGATION_FLAGS } from './navigation-bridge.ts';
import type { NavigationSnapshot } from './navigation-bridge';

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

export function secondaryAction(packet?: NavigationSnapshot, position?: MinimapPosition): 'Back' | 'Bike' | 'Get off' {
  if (!packet || !position || position.indoor || !isFieldSnapshot(packet) || !(packet.flags & NAVIGATION_FLAGS.CAN_TOGGLE_BIKE)) return 'Back';
  return packet.flags & NAVIGATION_FLAGS.CYCLING ? 'Get off' : 'Bike';
}

export const MINIMAP_PREFERENCE = 'taichung-quest-minimap';
export function readMinimapPreference(storage?: Pick<Storage, 'getItem'>) {
  try { return storage?.getItem(MINIMAP_PREFERENCE) !== 'off'; } catch { return true; }
}
