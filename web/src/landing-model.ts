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
  kind?: 'gym' | 'visit';
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
  return !isGym(place) ? 'Visit' : isGymOpen(place) ? 'Gym open' : 'In development';
}

export function districtCount(places: Pick<LandingLandmark, 'districtId'>[]) { return new Set(places.map((place) => place.districtId)).size; }

export function cityPlaceSummary(places: LandingLandmark[], locale: LandingLocale) {
  const districts = districtCount(places);
  return locale === 'zh-Hant' ? `${districts} 個街區，${places.length} 個真實地點。` : `${districts} districts. ${places.length} real places.`;
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
