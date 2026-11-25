import { sharpBadgeArt } from './badge-art';
import captureSpecies from './data/capture-species.json';
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
import butterfreeIcon from './assets/pokemon/icon/butterfree.png';
import farfetchdIcon from './assets/pokemon/icon/farfetchd.png';
import jynxIcon from './assets/pokemon/icon/jynx.png';
import magmarIcon from './assets/pokemon/icon/magmar.png';
import magnetonIcon from './assets/pokemon/icon/magneton.png';
import mrMimeIcon from './assets/pokemon/icon/mr_mime.png';
import omastarIcon from './assets/pokemon/icon/omastar.png';
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
import gyaradosIcon from './assets/pokemon/icon/gyarados.png';
import laprasIcon from './assets/pokemon/icon/lapras.png';
import pikachuIcon from './assets/pokemon/icon/pikachu.png';
import snorlaxIcon from './assets/pokemon/icon/snorlax.png';
import squirtleIcon from './assets/pokemon/icon/squirtle.png';
import raticateIcon from './assets/pokemon/icon/raticate.png';
import pidgeotIcon from './assets/pokemon/icon/pidgeot.png';
import persianIcon from './assets/pokemon/icon/persian.png';
import seakingIcon from './assets/pokemon/icon/seaking.png';
import golduckIcon from './assets/pokemon/icon/golduck.png';
import dewgongIcon from './assets/pokemon/icon/dewgong.png';
import aerodactylIcon from './assets/pokemon/icon/aerodactyl.png';
import victreebelIcon from './assets/pokemon/icon/victreebel.png';
import mukIcon from './assets/pokemon/icon/muk.png';
import clefableIcon from './assets/pokemon/icon/clefable.png';
import poliwrathIcon from './assets/pokemon/icon/poliwrath.png';
import wigglytuffIcon from './assets/pokemon/icon/wigglytuff.png';

/** A two-frame party-menu icon: 32×64, frames stacked top to bottom. */
export interface PokemonIcon { name: string; icon: string }
export interface LandmarkArt { facade?: string; tint: string; leader?: string; team?: PokemonIcon[] }

const mon = (name: string, icon: string): PokemonIcon => ({ name, icon });

const iconFiles = import.meta.glob<string>('./assets/pokemon/icon/*.png', { eager: true, import: 'default' });
/** The Pokémon the game keeps at a capture site (a landmark marker's captureBit), when the site has its icon. */
export function capturePokemon(site: number | undefined): PokemonIcon | undefined {
  const slug = site === undefined ? undefined : captureSpecies.species[site];
  const icon = slug ? iconFiles[`./assets/pokemon/icon/${slug}.png`] : undefined;
  return slug && icon ? mon(slug[0].toUpperCase() + slug.slice(1), icon) : undefined;
}
const brick = '#ede2d9';
const park = '#e0e8dc';
const modern = '#e3e9e6';
const neutral = '#eee8dc';

// Species follow native roster checkpoint 3349d1f1 (src/data/trainer_parties.h), in battle order.
export const landmarkArt: Record<string, LandmarkArt> = {
  'old-taichung-station': { tint: brick, leader: jun, team: [mon('Raticate', raticateIcon), mon('Pidgeot', pidgeotIcon), mon('Persian', persianIcon)] },
  'taichung-park': { tint: park, leader: lian, team: [mon('Seaking', seakingIcon), mon('Golduck', golduckIcon), mon('Pidgeot', pidgeotIcon)] },
  miyahara: { tint: brick, leader: peiqi, team: [mon('Dewgong', dewgongIcon), mon('Cloyster', cloysterIcon), mon('Lapras', laprasIcon)] },
  'natural-science-museum': { tint: modern, leader: yicheng, team: [mon('Magneton', magnetonIcon), mon('Aerodactyl', aerodactylIcon), mon('Omastar', omastarIcon)] },
  'calligraphy-greenway': { tint: park, leader: xingan, team: [mon('Victreebel', victreebelIcon), mon('Vileplume', vileplumeIcon), mon('Tangela', tangelaIcon)] },
  'yuanbao-temple': { tint: brick },
  'confucius-temple': { tint: neutral, leader: wenyi, team: [mon('Slowbro', slowbroIcon), mon('Exeggutor', exeggutorIcon), mon('Alakazam', alakazamIcon)] },
  'fine-arts-museum': { tint: neutral, leader: caining, team: [mon('Butterfree', butterfreeIcon), mon('Muk', mukIcon), mon('Clefable', clefableIcon)] },
  'fengjia-night-market': { tint: brick, leader: jiahe, team: [mon('Farfetch’d', farfetchdIcon), mon('Magmar', magmarIcon), mon('Snorlax', snorlaxIcon)] },
  'taichung-theater': { tint: modern, leader: ling, team: [mon('Wigglytuff', wigglytuffIcon), mon('Jynx', jynxIcon), mon('Mr. Mime', mrMimeIcon)] },
  // Muqing's gym moved into Wanhe Temple (save bit 8 keeps its maple-garden ID in the game).
  'wanhe-temple': { tint: brick, leader: muqing, team: [mon('Poliwrath', poliwrathIcon), mon('Butterfree', butterfreeIcon), mon('Vaporeon', vaporeonIcon)] },
};

// Original-detail Story masters, with the native32 icon retained as fallback.
export const badgeArt: Record<string, string> = { ...Object.fromEntries(Object.entries(
  import.meta.glob<string>('./assets/badges/*.png', { eager: true, import: 'default' }),
).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.png'.length), url])), ...sharpBadgeArt };

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
