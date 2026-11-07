import landmarkCatalog from './data/landmarks.json';
import './city-guide.css';
import { getLocale, initializeLocalization, languageControl, localizeTree, onLocaleChange, t } from './i18n';
import { landmarkSketch } from './landmark-art';

interface Landmark {
  id: string;
  nameEn: string;
  nameZh: string;
  shortNameEn: string;
  shortNameZh: string;
  category: string;
  categoryZh: string;
  description: string;
  descriptionZh: string;
  officialUrl: string;
  officialUrlZh?: string;
  officialSourceTitle: string;
  mapX: number;
  mapY: number;
  playable: boolean;
  phase: string;
  mapLabelSide: string;
  districtEn: string;
  districtZh: string;
  gymStatus: 'planned' | 'pending-verification' | 'playable';
  location: { address: string; addressZh: string; latitude: number; longitude: number };
}

interface GuideHost {
  getState(): { running: boolean; paused: boolean };
  pause(): void;
  resume(): void;
  releaseInputs(): void;
}

const landmarks = landmarkCatalog as Landmark[];

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}


export function createCityGuide(host: GuideHost) {
  // The three stitched district blocks and landmark anchors follow the native
  // city contract. This shows game geography, never real-world street routes.
  const mapDrawing = `<svg class="guide-map-drawing" viewBox="0 0 600 560" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="map-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0v24" fill="none" stroke="#d9e1cc" stroke-width=".7"/></pattern></defs><rect width="600" height="560" fill="#eef1e5"/><rect width="600" height="560" fill="url(#map-grid)"/><path d="M48 45h168v251H48z" fill="#e4ead5" stroke="#c1ceb0" stroke-width="2"/><path d="M216 170h168v282H216z" fill="#dce7ce" stroke="#b6c8a3" stroke-width="2"/><path d="M384 233h168v282H384z" fill="#eae5cf" stroke="#d0c7a7" stroke-width="2"/><path d="M66 256q41 15 89-3m89 157q46-12 113 2m50 75q51-17 122-5" fill="none" stroke="#cfdbc1" stroke-width="8" stroke-linecap="round"/><g fill="#bed0aa"><circle cx="75" cy="239" r="6"/><circle cx="97" cy="245" r="4"/><circle cx="353" cy="408" r="6"/><circle cx="335" cy="403" r="4"/><circle cx="401" cy="486" r="5"/></g></svg>`;
  const dialog = document.createElement('dialog');
  dialog.className = 'city-guide';
  dialog.id = 'city-guide';
  dialog.setAttribute('aria-labelledby', 'city-guide-title');
  dialog.setAttribute('aria-describedby', 'city-guide-intro');
  dialog.innerHTML = `
    <div class="guide-shell">
      <header class="guide-header"><div><p class="guide-eyebrow"><span data-i18n="TAICHUNG FIELD GUIDE">TAICHUNG FIELD GUIDE</span> <span class="guide-bilingual-heading" lang="zh-Hant">· 台中城市導覽</span></p><h2 id="city-guide-title" data-i18n="A small map. A bigger city.">A small map. A bigger city.</h2></div><button class="guide-close" aria-label="Close City Map" data-i18n-label="Close City Map" autofocus>×</button></header>
      <p class="guide-intro" id="city-guide-intro" data-i18n="Ten real places, one city adventure. Choose a landmark to discover its story and find official visitor information.">Ten real places, one city adventure. Choose a landmark to discover its story and find official visitor information.</p>
      <div class="guide-language">${languageControl('guide-interface-language')}</div>
      <div class="guide-body">
        <section class="guide-overview" aria-label="Schematic Taichung landmark map">
          <div class="overview-heading"><span>TAICHUNG <span lang="zh-Hant">臺中</span></span><span class="compass" aria-label="North points up">N ↑</span></div>
          <div class="guide-map">
            ${mapDrawing}
            <span class="map-district district-xitun"><span data-i18n="Xitun">Xitun</span><small lang="zh-Hant">西屯區</small></span><span class="map-district district-greenway"><span data-i18n="Greenway & culture">Greenway & culture</span><small lang="zh-Hant">草悟道文化區</small></span><span class="map-district district-old-city"><span data-i18n="Old city">Old city</span><small lang="zh-Hant">舊城區</small></span>
            ${landmarks.map((place, index) => `<button class="landmark-marker ${place.playable ? 'is-playable' : 'is-planned'} label-${escapeHtml(place.mapLabelSide)}" data-landmark="${escapeHtml(place.id)}" style="--map-x:${place.mapX}%;--map-y:${place.mapY}%" aria-label="${index + 1}. ${escapeHtml(place.nameEn)} · ${escapeHtml(place.nameZh)}" aria-pressed="false" aria-controls="landmark-detail"><span class="marker-number">${String(index + 1).padStart(2, '0')}</span><span class="marker-label"><b lang="zh-Hant">${escapeHtml(place.shortNameZh)}</b><span lang="en">${escapeHtml(place.shortNameEn)}</span></span></button>`).join('')}
          </div>
          <div class="map-legend"><span><i class="legend-playable"></i><span data-i18n="Explorable city areas">Explorable city areas</span></span><span><i class="legend-selected"></i><span data-i18n="Selected landmark">Selected landmark</span></span></div>
          <p class="map-caveat" data-i18n="Ten landmarks across three game districts. This compact game-world sketch is not a street-navigation map. Some landmark facades and visitor halls still use provisional game artwork.">Ten landmarks across three game districts. This compact game-world sketch is not a street-navigation map. Some landmark facades and visitor halls still use provisional game artwork.</p>
          <div class="landmark-tabs" aria-label="Choose a landmark">${landmarks.map((place, index) => `<button data-guide-select="${escapeHtml(place.id)}" aria-pressed="false" aria-controls="landmark-detail"><span class="landmark-tab-number">${String(index + 1).padStart(2, '0')}</span><span class="landmark-tab-names"><b lang="en">${escapeHtml(place.shortNameEn)}</b><span lang="zh-Hant">${escapeHtml(place.shortNameZh)}</span></span></button>`).join('')}</div>
        </section>
        <section class="landmark-detail" id="landmark-detail" aria-label="Selected landmark information" aria-live="polite"></section>
      </div>
      <footer class="guide-footer"><p><span data-i18n="Real places. A fictional adventure.">Real places. A fictional adventure.</span><br><span data-i18n="Visitor information is available from the start.">Visitor information is available from the start.</span></p><button class="guide-return"><span data-i18n="Back to adventure">Back to adventure</span><span aria-hidden="true">↗</span></button></footer>
    </div>`;
  document.body.append(dialog);

  let selected = landmarks.find((place) => place.playable)?.id ?? landmarks[0]?.id;
  let resumeOnClose = false;
  let returnFocus: HTMLElement | null = null;

  function select(id: string, reveal = false) {
    const place = landmarks.find((entry) => entry.id === id);
    if (!place) return;
    selected = id;
    dialog.querySelectorAll<HTMLButtonElement>('[data-landmark], [data-guide-select]').forEach((button) => {
      const active = (button.dataset.landmark ?? button.dataset.guideSelect) === selected;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-selected', active);
    });
    const chinese = getLocale() === 'zh-Hant';
    const officialUrl = new URL(chinese ? place.officialUrlZh ?? place.officialUrl : place.officialUrl);
    if (officialUrl.protocol !== 'https:') throw new Error('Landmark information must use a secure official visitor URL.');
    const areaLabel = !place.playable ? 'PLANNED AREA · NOT PLAYABLE' : place.phase === 'arrival' ? 'ARRIVAL AREA · EXPLORABLE' : 'EXPLORABLE GAME AREA';
    const areaNote = place.playable ? 'Explore this landmark’s district and visitor hall.' : 'This landmark is in the city plan; its game area is not playable in this build.';
    const gymNote = place.gymStatus === 'playable' ? 'A gym battle is playable here. Speak to the leader and win to earn a badge.' : place.gymStatus === 'pending-verification' ? 'This gym challenge is being verified. The district and visitor hall are explorable.' : 'This landmark’s fictional gym challenge is still in development.';
    const artLabel = chinese ? `${place.nameZh}原創插圖` : `Original illustration of ${place.nameEn}`;
    dialog.querySelector('#landmark-detail')!.innerHTML = `
      <div class="landmark-art">${landmarkSketch(place.id, artLabel)}<span>${t('ORIGINAL FIELD SKETCH')}</span></div>
      <div class="landmark-copy"><p class="landmark-category">${escapeHtml(chinese ? place.categoryZh : place.category)} <span>· ${escapeHtml(chinese ? place.districtZh : place.districtEn)}</span></p><h3>${escapeHtml(chinese ? place.nameZh : place.nameEn)}<span lang="${chinese ? 'en' : 'zh-Hant'}">${escapeHtml(chinese ? place.nameEn : place.nameZh)}</span></h3><p class="visitor-description">${escapeHtml(chinese ? place.descriptionZh : place.description)}</p><div class="visitor-address"><span>${t('Real-world address')}</span><address>${escapeHtml(chinese ? place.location.addressZh : place.location.address)}</address></div><a class="official-link" href="${escapeHtml(officialUrl.href)}" target="_blank" rel="noopener noreferrer">${t('Official visitor information')} <span aria-hidden="true">↗</span></a><p class="visitor-source">${t('Source')}: ${escapeHtml(place.officialSourceTitle)}</p></div>
      <div class="landmark-game-note"><span class="area-status ${place.playable ? 'area-playable' : 'area-planned'}">${t(areaLabel)}</span><p>${t(areaNote)}</p><div class="gym-note"><span>${t('FICTIONAL GYM CHALLENGE')}</span><p>${t(gymNote)}</p></div></div>`;
    if (reveal && matchMedia('(max-width: 670px)').matches) dialog.querySelector('#landmark-detail')!.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  dialog.querySelectorAll<HTMLButtonElement>('[data-landmark], [data-guide-select]').forEach((button) => {
    button.addEventListener('click', () => select((button.dataset.landmark ?? button.dataset.guideSelect)!, true));
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
