import bikeShot from './assets/landing/bike-greenway.png';
import heroPoster from './assets/landing/hero-poster.png';
import heroReel from './assets/landing/hero-reel.mp4';
import fengjia from './assets/landmarks/fengjia.png';
import fineArts from './assets/landmarks/fine-arts.png';
import greenway from './assets/landmarks/greenway.png';
import mapleGarden from './assets/landmarks/maple-garden.png';
import miyahara from './assets/landmarks/miyahara.png';
import oldStation from './assets/landmarks/old-station.png';
import scienceMuseum from './assets/landmarks/science-museum.png';
import shenJi from './assets/landmarks/shen-ji.png';
import taichungPark from './assets/landmarks/taichung-park.png';
import theater from './assets/landmarks/theater.png';
import jun from './assets/leaders/jun.png';
import lian from './assets/leaders/lian.png';
import peiqi from './assets/leaders/peiqi.png';

export interface LandmarkArt { facade?: string; tint: string; leader?: string }

const brick = '#ede2d9';
const park = '#e0e8dc';
const modern = '#e3e9e6';
const neutral = '#eee8dc';

export const landmarkArt: Record<string, LandmarkArt> = {
  'old-taichung-station': { facade: oldStation, tint: brick, leader: jun },
  'taichung-park': { facade: taichungPark, tint: park, leader: lian },
  miyahara: { facade: miyahara, tint: brick, leader: peiqi },
  'natural-science-museum': { facade: scienceMuseum, tint: modern },
  'calligraphy-greenway': { facade: greenway, tint: park },
  'shen-ji-new-village': { facade: shenJi, tint: neutral },
  'fine-arts-museum': { facade: fineArts, tint: neutral },
  'fengjia-night-market': { facade: fengjia, tint: brick },
  'maple-garden': { facade: mapleGarden, tint: park },
  'taichung-theater': { facade: theater, tint: modern },
};

/**
 * Art still to be supplied. Each empty slot renders a labelled placeholder;
 * set a URL here and the page picks it up. Set mapMode to 'art' once mapArt
 * exists, so the markers draw over the rendered city instead of the schematic.
 */
export const landingMedia: {
  heroReel?: string;
  heroPoster?: string;
  heroPartner?: string;
  bikeShot?: string;
  mapArt?: string;
  mapMode: 'schematic' | 'art';
  starters: Partial<Record<'charmander' | 'bulbasaur' | 'squirtle' | 'pikachu', string>>;
  party: (string | undefined)[];
} = {
  heroReel,
  heroPoster,
  bikeShot,
  mapMode: 'schematic',
  starters: {},
  party: [],
};
