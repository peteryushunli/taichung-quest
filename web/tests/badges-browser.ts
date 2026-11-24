import { badgeDesigns } from '../src/badge-art';
import { NativeBadgeBridge } from '../src/badge-bridge';
import { createBadgeView } from '../src/badge-view';
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const slot = byId<HTMLSelectElement>('slot');
badgeDesigns.forEach((badge, index) => slot.add(new Option(`${index} · ${badge.name.en}`, String(index))));
const screen = byId('badge-fixture-screen');
const view = createBadgeView(screen, badgeDesigns); view.setPaired(true);
const metadata = { version: 1 as const, size: 32 as const, address: 0x0203f020, magicA: 0x44424354, magicB: 0x31303047 };
const heap = new Uint8Array(new SharedArrayBuffer(1024));
const words = new Uint32Array(heap.buffer, 160, 8);
words.set([metadata.magicA, metadata.magicB, 0x00200001, metadata.address, 2, 1, 0, 0]);
const anchor = { heap, offset: 128, address: metadata.address - 32 };
function packet() {
  const scene = Number(byId<HTMLSelectElement>('scene').value);
  const owned = Number(byId<HTMLSelectElement>('owned').value);
  words[6] = scene ? owned | scene << 16 | Number(slot.value) << 24 : 255 << 24;
  words[7] = scene ? Number(byId<HTMLInputElement>('visible').checked) | Number(byId<HTMLSelectElement>('language').value) << 8 : 0;
}
packet();
const bridge = new NativeBadgeBridge({ metadata, getAnchor: () => anchor,
  isActive: () => byId<HTMLInputElement>('active').checked, onState: state => view.update(state) });
const ticker = setInterval(() => { if (byId<HTMLInputElement>('ticks').checked) { packet(); words[4] += 2; words[5]++; } }, 16);
bridge.start();
for (const id of ['scene','slot','language','owned','visible','active']) byId(id).addEventListener('change', () => { packet(); bridge.refresh(); });
byId('paired').addEventListener('change', () => view.setPaired(byId<HTMLInputElement>('paired').checked));
window.addEventListener('pagehide', () => { bridge.stop(); clearInterval(ticker); });
byId('run').addEventListener('click', () => {
  const lines: string[] = [];
  const root = view.element;
  const packet = root.dataset;
  lines.push(`${!root.hidden ? 'PASS' : 'FAIL'} paired advancing native scene visible`);
  lines.push(`${root.querySelectorAll('.badge-view-slot').length === 10 ? 'PASS' : 'FAIL'} ten stable slots`);
  lines.push(`${root.querySelectorAll('.badge-view-slot.is-earned').length === Number(packet.completedMask).toString(2).replace(/0/g,'').length ? 'PASS' : 'FAIL'} exact native earned mask`);
  lines.push(`${root.querySelector('.is-selected')?.getAttribute('data-gym') === packet.selectedGym ? 'PASS' : 'FAIL'} genuine packet selection`);
  lines.push(`${getComputedStyle(root).pointerEvents === 'none' && root.querySelectorAll('button,input,select,[tabindex]').length === 0 ? 'PASS' : 'FAIL'} no presentation input/focus controls`);
  const bounds = screen.getBoundingClientRect();
  const texts = [...root.querySelectorAll<HTMLElement>('.badge-view-name,.badge-view-place,.badge-view-earned,.badge-view-footer')];
  lines.push(`${texts.every(text => { const box = text.getBoundingClientRect(); return box.left >= bounds.left && box.right <= bounds.right && box.top >= bounds.top && box.bottom <= bounds.bottom && text.scrollWidth <= text.clientWidth + 1; }) ? 'PASS' : 'FAIL'} readable text stays inside game viewport`);
  byId('results').textContent = lines.join('\n');
});
