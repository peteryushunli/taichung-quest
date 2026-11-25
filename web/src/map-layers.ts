import type { MinimapGeometry } from './minimap-model';
import type { Locale } from './i18n';
import { boxesOverlap } from './neighborhood-labels.ts';

export const MAP_LAYERS = ['gyms', 'landmarks', 'districts', 'streets'] as const;
export type MapLayer = typeof MAP_LAYERS[number];
export const DEFAULT_MAP_LAYERS: Record<MapLayer, boolean> = { gyms: true, landmarks: true, districts: false, streets: false };
const LABELS: Record<MapLayer, [string, string]> = { gyms: ['Gyms', '道館'], landmarks: ['Landmarks', '地標'], districts: ['Districts', '街區'], streets: ['Streets', '街道'] };
export const mapLayerLabel = (layer: MapLayer, locale: Locale) => LABELS[layer][locale === 'zh-Hant' ? 1 : 0];

/** Label a street's longest band; draw every paired band, including turns. */
export function namedStreetLabels(geometry: MinimapGeometry, anchoredStreetId?: string) {
  const longest = new Map<string, NonNullable<MinimapGeometry['world']['streetBands']>[number]>();
  for (const band of geometry.world.streetBands ?? []) {
    if (anchoredStreetId && band.id === anchoredStreetId) continue;
    const key = `${band.name.en}\0${band.name.zh}`;
    const length = (value: typeof band) => value.axis === 'h' ? value.bounds[2] - value.bounds[0] : value.bounds[3] - value.bounds[1];
    const previous = longest.get(key);
    if (!previous || length(band) > length(previous)) longest.set(key, band);
  }
  return [...longest.values()];
}

export function createMapLayers(map: HTMLElement, controls: HTMLElement, layoutDistricts: () => void) {
  const enabled = { ...DEFAULT_MAP_LAYERS };
  function layoutStreets() {
    if (!enabled.streets) return;
    const bounds = map.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    // Give compact maps room to place a name beside its street after trying its centerline.
    const compact = bounds.width <= 390;
    const narrow = bounds.width <= 280;
    const crossOffsets = compact ? [0, -6, 6, -12, 12, -18, 18] : [0];
    if (narrow) crossOffsets.push(-24, 24);
    const occupied = [...map.querySelectorAll('.lp-marker,.lp-pin-label,.lp-map-chip,.lp-map-legend,.is-neighborhood,.lp-map-anchor > span')]
      .map(element => element.querySelector(':scope > .lp-gym-icon, :scope > .lp-mon') ?? element)
      .map(element => element.getBoundingClientRect()).filter(box => box.width && box.height)
      .map(box => ({ x: box.left - bounds.left, y: box.top - bounds.top, width: box.width, height: box.height }));
    for (const label of map.querySelectorAll<HTMLElement>('.lp-street-label')) {
      label.hidden = false;
      const width = label.offsetWidth, height = label.offsetHeight;
      const [left, top, right, bottom] = label.dataset.bounds!.split(',').map(Number);
      const horizontal = label.dataset.axis === 'h';
      const axisLength = horizontal ? (right - left) * bounds.width / 100 : (bottom - top) * bounds.height / 100;
      const origin = { x: (left + right) / 200 * bounds.width - width / 2, y: (top + bottom) / 200 * bounds.height - height / 2 };
      const labelLength = horizontal ? width : height;
      const limit = (axisLength - labelLength) / 2 + (narrow ? 6 : 0);
      let found = false;
      for (const cross of crossOffsets) {
        for (let radius = 0; radius <= limit && !found; radius += 6) {
          for (const along of radius ? [-radius, radius] : [0]) {
            const box = {
              x: origin.x + (horizontal ? along : cross),
              y: origin.y + (horizontal ? cross : along),
              width, height,
            };
            if (box.x < 2 || box.y < 2 || box.x + width > bounds.width - 2 || box.y + height > bounds.height - 2 ||
                occupied.some(other => boxesOverlap(box, other, narrow ? 1 : 2))) continue;
            label.style.left = `${box.x}px`;
            label.style.top = `${box.y}px`;
            occupied.push(box);
            found = true;
            break;
          }
        }
        if (found) break;
      }
      label.hidden = !found;
    }
  }
  function refresh() {
    for (const layer of MAP_LAYERS) {
      const element = map.querySelector<HTMLElement>(`[data-map-layer="${layer}"]`);
      if (element) element.hidden = !enabled[layer];
      map.querySelectorAll<HTMLElement>(`[data-map-legend="${layer}"]`).forEach(legend => { legend.hidden = !enabled[layer]; });
      controls.querySelector<HTMLInputElement>(`[data-map-toggle="${layer}"]`)!.checked = enabled[layer];
    }
    map.querySelector<HTMLElement>('.lp-map-legend')!.hidden = !enabled.gyms && !enabled.landmarks;
    layoutDistricts();
    layoutStreets();
  }
  controls.addEventListener('change', event => {
    const input = event.target as HTMLInputElement;
    const layer = input.dataset.mapToggle as MapLayer | undefined;
    if (layer && MAP_LAYERS.includes(layer)) { enabled[layer] = input.checked; refresh(); }
  });
  const observer = new ResizeObserver(refresh);
  observer.observe(map);
  void document.fonts.ready.then(refresh);
  return { refresh };
}
