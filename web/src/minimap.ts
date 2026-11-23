import { neighborhoodLabels, placeNeighborhoodLabels } from './neighborhood-labels';
import { encounterProgress, encounterOutcome, ENCOUNTER_LABELS } from './encounter-progress';
import type { EncounterProgress } from './encounter-progress';
import type { EncounterBridgeState } from './encounter-bridge';
import { getLocale, t } from './i18n';
import { FACING_DEGREES, HOME_WORLD, MINIMAP_PREFERENCE, projectNavigation, projectTutorial, RADAR, RADAR_ART, RADAR_PANEL, radarContains, radarPosition, radarViewport, readMinimapPreference } from './minimap-model';
import type { MinimapGeometry, MinimapPosition, RadarMode } from './minimap-model';
import type { NavigationState } from './navigation-bridge';
import type { OnboardingState } from './onboarding-bridge';
import landmarkCatalog from './data/landmarks.json';
import { BOULEVARD_PREVIEW, sightCatalog } from './preview-world';
import radarArt from './assets/minimap/city.png';
import boulevardRadar from './assets/boulevard/radar.png';
import { isGym, placeWorld } from './landing-model';
import type { LandingLandmark } from './landing-model';

const MARKS = {
  gym: '<path class="minimap-marker minimap-badge" d="M0,-3 2.5,-1.9 3,.5 1.6,2.6 0,3.3 -1.6,2.6 -3,.5 -2.5,-1.9Z"/><path class="minimap-detail" d="M0,-1.55 1.3,0 0,1.55 -1.3,0Z"/>',
  capture: '<circle class="minimap-marker minimap-ball" r="2.7"/><path class="minimap-ball-top" d="M-2.4,0 A2.4,2.4 0 0,1 2.4,0Z"/><path class="minimap-detail minimap-ball-seam" d="M-2.6,0H2.6"/><circle class="minimap-marker minimap-ball-button" r=".82"/><path class="minimap-outcome-check" d="M-1.35,0 -.35,1.05 1.5,-1.1"/><path class="minimap-outcome-cross" d="M-1.25,-1.25 1.25,1.25 M1.25,-1.25 -1.25,1.25"/>',
  sight: '<path class="minimap-marker minimap-signpost" d="M-.5,2.3V.5H-2V-1.6H1.2L2.5,-.55 1.2,.5H.5V2.3Z"/>',
  home: '<path class="minimap-marker minimap-home-mark" d="M-2,.1 0,-1.9 2,.1V2.4H-2Z"/><path class="minimap-home-door" d="M-.45,2.35V.9H.45V2.35Z"/>',
  player: '<path class="minimap-player-arrow minimap-marker" d="M0,-2.55 2.25,2.35 0,1.45 -2.25,2.35Z"/><circle class="minimap-player-dot minimap-marker" r="1.75"/>',
};
const VIEW_PREFERENCE = 'taichung-quest-minimap-view';

function frame(width: number, height: number) {
  return `<rect class="minimap-frame-outer" x=".45" y=".45" width="${width - .9}" height="${height - .9}" rx="2.4"/>`
    + `<rect class="minimap-frame-inner" x="1.3" y="1.3" width="${width - 2.6}" height="${height - 2.6}" rx="1.6"/>`;
}

function northTab(width: number) {
  return `<g class="minimap-north"><rect x="${width - 14}" y="0" width="8" height="7" rx="1"/>`
    + `<text x="${width - 10}" y="5.35" text-anchor="middle">N</text></g>`;
}

