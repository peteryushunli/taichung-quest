import { getLocale, t } from './i18n';
import { FACING_DEGREES, HOME_WORLD, MINIMAP_PREFERENCE, projectNavigation, RADAR, RADAR_ART, RADAR_PANEL, radarBlip, radarPosition, radarViewBox, readMinimapPreference } from './minimap-model';
import type { MinimapGeometry } from './minimap-model';
import type { NavigationState } from './navigation-bridge';
import landmarkCatalog from './data/landmarks.json';
import sightCatalog from './data/sights.json';
import radarArt from './assets/minimap/city.png';
import { isGym, placeWorld } from './landing-model';
import type { LandingLandmark } from './landing-model';

/**
 * Pixel sprites, one character per GBA pixel around the blip's tile (column/row 2 of a 5-wide
 * sprite is the tile itself). `o` is the dark outline, other letters are fills named in
 * minimap.css, `.` is clear. Every edge lands on the pixel grid, so nothing is anti-aliased.
 */
const SPRITES = {
  gym: ['ooooo', 'orrro', 'orrro', 'orrro', 'ooooo'],
  gymPinned: ['oooo', 'orro', 'orro', 'oooo'],
  sight: ['.oo.', 'oyyo', 'oyyo', '.oo.'],
  home: ['..o..', '.obo.', 'obbbo', 'owwwo', 'ooooo'],
  player: ['..o..', '.owo.', 'owwwo', 'ooooo'],
  north: ['o..o', 'oo.o', 'o.oo', 'o..o', 'o..o'],
} as const;
const FILLS: Record<string, string> = { o: 'outline', r: 'gym-fill', y: 'sight-fill', b: 'home-roof', w: 'light' };

/** SVG paths for a sprite, one per colour, with its top-left pixel at (left, top). */
function sprite(rows: readonly string[], left = -2, top = -2) {
  const runs: Record<string, string> = {};
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const colour = row[x];
      let end = x;
      while (row[end] === colour) end++;
      if (colour !== '.') runs[colour] = `${runs[colour] ?? ''}M${left + x},${top + y}h${end - x}v1h${x - end}z`;
      x = end;
    }
  });
  return Object.entries(runs).map(([colour, d]) => `<path class="minimap-${FILLS[colour]}" d="${d}"/>`).join('');
}

/** The rounded FRLG-style window: a dark outer ring and a light inner ring, two pixels in all. */
function frame(width: number, height: number) {
  const w = width - 4, h = height - 4;
  const dark = `M2,0h${w}v1h-${w}zM2,${height - 1}h${w}v1h-${w}zM0,2h1v${h}h-1zM${width - 1},2h1v${h}h-1z`
    + `M1,1h1v1h-1zM${width - 2},1h1v1h-1zM1,${height - 2}h1v1h-1zM${width - 2},${height - 2}h1v1h-1z`;
  const light = `M2,1h${w}v1h-${w}zM2,${height - 2}h${w}v1h-${w}zM1,2h1v${h}h-1zM${width - 2},2h1v${h}h-1z`
    // Round the map's own corners too.
    + `M2,2h1v1h-1zM${width - 3},2h1v1h-1zM2,${height - 3}h1v1h-1zM${width - 3},${height - 3}h1v1h-1z`;
  return `<path class="minimap-outline" d="${dark}"/><path class="minimap-light" d="${light}"/>`;
}

/** A small N tab on the top edge, near the right corner. */
function northTab(width: number) {
  const left = width - 14;
  return `<path class="minimap-outline" d="M${left + 1},0h6v1h-6zM${left},1h1v5h-1zM${left + 7},1h1v5h-1zM${left + 1},6h6v1h-6z"/>`
    + `<path class="minimap-light" d="M${left + 1},1h6v5h-6z"/>${sprite(SPRITES.north, left + 2, 1)}`;
}

/**
 * The live minimap, drawn like a FireRed Town Map: a flat north-up map of roads, water and
 * land around the player in a rounded pixel frame, one GBA pixel per world tile, with pixel
 * blips for gyms (red squares), other landmarks (yellow dots) and home (a small house). Gyms
 * and home stay pinned near the edge when out of range so the player can always tell which way
 * they are. Presentation only: no input emulation, save access or GBA memory writes.
 */
