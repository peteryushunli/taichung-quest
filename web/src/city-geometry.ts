import type { MinimapGeometry } from './minimap-model';

export type WorldPoint = [number, number];
export type WorldRect = [number, number, number, number];
export type StreetRegion = { id: string; name: { en: string; zh: string }; worldRects: WorldRect[]; priority?: number };
/** Presentation adapter boundary. Maps owns the export and actual coordinates.
 * Optional annotations are ignored unless bound to this exact geometry.
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
/** New geometry must supply a marker; stale catalog coordinates never carry over. */
export function placeWorldInGeometry(place: { id: string; world?: number[] }, geometry: CityGeometry): WorldPoint | undefined {
  const marker = geometry.markersById[place.id];
  if (marker) {
    const map = geometry.mapsByNativeKey[marker.exteriorNativeKey];
    if (map?.kind !== 'exterior' || !validWorldPoint(marker.world, geometry) || !map.worldOrigin ||
      marker.world[0] < map.worldOrigin[0] || marker.world[1] < map.worldOrigin[1] ||
      marker.world[0] >= map.worldOrigin[0] + map.width || marker.world[1] >= map.worldOrigin[1] + map.height) return;
    return [marker.world[0], marker.world[1]];
  }
  if (isReleasedGeometry(geometry) && validWorldPoint(place.world, geometry)) return [...place.world];
}
export function homeWorldInGeometry(geometry: CityGeometry): WorldPoint | undefined {
  const home = boundPresentation(geometry)?.homeWorld;
  if (validWorldPoint(home, geometry)) return [...home];
  return isReleasedGeometry(geometry) ? [105, 120] : undefined;
}
/** Half-open native world-tile regions; no proximity, GPS or heading guesses. */
export function streetsInGeometry(geometry: CityGeometry): readonly StreetRegion[] {
  const streets = boundPresentation(geometry)?.streets;
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
  return streets;
}
export function districtLabelsInGeometry(geometry: CityGeometry) {
  const labels = boundPresentation(geometry)?.districtLabels;
  if (!Array.isArray(labels)) return [];
  return labels.filter((l) => typeof l.label === 'string' && l.label && validWorldPoint(l.world, geometry))
    .map((l) => ({ label: l.label, sign: !!l.sign, x: (l.world[0] + .5) / geometry.world.width * 100, y: (l.world[1] + .5) / geometry.world.height * 100 }));
}
