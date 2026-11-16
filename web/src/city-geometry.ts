import type { MinimapGeometry } from './minimap-model';

export type WorldPoint = [number, number];
export type WorldRect = [number, number, number, number];
export type StreetRegion = { id: string; name: { en: string; zh: string }; worldRects: WorldRect[]; priority?: number };
/** Maps' raw schema is consumed directly. Optional UI annotations are separate
 * from the exported JSON and ignored unless bound to this exact geometry.
 */
export type CityAnnotations = {
  geometryFingerprintSha256: string;
  streets?: StreetRegion[];
  homeWorld?: WorldPoint;
  districtLabels?: Array<{ label: string; world: WorldPoint; sign?: boolean }>;
};
export type CityGeometry = MinimapGeometry & { presentation?: CityAnnotations };
// Compatibility applies only to the shipped PR18 geometry, never to a new map.
const RELEASED_BASELINE = '48fe4ba5208d0a2b1285c1b6aa6f776377ef003d5501e5ae837ca45c6127e92a';
export function isReleasedGeometry(geometry: Pick<MinimapGeometry, 'geometryFingerprintSha256'>) {
  return geometry.geometryFingerprintSha256 === RELEASED_BASELINE;
}
export function validWorldPoint(value: unknown, geometry: Pick<MinimapGeometry, 'world'>): value is WorldPoint {
  return Array.isArray(value) && value.length === 2 && value.every(Number.isInteger) &&
    value[0] >= 0 && value[1] >= 0 && value[0] < geometry.world.width && value[1] < geometry.world.height;
}
export function boundPresentation(geometry: CityGeometry): CityAnnotations | undefined {
  const p = geometry.presentation;
  return p && /^[a-f\d]{64}$/.test(geometry.geometryFingerprintSha256) && p.geometryFingerprintSha256 === geometry.geometryFingerprintSha256 ? p : undefined;
}
/** Check native ownership as well as world bounds; no old-world or GPS fallback. */
export function worldPointInExterior(value: unknown, nativeKey: string, geometry: CityGeometry): value is WorldPoint {
  const map = geometry.mapsByNativeKey[nativeKey];
  return map?.kind === 'exterior' && map.projection === 'local-plus-world-origin' &&
    validWorldPoint(value, geometry) && validWorldPoint(map.worldOrigin, geometry) &&
    Number.isInteger(map.width) && Number.isInteger(map.height) && map.width > 0 && map.height > 0 &&
    map.worldOrigin[0] + map.width <= geometry.world.width && map.worldOrigin[1] + map.height <= geometry.world.height &&
    value[0] >= map.worldOrigin[0] && value[1] >= map.worldOrigin[1] &&
    value[0] < map.worldOrigin[0] + map.width && value[1] < map.worldOrigin[1] + map.height;
}
function validName(name: { en: string; zh: string } | undefined) {
  return typeof name?.en === 'string' && !!name.en.trim() && typeof name.zh === 'string' && !!name.zh.trim();
}
/** Twenty finished anchors, independent of the twelve actual warp markers.
 * A reserved plot or malformed source place cannot become a playable pin.
 */