export function createMinimap(options: {
  screen: HTMLElement; toggle: HTMLSelectElement; hint: HTMLElement;
  geometry: MinimapGeometry; openGuide(): void;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}) {
  const { geometry } = options;
  let storage = options.storage;
  if (!storage) { try { storage = localStorage; } catch { /* Private mode still gets a working local toggle. */ } }
  let enabled = readMinimapPreference(storage);
  let state: NavigationState = { phase: 'unavailable' };
  const button = document.createElement('button');
  button.id = 'live-minimap';
  button.className = 'live-minimap';
  button.type = 'button';
  button.hidden = true;
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-controls', 'city-guide');
  const { width, height } = geometry.world;
  const { margin } = RADAR_ART;
  const panel = RADAR_PANEL;
  const places = ([...landmarkCatalog, ...sightCatalog] as LandingLandmark[]).map((place) => ({ id: place.id, gym: isGym(place), world: placeWorld(place, geometry.markersById) }));
  // Sights under gyms under home under the player. Each blip is moved onto its tile.
  const blip = (place: typeof places[number]) => place.gym
    ? `<g data-landmark="${place.id}" class="minimap-blip minimap-gym"><g class="minimap-full">${sprite(SPRITES.gym)}</g><g class="minimap-pinned">${sprite(SPRITES.gymPinned, -1, -1)}</g></g>`
    : `<g data-landmark="${place.id}" class="minimap-blip minimap-sight">${sprite(SPRITES.sight, -1, -1)}</g>`;
  const markers = [...places.filter((place) => !place.gym), ...places.filter((place) => place.gym)].map(blip).join('');
  const home = `<g class="minimap-blip minimap-home">${sprite(SPRITES.home)}</g>`;
  button.innerHTML = `<svg aria-hidden="true" viewBox="0 0 ${panel.width} ${panel.height}" shape-rendering="crispEdges">`
    + `<svg class="minimap-map" x="${panel.frame}" y="${panel.frame}" width="${RADAR.width}" height="${RADAR.height}">`
    + `<rect class="minimap-outside" x="-9999" y="-9999" width="19998" height="19998"/>`
    + `<image href="${radarArt}" x="${-margin}" y="${-margin}" width="${width + 2 * margin}" height="${height + 2 * margin}" preserveAspectRatio="none"/>`
    + `${markers}${home}<g class="minimap-player">${sprite(SPRITES.player)}</g></svg>`
    + `${frame(panel.width, panel.height)}${northTab(panel.width)}</svg>`;
  const drawing = button.querySelector<SVGSVGElement>('.minimap-map')!;
  options.screen.append(button);
  const player = button.querySelector<SVGGElement>('.minimap-player')!;
  const homeBlip = button.querySelector<SVGGElement>('.minimap-home')!;
  const placeBlips = places.map((place) => ({ ...place, element: button.querySelector<SVGElement>(`[data-landmark="${place.id}"]`)! }));
  button.addEventListener('click', () => { if (!button.hidden) options.openGuide(); });
  options.toggle.value = enabled ? 'on' : 'off';
  options.toggle.addEventListener('change', () => {
    enabled = options.toggle.value !== 'off';
    try { storage?.setItem(MINIMAP_PREFERENCE, enabled ? 'on' : 'off'); } catch { /* The choice works for this visit. */ }
    render();
  });

  function place(element: SVGElement, at?: { x: number; y: number; onRim: boolean }) {
    if (!at) { element.setAttribute('display', 'none'); return; }
    element.removeAttribute('display');
    // Whole tiles only, so every sprite pixel lands on a GBA pixel.
    element.setAttribute('transform', `translate(${at.x} ${at.y})`);
    element.classList.toggle('on-rim', at.onRim);
  }

  function render() {
    const position = radarPosition(state.phase === 'live' && state.snapshot ? projectNavigation(state.snapshot, geometry) : undefined);
    button.hidden = !enabled || !position;
    const hint = state.phase === 'unavailable' ? 'Live location is unavailable in this version. City Map is still available.' : 'Shown outdoors while exploring. Hidden indoors and during menus and battles.';
    options.hint.textContent = t(hint);
    if (!position) {
      // Do not leave a cached location in hidden DOM presented as current.
      drawing.removeAttribute('viewBox');
      player.removeAttribute('transform');
      for (const entry of placeBlips) place(entry.element);
      place(homeBlip);
      button.removeAttribute('title');
      button.setAttribute('aria-label', t('City Map'));
      return;
    }
    const nearest = landmarkCatalog.find((entry) => entry.id === position.landmarkId);
    const name = getLocale() === 'zh-Hant' ? nearest?.nameZh ?? position.landmarkName.zh : nearest?.nameEn ?? position.landmarkName.en;
    const label = `${t('Nearest landmark')}: ${name}`;
    button.title = label;
    button.setAttribute('aria-label', `${t('City Map')}. ${label}`);
    const tile = { x: position.worldX, y: position.worldY };
    const view = radarViewBox(tile);
    drawing.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
    // Quarter turns about the centre of the player's own pixel keep the arrow on the grid.
    player.setAttribute('transform', `translate(${tile.x} ${tile.y}) rotate(${FACING_DEGREES[position.facing]} .5 .5)`);
    for (const entry of placeBlips) place(entry.element, radarBlip(tile, entry.world, entry.gym));
    place(homeBlip, radarBlip(tile, HOME_WORLD, true));
  }
  render();
  return { update(next: NavigationState) { state = next; render(); }, refreshLocale: render, get enabled() { return enabled; } };
}
