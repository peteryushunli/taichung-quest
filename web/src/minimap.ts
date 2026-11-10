import { getLocale, t } from './i18n';
import { MINIMAP_PREFERENCE, projectNavigation, readMinimapPreference } from './minimap-model';
import type { MinimapGeometry } from './minimap-model';
import type { NavigationState } from './navigation-bridge';
import landmarkCatalog from './data/landmarks.json';
import sightCatalog from './data/sights.json';
import cityArt from './assets/minimap/city.png';
import { isGym, placeWorld } from './landing-model';
import type { LandingLandmark } from './landing-model';

/** The minimap shows this many world tiles around the player (4:3), drawn from the real city render. */
export const MINIMAP_VIEW = { width: 36, height: 27 } as const;

/** Top-left of the view centred on a tile, kept inside the world so the frame never shows past the map edge. */
export function minimapViewOrigin(tile: { x: number; y: number }, world: { width: number; height: number }, view = MINIMAP_VIEW) {
  const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), Math.max(max, 0));
  return { x: clamp(tile.x + .5 - view.width / 2, world.width - view.width), y: clamp(tile.y + .5 - view.height / 2, world.height - view.height) };
}

/** Presentation only: no input emulation, save access or GBA memory writes. */
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
  // Gyms are green squares and the other landmarks gold dots, as on the website's city map.
  const places = [...landmarkCatalog, ...sightCatalog] as LandingLandmark[];
  const markers = places.map((place) => {
    const [x, y] = placeWorld(place, geometry.markersById);
    return isGym(place)
      ? `<rect data-landmark="${place.id}" class="minimap-gym" x="${x - .9}" y="${y - .9}" width="2.8" height="2.8" rx=".4"/>`
      : `<circle data-landmark="${place.id}" class="minimap-sight" cx="${x + .5}" cy="${y + .5}" r="1.4"/>`;
  }).join('');
  button.innerHTML = `<svg viewBox="0 0 ${MINIMAP_VIEW.width} ${MINIMAP_VIEW.height}" style="aspect-ratio: ${MINIMAP_VIEW.width} / ${MINIMAP_VIEW.height}" aria-hidden="true"><image href="${cityArt}" width="${width}" height="${height}" preserveAspectRatio="none"/>${markers}<g class="minimap-player"><circle r="1.7"/><path d="M0,-1.6 L1.1,1.1 L0,.55 L-1.1,1.1 Z"/></g></svg><span class="minimap-context"></span><span class="minimap-indoor" aria-hidden="true" hidden></span>`;
  const drawing = button.querySelector('svg')!;
  options.screen.append(button);
  const player = button.querySelector<SVGGElement>('.minimap-player')!;
  const arrow = player.querySelector('path')!;
  const context = button.querySelector<HTMLSpanElement>('.minimap-context')!;
  const indoorBadge = button.querySelector<HTMLSpanElement>('.minimap-indoor')!;
  button.addEventListener('click', () => { if (!button.hidden) options.openGuide(); });
  options.toggle.value = enabled ? 'on' : 'off';
  options.toggle.addEventListener('change', () => {
    enabled = options.toggle.value !== 'off';
    try { storage?.setItem(MINIMAP_PREFERENCE, enabled ? 'on' : 'off'); } catch { /* The choice works for this visit. */ }
    render();
  });

  function render() {
    const position = state.phase === 'live' && state.snapshot ? projectNavigation(state.snapshot, geometry) : undefined;
    button.hidden = !enabled || !position;
    const hint = state.phase === 'unavailable' ? 'Live location is unavailable in this version. City Map is still available.' : 'Shown while exploring. Hidden during menus and battles.';
    options.hint.textContent = t(hint);
    if (!position) {
      // Do not leave a cached location in hidden DOM presented as current.
      player.removeAttribute('transform');
      button.removeAttribute('title');
      context.textContent = '';
      indoorBadge.hidden = true;
      indoorBadge.textContent = '';
      button.setAttribute('aria-label', t('City Map'));
      return;
    }
    const place = landmarkCatalog.find((entry) => entry.id === position.landmarkId);
    const chinese = getLocale() === 'zh-Hant';
    const name = chinese ? place?.nameZh ?? position.landmarkName.zh : place?.nameEn ?? position.landmarkName.en;
    const shortName = chinese ? place?.minimapNameZh ?? name : place?.minimapNameEn ?? name;
    const indoor = position.indoorLabel ? getLocale() === 'zh-Hant' ? position.indoorLabel.zh : position.indoorLabel.en : t('Indoors');
    const label = position.indoor ? `${indoor} · ${name}` : `${t('Nearest landmark')}: ${name}`;
    context.textContent = shortName;
    indoorBadge.hidden = !position.indoor;
    indoorBadge.textContent = position.indoor ? t('Indoors') : '';
    button.title = label;
    button.setAttribute('aria-label', `${t('City Map')}. ${label}`);
    const origin = minimapViewOrigin({ x: position.worldX, y: position.worldY }, geometry.world);
    drawing.setAttribute('viewBox', `${origin.x} ${origin.y} ${MINIMAP_VIEW.width} ${MINIMAP_VIEW.height}`);
    player.setAttribute('transform', `translate(${position.worldX + .5} ${position.worldY + .5})`);
    arrow.setAttribute('transform', `rotate(${({ 1: 180, 2: 0, 3: 270, 4: 90 } as Record<number, number>)[position.facing]})`);
    player.classList.toggle('indoors', position.indoor);
    button.querySelectorAll<SVGElement>('[data-landmark]').forEach((marker) => marker.classList.toggle('nearest', marker.dataset.landmark === position.landmarkId));
  }
  render();
  return { update(next: NavigationState) { state = next; render(); }, refreshLocale: render, get enabled() { return enabled; } };
}
