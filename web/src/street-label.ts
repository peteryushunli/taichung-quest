import { getLocale } from './i18n';
import { currentStreet } from './street-label-model';
import type { CityGeometry } from './city-geometry';
import type { NavigationState } from './navigation-bridge';

export function createStreetLabel(screen: HTMLElement, geometry: CityGeometry) {
  const label = document.createElement('div');
  label.className = 'current-street';
  label.id = 'current-street';
  label.hidden = true;
  label.setAttribute('role', 'status');
  label.setAttribute('aria-live', 'polite');
  label.setAttribute('aria-atomic', 'true');
  screen.append(label);
  let state: NavigationState = { phase: 'hidden' };
  function render() {
    const road = currentStreet(state, geometry);
    const chinese = getLocale() === 'zh-Hant';
    const name = road ? chinese ? road.name.zh : road.name.en : '';
    // Avoid repeating a screen-reader announcement for every stationary native frame.
    if (label.textContent !== name) label.textContent = name;
    label.hidden = !road;
    label.lang = chinese ? 'zh-Hant' : 'en';
    if (road) { label.dataset.streetId = road.id; label.title = name; }
    else { delete label.dataset.streetId; label.removeAttribute('title'); }
  }
  return { update(next: NavigationState) { state = next; render(); }, refreshLocale: render };
}
