import landmarkCatalog from './data/landmarks.json';
import './city-guide.css';
import { getLocale, initializeLocalization, languageControl, localizeTree, onLocaleChange, t } from './i18n';

interface Landmark {
  id: string;
  nameEn: string;
  nameZh: string;
  category: string;
  description: string;
  officialUrl: string;
  officialSourceTitle: string;
  mapX: number;
  mapY: number;
  playable: boolean;
  location?: { address: string; latitude: number; longitude: number } | null;
}

interface GuideHost {
  getState(): { running: boolean; paused: boolean };
  pause(): void;
  resume(): void;
  releaseInputs(): void;
}

const landmarks = landmarkCatalog as Landmark[];
const shortNames: Record<string, string> = {
  'calligraphy-greenway': 'Calligraphy Greenway',
  'cmp-park-lane': 'CMP Park Lane',
  'fine-arts-museum': 'Museum of Fine Arts',
  'natural-science-museum': 'Natural Science Museum',
  'taichung-theater': 'National Taichung Theater',
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

// Original vector sketches, drawn for this guide rather than sourced from game tiles.
function illustration(id: string) {
  const common = '<rect width="320" height="180" fill="#e8eddb"/><path d="M0 146h320v34H0z" fill="#d2ddc3"/><path d="M0 160h320" stroke="#c0cfb1" stroke-width="2"/><circle cx="263" cy="35" r="17" fill="#e6c779"/>';
  const tree = (x: number, y: number, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-3 0h6v47h-6z" fill="#7e8665"/><path d="M-23 9q-9-19 5-28-1-20 18-23 18 1 19 19 16 9 8 26-4 15-24 16-17 4-26-10" fill="#83a078"/><path d="M0-28v49m0-13-13-13m13 3 13-14" stroke="#6b8e65" stroke-width="2" fill="none"/></g>`;
  const scenes: Record<string, string> = {
    'calligraphy-greenway': `<path d="m140 180 9-52h21l16 52" fill="#efe6c7"/><path d="M151 127V64h12v63" fill="#efe6c7"/>${tree(91, 96, 1.05)}${tree(222, 90, 1.2)}${tree(47, 132, .7)}${tree(270, 128, .72)}<path d="M57 144h33m-30-6h27m-25 6v10m22-10v10" fill="none" stroke="#997a58" stroke-width="4"/><path d="M190 141h25m-22-6h21m-19 6v10m16-10v10" fill="none" stroke="#997a58" stroke-width="3"/><circle cx="157" cy="130" r="4" fill="#b97d58"/><path d="M153 135h8v12h-8z" fill="#d17e58"/><path d="M155 147v8m4-8v8" stroke="#466750" stroke-width="2"/><path d="m151 110 5-3 6 3m-4-13 4-2 5 2" fill="none" stroke="#6f8c62" stroke-width="2"/>`,
    'cmp-park-lane': `<path d="M78 62h164v89H78z" fill="#e5e0c7" stroke="#73856c" stroke-width="2"/><path d="M88 51h145v12H88z" fill="#a9b994"/><path d="M88 75h144v10H88zm0 23h144v10H88zm0 23h144v10H88z" fill="#7d9c78"/><path d="M103 64v77m28-77v77m29-77v77m29-77v77m29-77v77" stroke="#c6c9ae" stroke-width="6"/><path d="M86 64c12 9-1 29 8 41m39-42c-9 15 5 30-4 50m51-48c12 17-3 28 5 45m37-44c-9 16 1 29-5 42" stroke="#5c8b61" stroke-width="7" fill="none"/><path d="M139 130h45v21h-45z" fill="#466c59"/><path d="M161 132v17" stroke="#b4c7a8" stroke-width="2"/>${tree(52, 128, .65)}${tree(268, 126, .72)}<path d="M65 152h190" stroke="#a7b998" stroke-width="3"/>`,
    'fine-arts-museum': `<path d="M54 104h211v47H54z" fill="#efebd9" stroke="#9aa18a" stroke-width="2"/><path d="M72 83h176v22H72z" fill="#e5e1ca" stroke="#9aa18a" stroke-width="2"/><path d="M87 65h142v18H87z" fill="#efe9d3"/><path d="M67 114h184v17H67z" fill="#658575"/><path d="M79 114v17m22-17v17m23-17v17m24-17v17m24-17v17m23-17v17m24-17v17m22-17v17" stroke="#e4dfc8" stroke-width="4"/><path d="M139 131h42v20h-42z" fill="#597a69"/><path d="M49 151h222m-211 6h200" stroke="#b2bba3" stroke-width="3"/>${tree(30, 128, .7)}${tree(291, 123, .83)}<path d="m216 148 8-23 13 13-10 14" fill="#b27b56"/><path d="M215 153h27" stroke="#b4bba1" stroke-width="5"/>`,
    'natural-science-museum': `<path d="M63 139c0-70 42-102 98-102s97 32 97 102z" fill="#a9c5b3" stroke="#628772" stroke-width="3"/><path d="M85 138c0-52 25-95 76-101-27 34-26 70-26 101m102 0c0-52-25-95-76-101 27 34 26 70 26 101m-26-101v101M70 100h180M93 62h136" fill="none" stroke="#e7ecdb" stroke-width="3"/><path d="M72 138h176v14H72z" fill="#7d9675"/><path d="M145 124h32v28h-32z" fill="#50725b"/><path d="M151 125v26m18-26v26" stroke="#bdcbb2" stroke-width="2"/><path d="m203 119-3-17-10 3m11-2 11 1m-12-1-8-10m9 10 7-11" stroke="#739566" stroke-width="3" fill="none"/>${tree(38, 131, .55)}${tree(280, 130, .65)}`,
    'taichung-theater': `<path d="M53 75q23-17 46-12h119q24-5 48 12v78H53z" fill="#eae5d0" stroke="#a6ac96" stroke-width="2"/><path d="M58 82q23 15 44 0t43 0 43 0 44 0 29 0" fill="none" stroke="#c4c9b4" stroke-width="2"/><path d="M58 118q22-15 43 0t43 0 44 0 44 0 29 0" fill="none" stroke="#c4c9b4" stroke-width="2"/><path d="M76 88c-14 0-14 38 0 38s14-38 0-38m49-11c-17 0-17 54 0 54s17-54 0-54m51 13c-15 0-15 37 0 37s15-37 0-37m52-11c-18 0-18 54 0 54s18-54 0-54" fill="#819a88"/><path d="M96 130q12-18 24 0v23H96m81-20q12-18 24 0v20h-24" fill="#4f705d"/><path d="M46 153h227m-216 6h206" stroke="#b7c2a6" stroke-width="3"/>${tree(31, 130, .6)}${tree(288, 128, .7)}`,
  };
  const place = landmarks.find((entry) => entry.id === id);
  const label = getLocale() === 'zh-Hant' ? `${place?.nameZh ?? '台中地標'}原創插圖` : `Original illustration of ${place?.nameEn ?? 'a Taichung landmark'}`;
  return `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(label)}">${common}${scenes[id] ?? scenes['calligraphy-greenway']}</svg>`;
}

export function createCityGuide(host: GuideHost) {
  const point = (id: string) => {
    const place = landmarks.find((entry) => entry.id === id)!;
    return `${place.mapX * 6} ${place.mapY * 4.3}`;
  };
  const greenSpine = ['natural-science-museum', 'cmp-park-lane', 'calligraphy-greenway', 'fine-arts-museum'].map((id, index) => `${index ? 'L' : 'M'}${point(id)}`).join(' ');
  const theaterConnection = `M${point('taichung-theater')} L${point('natural-science-museum')}`;
  const dialog = document.createElement('dialog');
  dialog.className = 'city-guide';
  dialog.id = 'city-guide';
  dialog.setAttribute('aria-labelledby', 'city-guide-title');
  dialog.setAttribute('aria-describedby', 'city-guide-intro');
  dialog.innerHTML = `
    <div class="guide-shell">
      <header class="guide-header"><div><p class="guide-eyebrow"><span data-i18n="TAICHUNG FIELD GUIDE">TAICHUNG FIELD GUIDE</span> <span class="guide-bilingual-heading" lang="zh-Hant">· 台中城市導覽</span></p><h2 id="city-guide-title" data-i18n="A small map. A bigger city.">A small map. A bigger city.</h2></div><button class="guide-close" aria-label="Close City Map" data-i18n-label="Close City Map" autofocus>×</button></header>
      <p class="guide-intro" id="city-guide-intro" data-i18n="A few places that make Taichung, Taichung. Choose any landmark to discover the real city behind the adventure.">A few places that make Taichung, Taichung. Choose any landmark to discover the real city behind the adventure.</p>
      <div class="guide-language">${languageControl('guide-interface-language')}</div>
      <div class="guide-body">
        <section class="guide-overview" aria-label="Schematic Taichung landmark map">
          <div class="overview-heading"><span>TAICHUNG <span lang="zh-Hant">臺中</span></span><span class="compass" aria-label="North points up">N ↑</span></div>
          <div class="guide-map">
            <svg class="guide-map-drawing" viewBox="0 0 600 430" aria-hidden="true"><defs><pattern id="map-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0v24" fill="none" stroke="#d9e1cc" stroke-width=".7"/></pattern></defs><rect width="600" height="430" fill="#e9efde"/><rect width="600" height="430" fill="url(#map-grid)"/><path d="M72 0v430m76-430v430m77-430v430m150-430v430m78-430v430m78-430v430M0 81h600M0 167h600M0 252h600M0 338h600" stroke="#f5f2e3" stroke-width="12"/><path d="m0 400 180-35 105-87 45-118L475 0" fill="none" stroke="#adc8bb" stroke-width="13"/><path d="${greenSpine}" fill="none" stroke="#b3cba0" stroke-width="37" stroke-linecap="round" stroke-linejoin="round"/><path d="${greenSpine}" fill="none" stroke="#e5ddbb" stroke-width="9" stroke-dasharray="3 6"/><path d="${theaterConnection}" stroke="#b7ac8a" stroke-width="2" stroke-dasharray="5 6" fill="none"/><path d="M20 378q36-29 71-3t69 1m319-304q33-33 73-12" fill="none" stroke="#c6d7b7" stroke-width="16" stroke-linecap="round"/><g fill="#a5bd91"><circle cx="266" cy="96" r="7"/><circle cx="311" cy="104" r="6"/><circle cx="267" cy="194" r="6"/><circle cx="312" cy="202" r="7"/><circle cx="265" cy="286" r="7"/><circle cx="311" cy="291" r="6"/><circle cx="36" cy="35" r="10"/><circle cx="64" cy="30" r="7"/><circle cx="556" cy="379" r="11"/><circle cx="530" cy="391" r="8"/></g><text x="421" y="319" fill="#a3b197" font-family="monospace" font-size="9" letter-spacing="2">WEST DISTRICT</text><text x="421" y="335" fill="#a3b197" font-family="sans-serif" font-size="10" letter-spacing="3">西 區</text></svg>
            ${landmarks.map((place, index) => `<button class="landmark-marker ${place.playable ? 'is-playable' : 'is-planned'} ${['cmp-park-lane', 'fine-arts-museum'].includes(place.id) ? 'label-left' : place.id === 'taichung-theater' ? 'label-below' : 'label-right'}" data-landmark="${escapeHtml(place.id)}" style="--map-x:${place.mapX}%;--map-y:${place.mapY}%" aria-pressed="false" aria-controls="landmark-detail"><span class="marker-number">${String(index + 1).padStart(2, '0')}</span><span class="marker-label"><b lang="zh-Hant">${escapeHtml(place.nameZh)}</b><span>${escapeHtml(shortNames[place.id] ?? place.nameEn)}</span></span></button>`).join('')}
          </div>
          <div class="map-legend"><span><i class="legend-playable"></i><span data-i18n="Playable starting area">Playable starting area</span></span><span><i class="legend-planned"></i><span data-i18n="Planned game area">Planned game area</span></span></div>
          <p class="map-caveat" data-i18n="A compressed game-world sketch, not a street-navigation map. These five guide examples are open to everyone; the final game destinations are still being chosen.">A compressed game-world sketch, not a street-navigation map. These five guide examples are open to everyone; the final game destinations are still being chosen.</p>
          <div class="landmark-tabs" aria-label="Choose a landmark">${landmarks.map((place, index) => `<button data-guide-select="${escapeHtml(place.id)}" aria-pressed="false">${String(index + 1).padStart(2, '0')} <span lang="zh-Hant">${escapeHtml(place.nameZh)}</span></button>`).join('')}</div>
        </section>
        <section class="landmark-detail" id="landmark-detail" aria-label="Selected landmark information" aria-live="polite"></section>
      </div>
      <footer class="guide-footer"><p><span data-i18n="Real places. A fictional adventure.">Real places. A fictional adventure.</span><br><span data-i18n="Visitor information is available from the start.">Visitor information is available from the start.</span></p><button class="guide-return"><span data-i18n="Back to adventure">Back to adventure</span><span aria-hidden="true">↗</span></button></footer>
    </div>`;
  document.body.append(dialog);

  let selected = landmarks.find((place) => place.playable)?.id ?? landmarks[0]?.id;
  let resumeOnClose = false;
  let returnFocus: HTMLElement | null = null;

  function select(id: string) {
    const place = landmarks.find((entry) => entry.id === id);
    if (!place) return;
    selected = id;
    dialog.querySelectorAll<HTMLButtonElement>('[data-landmark], [data-guide-select]').forEach((button) => {
      const active = (button.dataset.landmark ?? button.dataset.guideSelect) === selected;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-selected', active);
    });
    const officialUrl = new URL(place.officialUrl);
    if (officialUrl.protocol !== 'https:') throw new Error('Landmark information must use a secure official visitor URL.');
    dialog.querySelector('#landmark-detail')!.innerHTML = `
      <div class="landmark-art">${illustration(place.id)}<span>${t('ORIGINAL FIELD SKETCH')}</span></div>
      <div class="landmark-copy"><p class="landmark-category">${escapeHtml(t(place.category))}</p><h3>${escapeHtml(getLocale() === 'zh-Hant' ? place.nameZh : place.nameEn)}<span lang="${getLocale() === 'zh-Hant' ? 'en' : 'zh-Hant'}">${escapeHtml(getLocale() === 'zh-Hant' ? place.nameEn : place.nameZh)}</span></h3><p class="visitor-description">${escapeHtml(t(place.description))}</p><a class="official-link" href="${escapeHtml(officialUrl.href)}" target="_blank" rel="noopener noreferrer">${t('Official visitor information')} <span aria-hidden="true">↗</span></a><p class="visitor-source">${t('Source')}: ${escapeHtml(place.officialSourceTitle)}</p></div>
      <div class="landmark-game-note"><span class="area-status ${place.playable ? 'area-playable' : 'area-planned'}">${t(place.playable ? 'PLAYABLE STARTING AREA' : 'PLANNED · NOT PLAYABLE YET')}</span><p>${t(place.playable ? 'Explore a provisional Greenway-inspired neighborhood in the current game.' : 'This real place is a visitor-guide example. Its game district is still to be built.')}</p><div class="gym-note"><span>${t('FICTIONAL GYM')}</span><p>${t('Concept to be designed. No gym battle at this landmark in the current build.')}</p></div></div>`;
  }

  dialog.querySelectorAll<HTMLButtonElement>('[data-landmark], [data-guide-select]').forEach((button) => {
    button.addEventListener('click', () => select((button.dataset.landmark ?? button.dataset.guideSelect)!));
  });
  dialog.querySelector('.guide-close')!.addEventListener('click', () => dialog.close());
  dialog.querySelector('.guide-return')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    host.releaseInputs();
    if (resumeOnClose && host.getState().running) host.resume();
    resumeOnClose = false;
    returnFocus?.focus({ preventScroll: true });
  });
  if (selected) select(selected);
  initializeLocalization(dialog);
  onLocaleChange(() => {
    localizeTree(dialog);
    if (selected) select(selected);
  });

  return {
    get isOpen() { return dialog.open; },
    open(trigger?: HTMLElement) {
      if (dialog.open) return;
      returnFocus = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      const state = host.getState();
      resumeOnClose = state.running && !state.paused;
      host.releaseInputs();
      if (resumeOnClose) host.pause();
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>('.guide-close')!.focus();
    },
    onGameStarted() {
      if (dialog.open) { resumeOnClose = true; host.pause(); }
    },
  };
}