export function placedAnchorsInGeometry(geometry: CityGeometry) {
  if (geometry.placesById !== undefined) {
    if (geometry.geometryVersion !== 'horizontal-v1' || !geometry.placesById || typeof geometry.placesById !== 'object' || Array.isArray(geometry.placesById)) return [];
    return Object.entries(geometry.placesById).flatMap(([id, place]) =>
      place && place.id === id && place.artStatus === 'approved-baseline-source' &&
      (place.interactionStatus === undefined || typeof place.interactionStatus === 'string' && !place.interactionStatus.startsWith('reserved')) &&
      validName(place.name) && worldPointInExterior(place.worldAnchor, place.nativeKey, geometry)
        ? [{ id, name: place.name, world: [...place.worldAnchor], exteriorNativeKey: place.nativeKey }] : []);
  }
  return Object.entries(geometry.markersById).flatMap(([id, marker]) =>
    marker && marker.id === id && validName(marker.name) && worldPointInExterior(marker.world, marker.exteriorNativeKey, geometry) ? [marker] : []);
}
/** New geometry must supply an approved source place or marker. */
export function placeWorldInGeometry(place: { id: string; world?: number[] }, geometry: CityGeometry): WorldPoint | undefined {
  if (geometry.placesById !== undefined) {
    const anchor = placedAnchorsInGeometry(geometry).find((p) => p.id === place.id);
    return anchor ? [anchor.world[0], anchor.world[1]] : undefined;
  }
  const marker = geometry.markersById[place.id];
  if (marker) {
    if (!worldPointInExterior(marker.world, marker.exteriorNativeKey, geometry)) return;
    return [marker.world[0], marker.world[1]];
  }
  if (isReleasedGeometry(geometry) && validWorldPoint(place.world, geometry)) return [...place.world];
}
export function homeWorldInGeometry(geometry: CityGeometry): WorldPoint | undefined {
  if (geometry.residence !== undefined) {
    const home = geometry.residence;
    if (geometry.geometryVersion !== 'horizontal-v1' || !home) return;
    const origin = geometry.mapsByNativeKey[home.nativeKey]?.worldOrigin;
    if (!worldPointInExterior(home.door, home.nativeKey, geometry) || !Array.isArray(home.localDoor) ||
        home.localDoor.length !== 2 || !home.localDoor.every(Number.isInteger) || !origin ||
        home.localDoor.some((v, i) => origin[i] + v !== home.door[i])) return;
    return [home.door[0], home.door[1]];
  }
  const home = boundPresentation(geometry)?.homeWorld;
  if (validWorldPoint(home, geometry)) return [...home];
  return isReleasedGeometry(geometry) ? [105, 120] : undefined;
}
/** Half-open native world-tile regions; no proximity, GPS or heading guesses. */
export function streetsInGeometry(geometry: CityGeometry): readonly StreetRegion[] {
  let streets: Array<{ id: string; name: { en: string; zh: string }; priority?: number; worldRects: number[][] }> | undefined;
  if (geometry.roads !== undefined) {
    if (geometry.geometryVersion !== 'horizontal-v1' || !Array.isArray(geometry.roads) || !geometry.roads.every((r) => Number.isFinite(r?.priority))) return [];
    streets = geometry.roads.map((r) => ({ ...r, worldRects: Array.isArray(r?.regions) ? r.regions.map((region) => region?.rect) : [] }));
  } else streets = boundPresentation(geometry)?.streets;
  if (!Array.isArray(streets)) return [];
  const ids = new Set<string>();
  for (const road of streets) {
    if (!road || typeof road.id !== 'string' || !road.id || ids.has(road.id) ||
      typeof road.name?.en !== 'string' || !road.name.en.trim() || typeof road.name?.zh !== 'string' || !road.name.zh.trim() ||
      !Array.isArray(road.worldRects) || !road.worldRects.length ||
      (road.priority !== undefined && !Number.isFinite(road.priority))) return [];
    ids.add(road.id);
    for (const rect of road.worldRects) {
      if (!Array.isArray(rect) || rect.length !== 4 || !rect.every(Number.isInteger) ||
        rect[0] < 0 || rect[1] < 0 || rect[2] <= rect[0] || rect[3] <= rect[1] ||
        rect[2] > geometry.world.width || rect[3] > geometry.world.height) return [];
    }
  }
  return streets as StreetRegion[];
}
export function districtLabelsInGeometry(geometry: CityGeometry) {
  const labels = boundPresentation(geometry)?.districtLabels;
  if (!Array.isArray(labels)) return [];
  return labels.filter((l) => typeof l.label === 'string' && l.label && validWorldPoint(l.world, geometry))
    .map((l) => ({ label: l.label, sign: !!l.sign, x: (l.world[0] + .5) / geometry.world.width * 100, y: (l.world[1] + .5) / geometry.world.height * 100 }));
}

/** Native realPlace coordinates are longitude/latitude, never game-world XY. */
export function visitorLocationInGeometry(place: { id: string; location?: { latitude?: number; longitude?: number } }, geometry: CityGeometry) {
  const gps = geometry.placesById?.[place.id]?.realPlace?.coordinates;
  if (Array.isArray(gps) && gps.length === 2 && gps.every(Number.isFinite) && Math.abs(gps[0]) <= 180 && Math.abs(gps[1]) <= 90)
    return { longitude: gps[0], latitude: gps[1] };
  if (geometry.placesById !== undefined) return;
  const location = place.location;
  if (typeof location?.latitude === 'number' && typeof location.longitude === 'number')
    return { latitude: location.latitude, longitude: location.longitude };
}
