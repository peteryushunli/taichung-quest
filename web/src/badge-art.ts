import manifest from './data/badge-display.json';
export type BadgeDesign = { gymIndex: number; landmarkId: string; name: { en: string; zh: string };
  landmark: { en: string; zh: string }; art: string };
const artwork = import.meta.glob<string>('./assets/badges/masters-v1/*.svg', { eager: true, import: 'default' });
export const badgeDesigns: BadgeDesign[] = manifest.badges.map(record => ({ ...record,
  art: artwork[`./assets/badges/masters-v1/${record.landmarkId}.svg`],
}));
export const sharpBadgeArt = Object.fromEntries(badgeDesigns.map(record => [record.landmarkId, record.art]));
