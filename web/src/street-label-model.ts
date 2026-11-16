import { projectNavigation } from './minimap-model.ts';
import { streetsInGeometry } from './city-geometry.ts';
import type { CityGeometry, StreetRegion } from './city-geometry';
import type { NavigationState } from './navigation-bridge';

/** A named street only from a fresh, mapped outdoor field packet. */
export function currentStreet(state: NavigationState, geometry: CityGeometry): StreetRegion | undefined {
  if (state.phase !== 'live' || !state.snapshot) return;
  const position = projectNavigation(state.snapshot, geometry);
  if (!position || position.indoor) return;
  const { worldX: x, worldY: y } = position;
  const matches = streetsInGeometry(geometry).filter((road) => road.worldRects.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1));
  matches.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  // An exporter must explicitly resolve overlaps; don't guess a road at a tied junction.
  if (matches.length > 1 && (matches[0].priority ?? 0) === (matches[1].priority ?? 0)) return;
  return matches[0];
}

