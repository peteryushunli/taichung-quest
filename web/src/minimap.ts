import { getLocale, t } from './i18n';
import { MINIMAP_PREFERENCE, projectNavigation, readMinimapPreference } from './minimap-model';
import type { MinimapGeometry } from './minimap-model';
import type { NavigationState } from './navigation-bridge';
import landmarkCatalog from './data/landmarks.json';

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
  const regions = Object.entries(geometry.mapsByNativeKey).filter(([, map]) => map.kind === 'exterior');
  button.innerHTML = `<svg viewBox="0 0 ${geometry.world.width} ${geometry.world.height}" aria-hidden="true"><rect width="120" height="120" class="minimap-ground"/>${regions.map(([key, map]) => `<rect data-district="${key}" x="${map.worldRect![0]}" y="${map.worldRect![1]}" width="${map.width}" height="${map.height}" rx="3"/>`).join('')}${Object.values(geometry.markersById).map((marker) => `<circle data-landmark="${marker.id}" cx="${marker.world[0] + .5}" cy="${marker.world[1] + .5}" r="2.6"/>`).join('')}<g class="minimap-player"><circle r="6"/><path d="M0,-6 L4,4 L0,2 L-4,4 Z"/></g><text x="7" y="13">N↑</text></svg><span class="minimap-context"></span><span class="minimap-indoor" aria-hidden="true" hidden></span>`;
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
    player.setAttribute('transform', `translate(${position.worldX + .5} ${position.worldY + .5})`);
    arrow.setAttribute('transform', `rotate(${({ 1: 180, 2: 0, 3: 270, 4: 90 } as Record<number, number>)[position.facing]})`);
    player.classList.toggle('indoors', position.indoor);
    button.querySelectorAll<SVGElement>('[data-district]').forEach((region) => region.classList.toggle('current', region.dataset.district === position.districtKey));
    button.querySelectorAll<SVGElement>('[data-landmark]').forEach((marker) => marker.classList.toggle('nearest', marker.dataset.landmark === position.landmarkId));
  }
  render();
  return { update(next: NavigationState) { state = next; render(); }, refreshLocale: render, get enabled() { return enabled; } };
}
