import bikeShot from './assets/landing/bike-greenway.png';
import cityMap from './assets/landing/city-map.png';
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
import yicheng from './assets/leaders/yicheng.png';
import xingan from './assets/leaders/xingan.png';
import axiu from './assets/leaders/axiu.png';
import caining from './assets/leaders/caining.png';
import jiahe from './assets/leaders/jiahe.png';
import muqing from './assets/leaders/muqing.png';
import ling from './assets/leaders/ling.png';
import peiqi from './assets/leaders/peiqi.png';
import bulbasaurFront from './assets/pokemon/front/bulbasaur.png';
import charmanderFront from './assets/pokemon/front/charmander.png';
import pikachuFront from './assets/pokemon/front/pikachu.png';
import squirtleFront from './assets/pokemon/front/squirtle.png';
import bellsproutIcon from './assets/pokemon/icon/bellsprout.png';
import butterfreeIcon from './assets/pokemon/icon/butterfree.png';
import dittoIcon from './assets/pokemon/icon/ditto.png';
import farfetchdIcon from './assets/pokemon/icon/farfetchd.png';
import jigglypuffIcon from './assets/pokemon/icon/jigglypuff.png';
import jynxIcon from './assets/pokemon/icon/jynx.png';
import machokeIcon from './assets/pokemon/icon/machoke.png';
import magmarIcon from './assets/pokemon/icon/magmar.png';
import magnetonIcon from './assets/pokemon/icon/magneton.png';
import meowthIcon from './assets/pokemon/icon/meowth.png';
import mrMimeIcon from './assets/pokemon/icon/mr_mime.png';
import omastarIcon from './assets/pokemon/icon/omastar.png';
import poliwhirlIcon from './assets/pokemon/icon/poliwhirl.png';
import porygonIcon from './assets/pokemon/icon/porygon.png';
import tangelaIcon from './assets/pokemon/icon/tangela.png';
import vaporeonIcon from './assets/pokemon/icon/vaporeon.png';
import vileplumeIcon from './assets/pokemon/icon/vileplume.png';
import bulbasaurIcon from './assets/pokemon/icon/bulbasaur.png';
import charizardIcon from './assets/pokemon/icon/charizard.png';
import charmanderIcon from './assets/pokemon/icon/charmander.png';
import cloysterIcon from './assets/pokemon/icon/cloyster.png';
import dragoniteIcon from './assets/pokemon/icon/dragonite.png';
import eeveeIcon from './assets/pokemon/icon/eevee.png';
import gengarIcon from './assets/pokemon/icon/gengar.png';
import goldeenIcon from './assets/pokemon/icon/goldeen.png';
import gyaradosIcon from './assets/pokemon/icon/gyarados.png';
import laprasIcon from './assets/pokemon/icon/lapras.png';
import pidgeottoIcon from './assets/pokemon/icon/pidgeotto.png';
import pidgeyIcon from './assets/pokemon/icon/pidgey.png';
import pikachuIcon from './assets/pokemon/icon/pikachu.png';
import psyduckIcon from './assets/pokemon/icon/psyduck.png';
import rattataIcon from './assets/pokemon/icon/rattata.png';
import seelIcon from './assets/pokemon/icon/seel.png';
import snorlaxIcon from './assets/pokemon/icon/snorlax.png';
import squirtleIcon from './assets/pokemon/icon/squirtle.png';

/** A two-frame party-menu icon: 32×64, frames stacked top to bottom. */
export interface PokemonIcon { name: string; icon: string }
/** `mapView` art is a cut of the rendered city map (scripts/crop-landmark-art.py), not a drawn facade. */
export interface LandmarkArt { facade?: string; mapView?: boolean; tint: string; leader?: string; team?: PokemonIcon[] }

const mon = (name: string, icon: string): PokemonIcon => ({ name, icon });
const brick = '#ede2d9';
const park = '#e0e8dc';
const modern = '#e3e9e6';
const neutral = '#eee8dc';

