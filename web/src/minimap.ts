import { getLocale, t } from './i18n';
import { FACING_DEGREES, HOME_WORLD, MINIMAP_PREFERENCE, projectNavigation, projectTutorial, RADAR, RADAR_ART, RADAR_PANEL, radarBlip, radarPosition, radarViewBox, readMinimapPreference } from './minimap-model';
import type { MinimapGeometry, MinimapPosition } from './minimap-model';
import type { NavigationState } from './navigation-bridge';
import type { OnboardingState } from './onboarding-bridge';
import landmarkCatalog from './data/landmarks.json';
import sightCatalog from './data/sights.json';
import radarArt from './assets/minimap/city.png';
import { isGym, placeWorld } from './landing-model';
import type { LandingLandmark } from './landing-model';

/** Smooth vector symbols retain the familiar red-square / yellow-dot legend. */
const MARKS = {
  gym: '<rect class="minimap-marker minimap-gym-fill" x="-1.7" y="-1.7" width="4.4" height="4.4" rx=".35"/>',
  gymPinned: '<rect class="minimap-marker minimap-gym-fill" x="-1.2" y="-1.2" width="3.4" height="3.4" rx=".3"/>',
  sight: '<circle class="minimap-marker minimap-sight-fill" cx=".5" cy=".5" r="1.7"/>',
  home: '<path class="minimap-marker minimap-home-mark" d="M-1.6,.1 .5,-1.8 2.6,.1V2.6H-1.6Z"/><path class="minimap-home-door" d="M.1,2.5V1.1H1V2.5Z"/>',
  player: '<path class="minimap-player-arrow minimap-marker" d="M.5,-1.7 2.5,2.5 .5,1.7 -1.5,2.5Z"/><circle class="minimap-player-dot minimap-marker" cx=".5" cy=".5" r="1.75"/>',
};

function frame(width: number, height: number) {
  return `<rect class="minimap-frame-outer" x=".45" y=".45" width="${width - .9}" height="${height - .9}" rx="2.4"/>`
    + `<rect class="minimap-frame-inner" x="1.3" y="1.3" width="${width - 2.6}" height="${height - 2.6}" rx="1.6"/>`;
}

function northTab(width: number) {
  return `<g class="minimap-north"><rect x="${width - 14}" y="0" width="8" height="7" rx="1"/>`
    + `<text x="${width - 10}" y="5.35" text-anchor="middle">N</text></g>`;
}

/**
 * The live minimap, drawn like a FireRed Town Map: a flat north-up map of roads, water and
 * land around the player in a rounded frame, with smooth
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
  let onboarding: OnboardingState | undefined;
  let lastTutorial: MinimapPosition | undefined;
  let handoff: { position: MinimapPosition; until: number } | undefined;
  let handoffTimer: ReturnType<typeof setTimeout> | undefined;
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
    ? `<g data-landmark="${place.id}" class="minimap-blip minimap-gym"><g class="minimap-full">${MARKS.gym}</g><g class="minimap-pinned">${MARKS.gymPinned}</g></g>`
    : `<g data-landmark="${place.id}" class="minimap-blip minimap-sight">${MARKS.sight}</g>`;
  const markers = [...places.filter((place) => !place.gym), ...places.filter((place) => place.gym)].map(blip).join('');
  const home = `<g class="minimap-blip minimap-home">${MARKS.home}</g>`;
  button.innerHTML = `<svg aria-hidden="true" viewBox="0 0 ${panel.width} ${panel.height}" shape-rendering="geometricPrecision">`
    + `<svg class="minimap-map" x="${panel.frame}" y="${panel.frame}" width="${RADAR.width}" height="${RADAR.height}">`
    + `<rect class="minimap-outside" x="-9999" y="-9999" width="19998" height="19998"/>`
    + `<image href="${radarArt}" x="${-margin}" y="${-margin}" width="${width + 2 * margin}" height="${height + 2 * margin}" preserveAspectRatio="none"/>`
    + `${markers}${home}<g class="minimap-player">${MARKS.player}</g></svg>`
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
    // Keep every marker anchored to its exact world tile.
    element.setAttribute('transform', `translate(${at.x} ${at.y})`);
    element.classList.toggle('on-rim', at.onRim);
  }

  function render() {
    const live = radarPosition(state.phase === 'live' && state.snapshot ? projectNavigation(state.snapshot, geometry) : undefined);
    const packet = onboarding?.status === 'live' ? onboarding.snapshot : undefined;
    const tutorial = packet ? projectTutorial(packet, geometry) : undefined;
    const beforeMap = packet && packet.phase >= 1 && packet.phase < 6;
    if (live || (handoff && performance.now() >= handoff.until)) handoff = undefined;
    const position = beforeMap ? undefined : tutorial ?? live ?? handoff?.position;
    button.classList.toggle('is-tutorial', position?.facing === 0);
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
    player.setAttribute('transform', `translate(${tile.x} ${tile.y}) rotate(${FACING_DEGREES[position.facing] ?? 0} .5 .5)`);
    for (const entry of placeBlips) place(entry.element, radarBlip(tile, entry.world, entry.gym));
    place(homeBlip, radarBlip(tile, HOME_WORLD, true));
  }
  render();
  return {
    update(next: NavigationState) { state = next; render(); },
    updateOnboarding(next: OnboardingState) {
      onboarding = next;
      const packet = next.status === 'live' ? next.snapshot : undefined;
      const tutorial = packet ? projectTutorial(packet, geometry) : undefined;
      if (tutorial) lastTutorial = tutorial;
      else if (packet?.phase === 9 && packet.flags === 1 && lastTutorial) {
        // Bridge native script release to the next real field packet, briefly.
        handoff = { position: lastTutorial, until: performance.now() + 350 };
        lastTutorial = undefined;
        clearTimeout(handoffTimer);
        handoffTimer = setTimeout(render, 360);
      } else if (!packet || packet.phase < 6 || packet.phase > 9) {
        lastTutorial = undefined;
        handoff = undefined;
        clearTimeout(handoffTimer);
      }
      render();
    },
    refreshLocale: render, get enabled() { return enabled; },
  };
}
