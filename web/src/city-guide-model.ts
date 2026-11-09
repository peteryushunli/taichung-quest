import type { LandingLandmark } from './landing-model';

interface GuideGeometry {
  world: { width: number; height: number };
  mapsByNativeKey: Record<string, {
    kind: string; worldRect?: readonly number[]; mapId?: string; nativeMapName?: string;
  }>;
}

/** Labels for the exterior pieces that share a district: Nantun's two halves and the Old City's north blocks. */
const areaNames: Record<string, { en: string; zh: string }> = {
  MAP_TAICHUNG_NANTUN_NORTH: { en: 'Nantun · North', zh: '南屯北段' },
  MAP_TAICHUNG_NANTUN_WANHE: { en: 'Nantun · Wanhe', zh: '南屯・萬和宮街廓' },
  MAP_TAICHUNG_OLD_CITY_NORTH: { en: 'Old City · North', zh: '舊城北段' },
};

export function cityMapAreas(geometry: GuideGeometry, places: LandingLandmark[]) {
  return Object.entries(geometry.mapsByNativeKey).flatMap(([key, map]) => {
    const rect = map.worldRect;
    if (map.kind !== 'exterior' || !/^\d+:\d+$/.test(key) || !rect || rect.length !== 4 || !rect.every(Number.isFinite)) return [];
    const [left, top, right, bottom] = rect;
    if (left < 0 || top < 0 || right > geometry.world.width || bottom > geometry.world.height || left >= right || top >= bottom) return [];
    const place = places.find((entry) => entry.gameAreaRef === map.mapId);
    const name = areaNames[map.mapId ?? ''] ?? {
      en: place?.districtEn ?? map.nativeMapName ?? key,
      zh: place?.districtZh ?? map.nativeMapName ?? key,
    };
    return [{ key, left, top, width: right - left, height: bottom - top, name }];
  });
}

/** Each rectangle is an exact exterior worldRect, with no indoor rooms projected. */
export function guideMapDrawing(geometry: GuideGeometry, places: LandingLandmark[]) {
  const { width, height } = geometry.world;
  // In contract order: Old City, Greenway, Xitun, Nantun North, Wanhe, Old City North (the Old City's colour).
  const fills = ['#eae5cf', '#dce7ce', '#e4ead5', '#e4ead5', '#eae5cf', '#eae5cf'];
  return `<svg class="guide-map-drawing" viewBox="0 0 ${width} ${height}" aria-hidden="true"><rect width="${width}" height="${height}" fill="#eef1e5"/>${cityMapAreas(geometry, places).map((area, index) => `<rect data-native-key="${area.key}" x="${area.left}" y="${area.top}" width="${area.width}" height="${area.height}" fill="${fills[index % fills.length]}" stroke="#b6c8a3" stroke-width=".4"/>`).join('')}</svg>`;
}