// Leader teams follow the native trainer parties (src/data/trainer_parties.h), in battle order.
export const landmarkArt: Record<string, LandmarkArt> = {
  'old-taichung-station': { facade: oldStation, tint: brick, leader: jun, team: [mon('Rattata', rattataIcon), mon('Pidgey', pidgeyIcon)] },
  'taichung-park': { facade: taichungPark, tint: park, leader: lian, team: [mon('Goldeen', goldeenIcon), mon('Psyduck', psyduckIcon), mon('Pidgeotto', pidgeottoIcon)] },
  miyahara: { facade: miyahara, tint: brick, leader: peiqi, team: [mon('Seel', seelIcon), mon('Cloyster', cloysterIcon), mon('Lapras', laprasIcon)] },
  'natural-science-museum': { facade: scienceMuseum, tint: modern, leader: yicheng, team: [mon('Magneton', magnetonIcon), mon('Porygon', porygonIcon), mon('Omastar', omastarIcon)] },
  'calligraphy-greenway': { facade: greenway, tint: park, leader: xingan, team: [mon('Bellsprout', bellsproutIcon), mon('Vileplume', vileplumeIcon), mon('Tangela', tangelaIcon)] },
  'shen-ji-new-village': { facade: shenJi, tint: neutral, leader: axiu, team: [mon('Meowth', meowthIcon), mon('Machoke', machokeIcon), mon('Ditto', dittoIcon)] },
  'fine-arts-museum': { facade: fineArts, tint: neutral, leader: caining, team: [mon('Butterfree', butterfreeIcon), mon('Ditto', dittoIcon), mon('Porygon', porygonIcon)] },
  'fengjia-night-market': { facade: fengjia, tint: brick, leader: jiahe, team: [mon('Farfetch’d', farfetchdIcon), mon('Magmar', magmarIcon), mon('Snorlax', snorlaxIcon)] },
  'maple-garden': { facade: mapleGarden, tint: park, leader: muqing, team: [mon('Poliwhirl', poliwhirlIcon), mon('Butterfree', butterfreeIcon), mon('Vaporeon', vaporeonIcon)] },
  'taichung-theater': { facade: theater, tint: modern, leader: ling, team: [mon('Jigglypuff', jigglypuffIcon), mon('Jynx', jynxIcon), mon('Mr. Mime', mrMimeIcon)] },
};

// Landmarks without a gym show the way they appear on the in-game city map.
const mapViews = import.meta.glob<string>('./assets/landmarks/map/*.png', { eager: true, import: 'default' });
for (const [path, url] of Object.entries(mapViews)) {
  const id = path.slice(path.lastIndexOf('/') + 1, -'.png'.length);
  landmarkArt[id] ??= { facade: url, mapView: true, tint: park };
}

/** Page media. An empty slot renders a labelled placeholder. */
export const landingMedia: {
  heroReel?: string;
  heroPoster?: string;
  heroPartner?: string;
  bikeShot?: string;
  cityMap: string;
  starters: Partial<Record<'charmander' | 'bulbasaur' | 'squirtle' | 'pikachu', string>>;
  starterIcons: PokemonIcon[];
  party: (PokemonIcon | undefined)[];
} = {
  heroReel,
  heroPoster,
  heroPartner: pikachuFront,
  bikeShot,
  cityMap,
  starters: { charmander: charmanderFront, bulbasaur: bulbasaurFront, squirtle: squirtleFront, pikachu: pikachuFront },
  starterIcons: [mon('Charmander', charmanderIcon), mon('Bulbasaur', bulbasaurIcon), mon('Squirtle', squirtleIcon), mon('Pikachu', pikachuIcon)],
  party: [mon('Charizard', charizardIcon), mon('Gengar', gengarIcon), mon('Snorlax', snorlaxIcon), mon('Gyarados', gyaradosIcon), mon('Dragonite', dragoniteIcon), mon('Eevee', eeveeIcon)],
};
