import bikeShot from './assets/landing/bike-greenway.png';
import cityMap from './assets/landing/city-map.png';
import boulevardMap from './assets/boulevard/city.webp';
import { BOULEVARD_PREVIEW } from './preview-world';
import heroPoster from './assets/landing/hero-poster.png';
import heroReel from './assets/landing/hero-reel.mp4';
import wenyi from './assets/leaders/portraits/wenyi.webp';
import slowbroIcon from './assets/pokemon/icon/slowbro.png';
import exeggutorIcon from './assets/pokemon/icon/exeggutor.png';
import alakazamIcon from './assets/pokemon/icon/alakazam.png';
import jun from './assets/leaders/portraits/jun.webp';
import lian from './assets/leaders/portraits/lian.webp';
import yicheng from './assets/leaders/portraits/yicheng.webp';
import xingan from './assets/leaders/portraits/xingan.webp';
import caining from './assets/leaders/portraits/caining.webp';
import jiahe from './assets/leaders/portraits/jiahe.webp';
import muqing from './assets/leaders/portraits/muqing.webp';
import ling from './assets/leaders/portraits/ling.webp';
import peiqi from './assets/leaders/portraits/peiqi.webp';
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
export interface LandmarkArt { facade?: string; tint: string; leader?: string; team?: PokemonIcon[] }

const mon = (name: string, icon: string): PokemonIcon => ({ name, icon });
const brick = '#ede2d9';
const park = '#e0e8dc';
const modern = '#e3e9e6';
const neutral = '#eee8dc';

// Leader teams follow the native trainer parties (src/data/trainer_parties.h), in battle order.
export const landmarkArt: Record<string, LandmarkArt> = {
  'old-taichung-station': { tint: brick, leader: jun, team: [mon('Rattata', rattataIcon), mon('Pidgey', pidgeyIcon), mon('Meowth', meowthIcon)] },
  'taichung-park': { tint: park, leader: lian, team: [mon('Goldeen', goldeenIcon), mon('Psyduck', psyduckIcon), mon('Pidgeotto', pidgeottoIcon)] },
  miyahara: { tint: brick, leader: peiqi, team: [mon('Seel', seelIcon), mon('Cloyster', cloysterIcon), mon('Lapras', laprasIcon)] },
  'natural-science-museum': { tint: modern, leader: yicheng, team: [mon('Magneton', magnetonIcon), mon('Porygon', porygonIcon), mon('Omastar', omastarIcon)] },
  'calligraphy-greenway': { tint: park, leader: xingan, team: [mon('Bellsprout', bellsproutIcon), mon('Vileplume', vileplumeIcon), mon('Tangela', tangelaIcon)] },
  'confucius-temple': { tint: neutral, leader: wenyi, team: [mon('Slowbro', slowbroIcon), mon('Exeggutor', exeggutorIcon), mon('Alakazam', alakazamIcon)] },
  'fine-arts-museum': { tint: neutral, leader: caining, team: [mon('Butterfree', butterfreeIcon), mon('Ditto', dittoIcon), mon('Porygon', porygonIcon)] },
  'fengjia-night-market': { tint: brick, leader: jiahe, team: [mon('Farfetch’d', farfetchdIcon), mon('Magmar', magmarIcon), mon('Snorlax', snorlaxIcon)] },
  'taichung-theater': { tint: modern, leader: ling, team: [mon('Jigglypuff', jigglypuffIcon), mon('Jynx', jynxIcon), mon('Mr. Mime', mrMimeIcon)] },
  // Muqing's gym moved into Wanhe Temple (save bit 8 keeps its maple-garden ID in the game).
  'wanhe-temple': { tint: brick, leader: muqing, team: [mon('Poliwhirl', poliwhirlIcon), mon('Butterfree', butterfreeIcon), mon('Vaporeon', vaporeonIcon)] },
};

// Each gym's City Pass badge, the game's own 32×32 award icon (graphics/taichung/badges), keyed by landmark id.
export const badgeArt: Record<string, string> = Object.fromEntries(Object.entries(
  import.meta.glob<string>('./assets/badges/*.png', { eager: true, import: 'default' }),
).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.png'.length), url]));

// The Boulevard export verifies these facades against the compiled sprite hashes.
const isolatedFacades = import.meta.glob<string>('./assets/landmarks/isolated/*.png', { eager: true, import: 'default' });
for (const [path, facade] of Object.entries(isolatedFacades)) {
  const id = path.slice(path.lastIndexOf('/') + 1, -'.png'.length);
  const art = landmarkArt[id] ?? { tint: park };
  landmarkArt[id] = { ...art, facade };
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
  cityMap: BOULEVARD_PREVIEW ? boulevardMap : cityMap,
  starters: { charmander: charmanderFront, bulbasaur: bulbasaurFront, squirtle: squirtleFront, pikachu: pikachuFront },
  starterIcons: [mon('Charmander', charmanderIcon), mon('Bulbasaur', bulbasaurIcon), mon('Squirtle', squirtleIcon), mon('Pikachu', pikachuIcon)],
  party: [mon('Charizard', charizardIcon), mon('Gengar', gengarIcon), mon('Snorlax', snorlaxIcon), mon('Gyarados', gyaradosIcon), mon('Dragonite', dragoniteIcon), mon('Eevee', eeveeIcon)],
};
