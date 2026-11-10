import '../src/style.css';
import '../src/minimap.css';
import { createMinimap } from '../src/minimap';
import { initializeLocalization, languageControl, onLocaleChange, setLocale } from '../src/i18n';
import geometry from '../src/data/minimap-contract.json';
import landmarkCatalog from '../src/data/landmarks.json';
import type { NavigationSnapshot } from '../src/navigation-bridge';

document.querySelector('#locale')!.innerHTML = languageControl('fixture-language');
const screen = document.querySelector<HTMLElement>('.fixture-screen')!;
const toggle = document.querySelector<HTMLSelectElement>('#minimap-visibility')!;
const hint = document.querySelector<HTMLElement>('#minimap-hint')!;
const values = new Map<string, string>();
const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
let opened = 0;
const hud = createMinimap({ screen, toggle, hint, geometry, storage, openGuide: () => { opened++; } });
const button = screen.querySelector<HTMLButtonElement>('#live-minimap')!;
const player = button.querySelector<SVGGElement>('.minimap-player')!;
const field: NavigationSnapshot = { frame: 2, sequence: 4, flags: 79, x: 30, y: 66, width: 44, height: 77, mapGroup: 43, mapNumber: 0, facing: 2, mapType: 1, contextFlags: 0 };
function showField(packet = field) { hud.update({ phase: 'live', snapshot: packet }); }
function preference(value: string) { toggle.value = value; toggle.dispatchEvent(new Event('change', { bubbles: true })); }
function assert(condition: unknown, message: string) { if (!condition) throw new Error(message); }
initializeLocalization();
onLocaleChange(() => hud.refreshLocale());
showField();
document.querySelector('#context')!.addEventListener('change', (event) => {
  const value = (event.target as HTMLSelectElement).value;
  if (value === 'field') showField();
  else if (value === 'indoor') showField({ ...field, flags: 23, mapNumber: 3, x: 6, y: 5, width: 13, height: 16, mapType: 8 });
  else if (value === 'welcome') showField({ ...field, flags: 23, mapNumber: 13, x: 6, y: 5, width: 13, height: 10, mapType: 8 });
  else if (value === 'menu') showField({ ...field, contextFlags: 32 });
  else hud.update({ phase: value === 'unsupported' ? 'unavailable' : 'hidden' });
});
document.querySelector<HTMLButtonElement>('#run')!.addEventListener('click', () => {
  const lines: string[] = [];
  function check(name: string, test: () => void) {
    try { test(); lines.push(`PASS ${name}`); } catch (error) { lines.push(`FAIL ${name}: ${error}`); }
    document.querySelector('#results')!.textContent = lines.join('\n');
  }
  setLocale('en');
  check('default On centres a street view on the mapped tile with every gym and landmark marked', () => {
    showField();
    assert(toggle.value === 'on' && !button.hidden, 'Expected default On');
    assert(player.getAttribute('transform') === 'translate(115.5 119.5)', 'Incorrect mapped tile center');
    assert(button.querySelector('svg')!.getAttribute('viewBox') === '93 106 36 27', 'Expected a 36×27 view centred on the player, clamped to the east edge');
    assert(button.querySelectorAll('.minimap-gym').length === 10 && button.querySelectorAll('.minimap-sight').length === 10, 'Expected ten gyms and ten landmarks');
    assert(button.querySelector('image')?.getAttribute('href'), 'Expected the city render under the markers');
  });
  check('shared button icon styles do not shrink the map drawing', () => {
    const drawing = button.querySelector('svg')!.getBoundingClientRect();
    assert(drawing.width >= 56 && Math.abs(drawing.width / drawing.height - 4 / 3) < .02, 'Expected a 4:3 view at the HUD content width');
  });
  check('menu Off hides immediately and persists for a reconstructed HUD', () => {
    preference('off');
    assert(button.hidden, 'Off must hide');
    const temporary = document.createElement('div');
    const secondToggle = document.createElement('select');
    secondToggle.innerHTML = '<option value="on">On</option><option value="off">Off</option>';
    const second = createMinimap({ screen: temporary, toggle: secondToggle, hint: document.createElement('small'), geometry, storage, openGuide() {} });
    second.update({ phase: 'live', snapshot: field });
    assert(!second.enabled && temporary.querySelector<HTMLButtonElement>('button')!.hidden, 'Off did not persist');
  });
  check('On restores a fresh location without changing the field surface', () => {
    const original = screen;
    preference('on');
    assert(!button.hidden && screen === original, 'Expected unchanged surface and visible HUD');
  });
  check('indoor coordinates use the Station entrance and an indoor label', () => {
    showField({ ...field, flags: 23, mapNumber: 3, x: 0, y: 0, width: 13, height: 16, mapType: 8 });
    assert(player.getAttribute('transform') === 'translate(117.5 117.5)', 'Indoor dot used room coordinates');
    assert(button.textContent!.includes('Indoors'), 'Missing indoor label');
  });
  check('native busy/unknown contexts hide and remove the cached current position', () => {
    for (const contextFlags of [1, 4, 16, 32, 0x8000]) {
      showField({ ...field, contextFlags });
      assert(button.hidden && !player.hasAttribute('transform') && !button.hasAttribute('title'), 'Busy state retained a location');
    }
  });
  check('stale, paused and unsupported states have no live dot', () => {
    for (const phase of ['hidden', 'connecting', 'unavailable'] as const) {
      hud.update({ phase });
      assert(button.hidden && !player.hasAttribute('transform'), 'Stale state retained a location');
    }
    assert(hint.textContent!.includes('City Map'), 'Full guide fallback missing');
  });
  check('unknown native maps do not turn into plausible city coordinates', () => {
    showField({ ...field, mapNumber: 99 });
    assert(button.hidden, 'Unknown native map was rendered');
  });
  check('every compact landmark name fits the minimum HUD width in both languages', () => {
    const previousWidth = screen.style.width;
    screen.style.width = '240px';
    try {
      for (const locale of ['en', 'zh-Hant'] as const) {
        setLocale(locale);
        const shown = new Set<string>();
        for (const marker of Object.values(geometry.markersById)) {
          const map = geometry.mapsByNativeKey[marker.exteriorNativeKey as keyof typeof geometry.mapsByNativeKey];
          const [mapGroup, mapNumber] = marker.exteriorNativeKey.split(':').map(Number);
          showField({ ...field, mapGroup, mapNumber, width: map.width, height: map.height, x: marker.localEntrance[0], y: marker.localEntrance[1] });
          const label = button.querySelector<HTMLElement>('.minimap-context')!;
          const place = landmarkCatalog.find((entry) => entry.id === marker.id)!;
          const fullName = locale === 'en' ? place.nameEn : place.nameZh;
          assert(label.scrollWidth <= label.clientWidth, `${locale} ${marker.id} clips at ${label.clientWidth}px`);
          assert(button.title.includes(fullName) && button.getAttribute('aria-label')!.includes(fullName), 'Full landmark identity was lost');
          shown.add(label.textContent!);
        }
        assert(shown.size === Object.keys(geometry.markersById).length, 'Compact names must distinguish every mapped landmark');
      }
    } finally { screen.style.width = previousWidth; setLocale('en'); showField(); }
  });
  check('indoor badge preserves landmark name and HUD size, then clears on hidden state', () => {
    showField();
    const before = button.getBoundingClientRect();
    showField({ ...field, flags: 23, mapNumber: 3, x: 6, y: 5, width: 13, height: 16, mapType: 8 });
    const badge = button.querySelector<HTMLElement>('.minimap-indoor')!;
    const after = button.getBoundingClientRect();
    assert(!badge.hidden && badge.textContent === 'Indoors', 'Expected visible indoor status');
    assert(button.querySelector('.minimap-context')!.textContent === 'Old Station', 'Indoor prefix displaced landmark identity');
    assert(before.width === after.width && before.height === after.height, 'Indoor status expanded the HUD');
    hud.update({ phase: 'hidden' });
    assert(badge.hidden && !badge.textContent, 'Hidden state retained an indoor label');
  });
  check('language refresh preserves the same HUD and localizes landmark context', () => {
    showField(); setLocale('zh-Hant');
    assert(screen.querySelector('#live-minimap') === button && button.querySelector('.minimap-context')!.textContent === '舊車站', 'Chinese context or node identity failed');
    assert(button.getAttribute('aria-label')!.includes('舊臺中車站'), 'Full Chinese name was lost');
  });
  check('tapping the minimap opens the existing City Map action once', () => {
    const before = opened;
    button.click();
    assert(opened === before + 1, 'Expected one guide action');
  });
  document.querySelector('#results')!.textContent += `\n${lines.filter((line) => line.startsWith('PASS')).length}/${lines.length} checks passed. Fixture data only.`;
  showField();
});
