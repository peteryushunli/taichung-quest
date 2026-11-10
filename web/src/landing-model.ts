/** Pure landing-page rules. Gym claims always derive from landmarks.json. */
export type LandingLocale = 'en' | 'zh-Hant';

export interface LandingLandmark {
  id: string;
  nameEn: string;
  nameZh: string;
  shortNameEn: string;
  shortNameZh: string;
  minimapNameEn: string;
  minimapNameZh: string;
  description: string;
  descriptionZh: string;
  officialUrl?: string;
  officialUrlZh?: string;
  mapX: number;
  mapY: number;
  mapLabelSide: string;
  districtId: string;
  districtEn: string;
  districtZh: string;
  /** 'visit' is an enterable hall without a gym; 'sight' is an outdoor set piece on the map. */
  kind?: 'gym' | 'visit' | 'sight';
  /** Map position for places the minimap contract does not carry (outdoor set pieces). */
  world?: number[];
  /** World-tile rect [x0, y0, x1, y1) of the map-view art cut from the city render. */
  artRect?: number[];
  /** Where the landing map's pin label sits when the default (facing the middle) would cover a neighbour. */
  landingLabelSide?: 'left' | 'right' | 'above' | 'below';
  gameAreaRef?: string;
  gymStatus: 'planned' | 'pending-verification' | 'playable' | 'not-a-gym';
  gymLeaderEn?: string;
  gymLeaderZh?: string;
  landingNameEn?: string;
}

const countWords: Record<LandingLocale, string[]> = {
  en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'],
  'zh-Hant': ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'],
};

export function isGym(place: Pick<LandingLandmark, 'kind' | 'gymStatus'>) { return place.kind !== 'visit' && place.gymStatus !== 'not-a-gym'; }

export function isGymOpen(place: Pick<LandingLandmark, 'kind' | 'gymStatus'>) { return isGym(place) && place.gymStatus === 'playable'; }

export function placeStatus(place: Pick<LandingLandmark, 'kind' | 'gymStatus'>) {
  return !isGym(place) ? 'Landmark' : isGymOpen(place) ? 'Gym open' : 'In development';
}

/** Gyms first, then the other landmarks, each group in catalog order. */
export function orderPlaces<T extends Pick<LandingLandmark, 'kind' | 'gymStatus'>>(places: T[]) {
  return [...places.filter(isGym), ...places.filter((place) => !isGym(place))];
}

/** World tile of a place: the contract's entrance marker, else the place's own map position. */
export function placeWorld(place: Pick<LandingLandmark, 'id' | 'world'>, markers: Record<string, { world: number[] }>) {
  const world = markers[place.id]?.world ?? place.world;
  if (!world) throw new Error(`No map position for ${place.id}.`);
  return world;
}

export function districtCount(places: Pick<LandingLandmark, 'districtId'>[]) { return new Set(places.map((place) => place.districtId)).size; }

export function cityPlaceSummary(places: LandingLandmark[], locale: LandingLocale) {
  const districts = districtCount(places);
  return locale === 'zh-Hant' ? `${districts} 個街區，${places.length} 個真實地點。` : `${districts} districts. ${places.length} real places.`;
}

// The raised freeway along the top carries the three northern district names like road signs
// (the Old City's sign stands over its north blocks); Nantun's name sits on the open canvas beside Wanhe, below the Old City.
const DISTRICT_LABELS = [
  { key: '43:2', label: 'XITUN 西屯', sign: true, rows: 0 },
  { key: '43:1', label: 'GREENWAY 草悟道', sign: true, rows: 0 },
  { key: '43:18', label: 'OLD CITY 舊城', sign: true, rows: 0 },
  { key: '43:15', label: 'NANTUN 南屯', sign: false, rows: 24 },
] as const;
// Freeway lanes along the top of the world; its west leg is as wide, so the first sign starts past it.
const FREEWAY_ROWS = 6;

/** Percent positions of the district names drawn over the city render (landing map and in-game City Map). */
export function districtLabelSpots(city: { world: { width: number; height: number }; mapsByNativeKey: Record<string, { worldRect?: readonly number[] }> }) {
  const { width, height } = city.world;
  return DISTRICT_LABELS.map(({ key, label, sign, rows }) => {
    const [left, top, right] = city.mapsByNativeKey[key].worldRect!;
    const [x, y] = sign ? [Math.max(left, FREEWAY_ROWS) + 1, FREEWAY_ROWS / 2] : [right + 1, top + 1.5 + rows];
    return { label, sign, x: x / width * 100, y: y / height * 100 };
  });
}

/** Percent position of a world tile's centre on the rendered map; the label faces the middle. */
export function markerPosition(world: readonly number[], size: { width: number; height: number }) {
  const [x, y] = world;
  return { x: (x + .5) / size.width * 100, y: (y + .5) / size.height * 100, side: x < size.width / 2 ? 'right' as const : 'left' as const };
}

export function gymStatusSummary(places: LandingLandmark[], locale: LandingLocale) {
  const chinese = locale === 'zh-Hant';
  const gyms = places.filter(isGym);
  const open = gyms.filter(isGymOpen);
  const remaining = gyms.length - open.length;
  const remainingWord = countWords[locale][remaining] ?? String(remaining);
  if (!open.length) return chinese ? '所有道館仍在開發中。' : 'All gyms are still in development.';
  if (!remaining) return chinese ? '所有道館都已開放挑戰。' : 'All gyms are battle-ready.';
  const names = open.map((place) => chinese ? place.shortNameZh : place.shortNameEn);
  const [separator, conjunction] = chinese ? ['、', '與'] : [', ', ' and '];
  const list = names.length > 1 ? `${names.slice(0, -1).join(separator)}${conjunction}${names.at(-1)}` : names[0];
  if (chinese) return `${list}道館已開放挑戰；其餘${remainingWord}座仍在開發中。`;
  return `${list} ${names.length > 1 ? 'gyms are' : 'gym is'} battle-ready; the other ${remainingWord} ${remaining > 1 ? 'are' : 'is'} in development.`;
}

export function localizedPlace(place: LandingLandmark, locale: LandingLocale) {
  const chinese = locale === 'zh-Hant';
  const officialUrl = chinese ? place.officialUrlZh ?? place.officialUrl : place.officialUrl;
  const url = officialUrl ? new URL(officialUrl) : undefined;
  if (url && url.protocol !== 'https:') throw new Error('Landmark information must use a secure official visitor URL.');
  return {
    name: chinese ? place.nameZh : place.nameEn,
    otherName: chinese ? place.nameEn : place.nameZh,
    shortName: chinese ? place.shortNameZh : place.landingNameEn ?? place.shortNameEn,
    mapLabel: chinese ? place.minimapNameZh : place.landingNameEn ?? place.shortNameEn,
    description: chinese ? place.descriptionZh : place.description,
    district: chinese ? place.districtZh : place.districtEn,
    // Only an open gym has a confirmed leader on this page.
    leader: isGymOpen(place) ? (chinese ? place.gymLeaderZh : place.gymLeaderEn) : undefined,
    url: url?.href,
  };
}
