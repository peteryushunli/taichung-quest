import '../src/style.css';
import '../src/minimap.css';
import { createMinimap } from '../src/minimap';
import { createCityGuide } from '../src/city-guide';
import { cityGeometry as geometry } from '../src/preview-world';
import { initializeLocalization, onLocaleChange, setLocale } from '../src/i18n';
import type { EncounterBridgeState } from '../src/encounter-bridge';
import type { NavigationSnapshot } from '../src/navigation-bridge';

// Test-only remap: exercises high bits before final native marker export exists.
// Production catalogs/geometry are unchanged; no fixture save is imported.
const syntheticBit = Number(new URLSearchParams(location.search).get('bit'));
if ([21, 22, 23].includes(syntheticBit)) geometry.markersById['maple-garden'].captureBit = syntheticBit;
const bitChoice = document.querySelector<HTMLSelectElement>('#bit')!;
bitChoice.value = [21, 22, 23].includes(syntheticBit) ? String(syntheticBit) : '0';
bitChoice.addEventListener('change', () => { location.search = `bit=${bitChoice.value}`; });
document.querySelector('#fixture-label')!.textContent = [21, 22, 23].includes(syntheticBit)
  ? `Synthetic bit ${syntheticBit} on Maple Garden’s existing marker (not native placement)` : 'Maple Garden test position';
const guide = createCityGuide({ getState: () => ({ running: true, paused: false }), pause() {}, resume() {}, releaseInputs() {} });
const hud = createMinimap({ screen: document.querySelector('#fixture-screen')!, toggle: document.querySelector('#visibility')!, zoom: document.querySelector('#zoom')!, hint: document.querySelector('#hint')!, geometry, storage: { getItem: () => null, setItem() {} }, openGuide: () => guide.open() });
const marker = geometry.markersById['maple-garden'];
const bit = marker.captureBit!;
const map = geometry.mapsByNativeKey[marker.exteriorNativeKey];
const [mapGroup, mapNumber] = marker.exteriorNativeKey.split(':').map(Number);
const packet: NavigationSnapshot = { frame: 2, sequence: 4, flags: 79, x: marker.world[0] - map.worldOrigin![0] + 4, y: marker.world[1] - map.worldOrigin![1] - 3, width: map.width, height: map.height, mapGroup, mapNumber, facing: 2, mapType: 1, contextFlags: 0, gymMask: 1, captureMask: 0 };
hud.update({ phase: 'live', snapshot: packet });
initializeLocalization();
onLocaleChange(() => hud.refreshLocale());
function update(status: string) {
  const state = status === 'Paused' ? { status: 'paused' } : status === 'Reset' ? { status: 'discovering' } : {
    status: 'live', snapshot: { attempts: status === 'Available' ? 0 : 1 << bit, unlocks: status === 'Caught' ? 1 << bit : 0,
      site: status === 'Pending' ? bit : 255, phase: status === 'Pending' ? 3 : 0 },
  };
  hud.updateEncounter(state as EncounterBridgeState); guide.updateEncounter(state as EncounterBridgeState);
}
update('Available');
document.querySelector('#outcome')!.addEventListener('change', event => update((event.target as HTMLSelectElement).value));
document.querySelector('#language')!.addEventListener('change', event => setLocale((event.target as HTMLSelectElement).value === 'en' ? 'en' : 'zh-Hant'));
document.querySelector('#guide')!.addEventListener('click', () => guide.open());
document.querySelector('#run')!.addEventListener('click', () => {
  const lines: string[] = [];
  const blip = document.querySelector<SVGElement>('.minimap-blip[data-landmark="maple-garden"]')!;
  const crop = document.querySelector('.minimap-map')!.getAttribute('viewBox');
  for (const [choice, expected] of [['Caught', 'caught'], ['Spent', 'spent'], ['Pending', 'pending'], ['Paused', 'pending'], ['Reset', 'unknown'], ['Available', 'available']]) {
    update(choice);
    const buttons = [...document.querySelectorAll<HTMLElement>('#city-guide [data-landmark="maple-garden"], #city-guide [data-guide-select="maple-garden"]')];
    const symbol = expected === 'caught' ? blip.querySelector('.minimap-outcome-check') : expected === 'spent' ? blip.querySelector('.minimap-outcome-cross') : undefined;
    const okay = (!symbol || getComputedStyle(symbol).display !== 'none') && blip.dataset.encounter === expected && buttons.every(button => button.dataset.encounter === expected) && crop === document.querySelector('.minimap-map')!.getAttribute('viewBox');
    lines.push(`${okay ? 'PASS' : 'FAIL'} ${choice}: both maps update without moving the crop`);
  }
  setLocale('zh-Hant'); update('Spent');
  lines.push(`${document.querySelector('#city-guide [data-landmark="maple-garden"]')!.getAttribute('aria-label')!.includes('機會已用') ? 'PASS' : 'FAIL'} Chinese status labels`);
  setLocale('en'); update('Spent');
  const zoom = document.querySelector<HTMLSelectElement>('#zoom')!;
  const previousView = zoom.value;
  const width = screenWidth();
  zoom.value = 'citywide'; zoom.dispatchEvent(new Event('change'));
  const labels = [...document.querySelectorAll<SVGTextElement>('.minimap-district-labels text')].filter(label => label.getAttribute('display') !== 'none');
  lines.push(`${labels.length === 9 && labels.every(label => label.querySelectorAll('tspan').length === 2) ? 'PASS' : 'FAIL'} nine bilingual citywide labels`);
  const overlap = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const player = document.querySelector('.minimap-player')!.getBoundingClientRect();
  lines.push(`${labels.every((label, index) => !overlap(label.getBoundingClientRect(), player) && labels.slice(index + 1).every(other => !overlap(label.getBoundingClientRect(), other.getBoundingClientRect()))) ? 'PASS' : 'FAIL'} radar labels avoid player and each other`);
  guide.open();
  const map = document.querySelector('.guide-map')!.getBoundingClientRect();
  const fullLabels = [...document.querySelectorAll<HTMLElement>('.map-district.is-neighborhood')].filter(label => !label.hidden);
  const markers = [...document.querySelectorAll('.guide-map .marker-number,.guide-map .guide-encounter-mark')];
  lines.push(`${fullLabels.length === 9 && fullLabels.every(label => { const box = label.getBoundingClientRect(); return box.left >= map.left && box.right <= map.right && box.top >= map.top && box.bottom <= map.bottom && markers.every(marker => !overlap(box, marker.getBoundingClientRect())); }) ? 'PASS' : 'FAIL'} nine full-map labels stay inside and clear of markers`);
  document.querySelector<HTMLDialogElement>('#city-guide')!.close();
  zoom.value = previousView; zoom.dispatchEvent(new Event('change'));
  lines.push(`${screenWidth() === width ? 'PASS' : 'FAIL'} label updates preserve map container width`);
  document.querySelector('#results')!.textContent = lines.join('\n');
});

function screenWidth() { return document.querySelector('#fixture-screen')!.getBoundingClientRect().width; }