export function createMinimap(options: {
  screen: HTMLElement; toggle: HTMLSelectElement; zoom?: HTMLSelectElement; hint: HTMLElement;
  geometry: MinimapGeometry; openGuide(): void;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}) {
  const { geometry, zoom } = options;
  let storage = options.storage;
  if (!storage) { try { storage = localStorage; } catch { /* Private mode still gets a working local toggle. */ } }
  let enabled = readMinimapPreference(storage);
  let mode: RadarMode = zoom ? 'districts' : 'nearby';
  if (zoom) {
    try {
      const preference = storage?.getItem(VIEW_PREFERENCE);
      if (preference === 'nearby' || preference === 'districts' || preference === 'citywide') mode = preference;
    } catch { /* Private mode still gets a working local choice. */ }
  }
  let state: NavigationState = { phase: 'unavailable' };
  let encounters: EncounterProgress | undefined;
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
  const gymIds = (landmarkCatalog as LandingLandmark[]).filter(isGym).map((place) => place.id);
  const places = ([...landmarkCatalog, ...sightCatalog] as LandingLandmark[]).map((place) => {
    const gymBit = gymIds.indexOf(place.id);
    const captureBit = geometry.markersById[place.id]?.captureBit;
    const kind: 'gym' | 'sight' | 'capture' = gymBit >= 0 ? 'gym' : captureBit === undefined ? 'sight' : 'capture';
    return { id: place.id, kind, gymBit, captureBit, world: placeWorld(place, geometry.markersById) };
  });
  const markers = places.map((place) =>
    `<g data-landmark="${place.id}" class="minimap-blip minimap-${place.kind}">${MARKS[place.kind]}</g>`).join('');
  const home = `<g class="minimap-blip minimap-home">${MARKS.home}</g>`;
  button.innerHTML = `<svg aria-hidden="true" viewBox="0 0 ${panel.width} ${panel.height}" shape-rendering="geometricPrecision">`
    + `<svg class="minimap-map" x="${panel.frame}" y="${panel.frame}" width="${RADAR.width}" height="${RADAR.height}">`
    + `<rect class="${BOULEVARD_PREVIEW ? 'minimap-boulevard-outside' : 'minimap-outside'}" x="-9999" y="-9999" width="19998" height="19998"/>`
    + `<image href="${BOULEVARD_PREVIEW ? boulevardRadar : radarArt}" x="${-margin}" y="${-margin}" width="${width + 2 * margin}" height="${height + 2 * margin}" preserveAspectRatio="none"/>`
    + `${markers}${home}<g class="minimap-district-labels"></g><g class="minimap-player">${MARKS.player}</g></svg>`
    + `${frame(panel.width, panel.height)}${geometry.coordinateSystem?.northUp === false ? '' : northTab(panel.width)}</svg>`;
  const drawing = button.querySelector<SVGSVGElement>('.minimap-map')!;
  options.screen.append(button);
  const player = button.querySelector<SVGGElement>('.minimap-player')!;
  const homeBlip = button.querySelector<SVGGElement>('.minimap-home')!;
  const placeBlips = places.map((place) => ({ ...place, element: button.querySelector<SVGElement>(`[data-landmark="${place.id}"]`)! }));
  const labelLayer = button.querySelector('.minimap-district-labels')!;
  const districts = neighborhoodLabels(geometry.world).map((district) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    element.setAttribute('text-anchor', 'middle');
    element.innerHTML = `<tspan x="0" lang="en">${district.name.en}</tspan><tspan x="0" dy="4.6" lang="zh-Hant">${district.name.zh}</tspan>`;
    labelLayer.append(element);
    return { ...district, element };
  });
  button.addEventListener('click', () => { if (!button.hidden) options.openGuide(); });
  options.toggle.value = enabled ? 'on' : 'off';
  options.toggle.addEventListener('change', () => {
    enabled = options.toggle.value !== 'off';
    try { storage?.setItem(MINIMAP_PREFERENCE, enabled ? 'on' : 'off'); } catch { /* The choice works for this visit. */ }
    render();
  });
  if (zoom) {
    zoom.value = mode;
    zoom.addEventListener('change', () => {
      const value = zoom.value;
      mode = value === 'nearby' || value === 'citywide' ? value : 'districts';
      try { storage?.setItem(VIEW_PREFERENCE, mode); } catch { /* This visit still uses the choice. */ }
      render();
    });
  }

  function place(element: SVGElement, at?: number[], scale = 1) {
    if (!at) { element.setAttribute('display', 'none'); return; }
    element.removeAttribute('display');
    element.setAttribute('transform', `translate(${at[0] + .5} ${at[1] + .5}) scale(${scale})`);
  }

  function render() {
    const live = radarPosition(state.phase === 'live' && state.snapshot ? projectNavigation(state.snapshot, geometry) : undefined);
    const packet = onboarding?.status === 'live' ? onboarding.snapshot : undefined;
    const tutorial = packet ? projectTutorial(packet, geometry) : undefined;
    const beforeMap = packet && packet.phase >= 1 && packet.phase < 6;
    if (live || (handoff && performance.now() >= handoff.until)) handoff = undefined;
    const position = beforeMap ? undefined : tutorial ?? live ?? handoff?.position;
    button.classList.toggle('is-tutorial', position?.facing === 0);
    button.dataset.view = mode;
    button.hidden = !enabled || !position;
    const hint = state.phase === 'unavailable' ? 'Live location is unavailable in this version. City Map is still available.' : 'Shown outdoors while exploring. Hidden indoors and during menus and battles.';
    options.hint.textContent = t(hint);
    if (!position) {
      // Do not leave a cached location in hidden DOM presented as current.
      drawing.removeAttribute('viewBox');
      player.removeAttribute('transform');
      for (const entry of placeBlips) place(entry.element);
      for (const entry of districts) entry.element.setAttribute('display', 'none');
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
    const view = radarViewport(tile, mode, geometry.world);
    const scale = view.width / RADAR.width;
    drawing.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
    player.setAttribute('transform', `translate(${tile.x} ${tile.y}) translate(.5 .5) rotate(${FACING_DEGREES[position.facing] ?? 0}) scale(${scale})`);
    const progress = state.phase === 'live' ? state.snapshot : undefined;
    for (const entry of placeBlips) {
      const earned = entry.gymBit >= 0 ? !!((progress?.gymMask ?? 0) & (1 << entry.gymBit))
        : entry.captureBit !== undefined && !!((progress?.captureMask ?? 0) & (1 << entry.captureBit));
      const outcome = entry.captureBit === undefined ? 'unknown' : encounterOutcome(entry.captureBit, encounters, progress?.captureMask);
      entry.element.classList.toggle('is-earned', entry.gymBit >= 0 ? earned : outcome === 'caught');
      for (const value of ['caught', 'spent', 'pending']) entry.element.classList.toggle(`is-${value}`, outcome === value);
      entry.element.dataset.encounter = outcome;
      if (entry.captureBit !== undefined) entry.element.setAttribute('aria-label', t(ENCOUNTER_LABELS[outcome]));
      place(entry.element, mode !== 'citywide' && radarContains(view, entry.world) ? entry.world : undefined, scale);
    }
    const homeTile = geometry.world.homeWorld ?? HOME_WORLD;
    place(homeBlip, mode !== 'citywide' && radarContains(view, homeTile) ? homeTile : undefined, scale);
    const candidates = districts.filter(entry => radarContains(view, entry.tile));
    for (const entry of districts) entry.element.setAttribute('display', 'none');
    const toPanel = (world: number[]) => ({ x: (world[0] + .5 - view.x) / scale, y: (world[1] + .5 - view.y) / scale });
    const obstacles = [tile, ...(mode === 'citywide' ? [] : placeBlips.filter(entry => radarContains(view, entry.world)).map(entry => ({ x: entry.world[0], y: entry.world[1] })))].map(point => {
      const panel = toPanel([point.x, point.y]);
      return { x: panel.x - 3.8, y: panel.y - 3.8, width: 7.6, height: 7.6 };
    });
    if (mode !== 'citywide' && radarContains(view, homeTile)) {
      const home = toPanel(homeTile); obstacles.push({ x: home.x - 3, y: home.y - 3, width: 6, height: 6 });
    }
    const font = mode === 'citywide' ? 3.2 : 4.4;
    const boxes = candidates.map(entry => {
      const panel = toPanel(entry.tile);
      const width = Math.max(entry.name.en.length * font * .53, entry.name.zh.length * font) + 1;
      return { x: panel.x - width / 2, y: panel.y - 4, width, height: font * 2.25 + .6 };
    });
    const positions = placeNeighborhoodLabels(RADAR.width, RADAR.height, boxes, obstacles, mode === 'citywide' ? 36 : 12, 1.5, .8);
    candidates.forEach((entry, index) => {
      const box = positions[index];
      if (!box) return;
      entry.element.removeAttribute('display');
      entry.element.style.fontSize = `${font}px`;
      entry.element.querySelectorAll('tspan')[1].setAttribute('dy', String(font * 1.1));
      entry.element.setAttribute('transform', `translate(${view.x + (box.x + box.width / 2) * scale} ${view.y + (box.y + font * .8) * scale}) scale(${scale})`);
    });
  }
  render();
  return {
    updateEncounter(next: EncounterBridgeState) { const value = encounterProgress(next, encounters); if (value === encounters) return; encounters = value; render(); },
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
