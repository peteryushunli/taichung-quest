import '../src/style.css';
import '../src/minimap.css';
import { createMinimap } from '../src/minimap';
import { initializeLocalization, languageControl, onLocaleChange, setLocale } from '../src/i18n';
import geometry from '../src/data/minimap-contract.json';
import landmarkCatalog from '../src/data/landmarks.json';
import sightCatalog from '../src/data/sights.json';
import { RADAR } from '../src/minimap-model';
import { isGym, placeWorld } from '../src/landing-model';
import type { LandingLandmark } from '../src/landing-model';
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
const player = button.querySelector<SVGPathElement>('.minimap-player')!;
const drawing = () => button.querySelector('svg')!;
const places = [...landmarkCatalog, ...sightCatalog] as LandingLandmark[];
const shown = (element: Element) => element.getAttribute('display') !== 'none';
const translation = (element: Element) => (/translate\(([-\d.e]+) ([-\d.e]+)\)/.exec(element.getAttribute('transform') ?? '') ?? []).slice(1).map(Number);
const field: NavigationSnapshot = { frame: 2, sequence: 4, flags: 79, x: 30, y: 66, width: 44, height: 77, mapGroup: 43, mapNumber: 0, facing: 2, mapType: 1, contextFlags: 0 };
function showField(packet = field) { hud.update({ phase: 'live', snapshot: packet }); }
/** A simulated field packet for a world tile, in whichever exterior district contains it. */
function fieldAt(worldX: number, worldY: number, facing = 2): NavigationSnapshot {
  for (const [key, map] of Object.entries(geometry.mapsByNativeKey)) {
    if (map.kind !== 'exterior' || !('worldOrigin' in map) || !map.worldOrigin) continue;
    const [x, y] = [worldX - map.worldOrigin[0], worldY - map.worldOrigin[1]];
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
    const [mapGroup, mapNumber] = key.split(':').map(Number);
    return { ...field, mapGroup, mapNumber, width: map.width, height: map.height, x, y, facing };
  }
  throw new Error(`No exterior map at ${worldX},${worldY}`);
}
function preference(value: string) { toggle.value = value; toggle.dispatchEvent(new Event('change', { bubbles: true })); }
function assert(condition: unknown, message: string) { if (!condition) throw new Error(message); }
initializeLocalization();
onLocaleChange(() => hud.refreshLocale());
// ?world=x,y[&facing=1-4] shows a fixed world tile, for screenshots.
const requested = new URLSearchParams(location.search);
const world = requested.get('world')?.split(',').map(Number);
if (world?.length === 2) showField(fieldAt(world[0], world[1], Number(requested.get('facing') ?? 2)));
else showField();
document.querySelector('#context')!.addEventListener('change', (event) => {
  const value = (event.target as HTMLSelectElement).value;
  if (value === 'field') showField();
  else if (value === 'indoor') showField({ ...field, flags: 23, mapNumber: 3, x: 6, y: 5, width: 13, height: 16, mapType: 8 });
  else if (value === 'welcome') showField({ ...field, flags: 23, mapNumber: 13, x: 6, y: 5, width: 13, height: 10, mapType: 8 });
  else if (value === 'station') showField(fieldAt(117, 119));
  else if (value === 'highway') showField(fieldAt(3, 40, 3));
  else if (value === 'wanhe') showField(fieldAt(31, 143, 4));
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
  check('default On centres a 60-tile north-up radar on the mapped tile with every gym, landmark and home blip', () => {
    showField();
    assert(toggle.value === 'on' && !button.hidden, 'Expected default On');
    assert(player.getAttribute('transform') === 'translate(115.5 119.5) rotate(0)', 'Incorrect mapped tile center or facing');
    assert(drawing().getAttribute('viewBox') === '85.5 89.5 60 60', 'Expected a 60-tile view centred on the player');
    assert(button.querySelectorAll('.minimap-gym').length === 10 && button.querySelectorAll('.minimap-sight').length === 10, 'Expected ten gyms and ten landmarks');
    assert(button.querySelectorAll('[data-landmark]').length === 20, 'Expected data-landmark on every place blip');
    assert(shown(button.querySelector('.minimap-home')!), 'Expected the home blip');
    assert(button.querySelector('image')?.getAttribute('href'), 'Expected the radar art under the blips');
    assert(button.textContent!.trim() === 'N', 'Expected no caption text, only the N badge');
    assert(hint.textContent!.includes('Hidden indoors'), 'Settings hint must say the radar hides indoors');
  });
  check('the radar is a circle at the HUD content width, unaffected by shared button icon styles', () => {
    const box = drawing().getBoundingClientRect();
    assert(box.width >= 84 && Math.abs(box.width - box.height) < 1, `Expected a round radar, got ${box.width}×${box.height}`);
    assert(getComputedStyle(drawing()).clipPath.startsWith('circle'), 'Expected a circular clip');
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
  check('indoors (gym rooms and the welcome room) hides the radar and clears the cached position', () => {
    for (const room of [{ mapNumber: 3, width: 13, height: 16 }, { mapNumber: 13, width: 13, height: 10 }]) {
      showField();
      showField({ ...field, ...room, flags: 23, x: 6, y: 5, mapType: 8 });
      assert(button.hidden && !player.hasAttribute('transform') && !drawing().hasAttribute('viewBox') && !button.hasAttribute('title'), `Room ${room.mapNumber} kept the radar`);
    }
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
  check('at the west highway the view stays centred past the world edge and far gyms pin to the rim along their bearing', () => {
    showField(fieldAt(3, 40, 3));
    assert(drawing().getAttribute('viewBox') === '-26.5 10.5 60 60', 'Expected no clamping at the world edge');
    assert(player.getAttribute('transform') === 'translate(3.5 40.5) rotate(270)', 'Expected a west-facing arrow');
    let pinned = 0;
    for (const place of places) {
      const blip = button.querySelector<SVGElement>(`[data-landmark="${place.id}"]`)!;
      const [x, y] = placeWorld(place, geometry.markersById);
      const far = Math.hypot(x - 3, y - 40) > RADAR.rim;
      if (!isGym(place)) { assert(shown(blip) === !far, `${place.id} visibility`); continue; }
      assert(shown(blip), `${place.id} gym must always show`);
      const [bx, by] = translation(blip);
      assert(blip.classList.contains('on-rim') === far, `${place.id} rim state`);
      if (far) {
        pinned++;
        assert(Math.abs(Math.hypot(bx - 3.5, by - 40.5) - RADAR.rim) < 1e-6, `${place.id} not on the rim`);
        assert(Math.abs(Math.atan2(by - 40.5, bx - 3.5) - Math.atan2(y - 40, x - 3)) < 1e-6, `${place.id} bearing`);
      } else assert(bx === x + .5 && by === y + .5, `${place.id} in place`);
    }
    assert(pinned > 0, 'Expected at least one pinned gym');
    const home = button.querySelector<SVGElement>('.minimap-home')!;
    assert(shown(home) && home.classList.contains('on-rim'), 'Home must pin to the rim when far away');
  });
  check('every landmark entrance centres the radar with its own blip in place and names it for assistive tech', () => {
    for (const locale of ['en', 'zh-Hant'] as const) {
      setLocale(locale);
      for (const marker of Object.values(geometry.markersById)) {
        const map = geometry.mapsByNativeKey[marker.exteriorNativeKey as keyof typeof geometry.mapsByNativeKey];
        const [mapGroup, mapNumber] = marker.exteriorNativeKey.split(':').map(Number);
        showField({ ...field, mapGroup, mapNumber, width: map.width, height: map.height, x: marker.localEntrance[0], y: marker.localEntrance[1] });
        const [x, y] = marker.world;
        assert(drawing().getAttribute('viewBox') === `${x + .5 - 30} ${y + .5 - 30} 60 60`, `${marker.id} view not centred`);
        const blip = button.querySelector<SVGElement>(`[data-landmark="${marker.id}"]`)!;
        assert(shown(blip) && !blip.classList.contains('on-rim'), `${marker.id} blip should be in place`);
        const place = landmarkCatalog.find((entry) => entry.id === marker.id)!;
        const fullName = locale === 'en' ? place.nameEn : place.nameZh;
        assert(button.title.includes(fullName) && button.getAttribute('aria-label')!.includes(fullName), `${locale} ${marker.id} identity was lost`);
      }
    }
    setLocale('en'); showField();
  });
  check('language refresh preserves the same HUD and localizes the accessible landmark name', () => {
    showField(); setLocale('zh-Hant');
    assert(screen.querySelector('#live-minimap') === button && button.getAttribute('aria-label')!.includes('舊臺中車站'), 'Chinese name or node identity failed');
    assert(hint.textContent!.includes('室內'), 'Chinese hint must say the radar hides indoors');
    setLocale('en');
  });
  check('tapping the minimap opens the existing City Map action once', () => {
    const before = opened;
    button.click();
    assert(opened === before + 1, 'Expected one guide action');
  });
  document.querySelector('#results')!.textContent += `\n${lines.filter((line) => line.startsWith('PASS')).length}/${lines.length} checks passed. Fixture data only.`;
  showField();
});
// ?run runs the checks on load, for headless browsers.
if (requested.has('run')) document.querySelector<HTMLButtonElement>('#run')!.click();
