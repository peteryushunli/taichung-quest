import baseline from './data/minimap-contract.json';
import boulevard from './data/boulevard-preview.json';
import originalSights from './data/sights.json';
import type { MinimapGeometry } from './minimap-model';

export const BOULEVARD_PREVIEW = import.meta.env.VITE_BOULEVARD_PREVIEW === '1';
export const cityGeometry: MinimapGeometry = BOULEVARD_PREVIEW ? boulevard : baseline;
export const sightCatalog = BOULEVARD_PREVIEW ? [...originalSights, ...boulevard.extraSights] : originalSights;
