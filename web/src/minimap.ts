import { getLocale, t } from './i18n';
import { FACING_DEGREES, HOME_WORLD, MINIMAP_PREFERENCE, projectNavigation, RADAR_ART, radarBlip, radarPosition, radarViewBox, readMinimapPreference } from './minimap-model';
import type { MinimapGeometry } from './minimap-model';
import type { NavigationState } from './navigation-bridge';
import landmarkCatalog from './data/landmarks.json';
import sightCatalog from './data/sights.json';
import radarArt from './assets/minimap/city.png';
import { isGym, placeWorld } from './landing-model';
import type { LandingLandmark } from './landing-model';

/**
 * A GTA-style radar: a flat north-up map of roads, water and land around the player, with
 * solid blips for gyms (squares), other landmarks (rounds) and home (a house). Gyms and
 * home stay pinned to the rim when out of range so the player can always tell which way
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
  const places = ([...landmarkCatalog, ...sightCatalog] as LandingLandmark[]).map((place) => ({ id: place.id, gym: isGym(place), world: placeWorld(place, geometry.markersById) }));
  // Sights under gyms under home; every blip is drawn around (0, 0) and moved into place.
  const blip = (place: typeof places[number]) => place.gym
    ? `<rect data-landmark="${place.id}" class="minimap-blip minimap-gym" x="-1.5" y="-1.5" width="3" height="3"/>`
    : `<circle data-landmark="${place.id}" class="minimap-blip minimap-sight" r="1.3"/>`;
  const markers = [...places.filter((place) => !place.gym), ...places.filter((place) => place.gym)].map(blip).join('');
  const home = '<path class="minimap-blip minimap-home" d="M0,-2.1 L2.1,-.1 L1.4,-.1 L1.4,1.8 L-1.4,1.8 L-1.4,-.1 L-2.1,-.1 Z"/>';
  button.innerHTML = `<svg aria-hidden="true"><image href="${radarArt}" x="${-margin}" y="${-margin}" width="${width + 2 * margin}" height="${height + 2 * margin}" preserveAspectRatio="none"/>${markers}${home}<path class="minimap-player" d="M0,-2.3 L1.8,1.8 L0,.8 L-1.8,1.8 Z"/></svg><span class="minimap-north" aria-hidden="true">N</span>`;
  const drawing = button.querySelector('svg')!;
  options.screen.append(button);
  const player = button.querySelector<SVGPathElement>('.minimap-player')!;
  const homeBlip = button.querySelector<SVGPathElement>('.minimap-home')!;
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
    // Rim blips are drawn smaller so several gyms in the same direction stay readable.
    element.setAttribute('transform', `translate(${at.x} ${at.y})${at.onRim ? ' scale(.7)' : ''}`);
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
    drawing.setAttribute('viewBox', `${view.x} ${view.y} ${view.size} ${view.size}`);
    player.setAttribute('transform', `translate(${tile.x + .5} ${tile.y + .5}) rotate(${FACING_DEGREES[position.facing]})`);
    for (const entry of placeBlips) place(entry.element, radarBlip(tile, entry.world, entry.gym));
    place(homeBlip, radarBlip(tile, HOME_WORLD, true));
  }
  render();
  return { update(next: NavigationState) { state = next; render(); }, refreshLocale: render, get enabled() { return enabled; } };
}
