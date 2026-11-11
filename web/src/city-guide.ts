import landmarkCatalog from './data/landmarks.json';
import sightCatalog from './data/sights.json';
import cityContract from './data/minimap-contract.json';
import { landingMedia, landmarkArt } from './landing-assets';
import { cityPlaceSummary, districtLabelSpots, isGym, localizedPlace, markerPosition, orderPlaces, placeWorld } from './landing-model';
import type { LandingLandmark } from './landing-model';
import type { MinimapGeometry } from './minimap-model';
import './city-guide.css';
import { getLocale, initializeLocalization, localizeTree, onLocaleChange, t } from './i18n';
import { landmarkSketch } from './landmark-art';

interface Landmark extends LandingLandmark {
  category: string;
  categoryZh: string;
  officialSourceTitle?: string;
  playable: boolean;
  phase?: string;
  guideLabelSide?: 'left' | 'right' | 'above' | 'below';
  location?: { address: string; addressZh: string; latitude: number; longitude: number };
}

interface GuideHost {
  getState(): { running: boolean; paused: boolean };
  pause(): void;
  resume(): void;
  releaseInputs(): void;
}

// The ten gyms first, then the ten landmarks without one, numbered the same way as the website map.
const cityGeometry = cityContract as MinimapGeometry;
const landmarks = orderPlaces([...landmarkCatalog, ...sightCatalog] as Landmark[]);

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}


export function createCityGuide(host: GuideHost) {
  const { width, height } = cityGeometry.world;
  const dialog = document.createElement('dialog');
  dialog.className = 'city-guide';
  dialog.id = 'city-guide';
  dialog.setAttribute('aria-labelledby', 'city-guide-title');
  dialog.setAttribute('aria-describedby', 'city-guide-intro');
  dialog.innerHTML = `
    <div class="guide-shell">
      <header class="guide-header"><div><p class="guide-eyebrow"><span data-i18n="TAICHUNG FIELD GUIDE">TAICHUNG FIELD GUIDE</span> <span class="guide-bilingual-heading" lang="zh-Hant">· 台中城市導覽</span></p><h2 id="city-guide-title" data-i18n="A small map. A bigger city.">A small map. A bigger city.</h2></div><button class="guide-close" aria-label="Close City Map" data-i18n-label="Close City Map" autofocus>×</button></header>
      <p class="guide-intro" id="city-guide-intro"><span id="guide-place-count"></span> <span data-i18n="Choose a landmark to explore its game-world stop and find visitor information where available.">Choose a landmark to explore its game-world stop and find visitor information where available.</span></p>
      <div class="guide-body">
        <section class="guide-overview" aria-label="Taichung city map" data-i18n-label="Taichung city map">
          <div class="overview-heading"><span>TAICHUNG <span lang="zh-Hant">臺中</span></span><span class="compass" aria-label="North points up">N ↑</span></div>
          <div class="guide-map" style="--guide-map-aspect:${width} / ${height}">
            <img class="guide-map-drawing" src="${escapeHtml(landingMedia.cityMap)}" width="${width * 16}" height="${height * 16}" alt="">
            ${districtLabelSpots(cityGeometry).map(({ label, sign, x, y }) => `<span class="map-district${sign ? ' is-sign' : ''}" style="left:${x}%;top:${y}%">${label}</span>`).join('')}
            ${landmarks.map((place, index) => {
              const { x, y, side } = markerPosition(placeWorld(place, cityGeometry.markersById), cityGeometry.world);
              const kind = isGym(place) ? 'is-gym' : 'is-landmark';
              // This map's two-line labels can need a different side from the website's one-line ones.
              const labelSide = place.guideLabelSide ?? place.landingLabelSide ?? side;
              return `<button class="landmark-marker ${kind} label-${labelSide}" data-landmark="${escapeHtml(place.id)}" style="--map-x:${x}%;--map-y:${y}%" aria-label="${index + 1}. ${escapeHtml(place.nameEn)} · ${escapeHtml(place.nameZh)}" aria-pressed="false" aria-controls="landmark-detail"><span class="marker-number">${String(index + 1).padStart(2, '0')}</span><span class="marker-label"><b lang="zh-Hant">${escapeHtml(place.shortNameZh)}</b><span lang="en">${escapeHtml(place.shortNameEn)}</span></span></button>`;
            }).join('')}
          </div>
          <div class="map-legend"><span><i class="legend-gym"></i><span data-i18n="Gym">Gym</span></span><span><i class="legend-landmark"></i><span data-i18n="Landmark">Landmark</span></span><span><i class="legend-selected"></i><span data-i18n="Selected">Selected</span></span></div>
          <p class="map-caveat" data-i18n="Drawn from the game’s own map, so the streets are the ones you walk. Only gyms have battles and badges.">Drawn from the game’s own map, so the streets are the ones you walk. Only gyms have battles and badges.</p>
          <div class="landmark-tabs" aria-label="Choose a landmark">${landmarks.map((place, index) => `<button class="${isGym(place) ? 'is-gym' : 'is-landmark'}" data-guide-select="${escapeHtml(place.id)}" aria-pressed="false" aria-controls="landmark-detail"><span class="landmark-tab-number">${String(index + 1).padStart(2, '0')}</span><span class="landmark-tab-names"><b lang="en">${escapeHtml(place.shortNameEn)}</b><span lang="zh-Hant">${escapeHtml(place.shortNameZh)}</span></span></button>`).join('')}</div>
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
    const info = localizedPlace(place, getLocale());
    dialog.querySelector('#landmark-detail')!.classList.toggle('is-visit', !isGym(place));
    const gym = isGym(place);
    const outdoor = place.kind === 'sight';
    const areaLabel = !place.playable ? 'PLANNED AREA · NOT PLAYABLE' : place.phase === 'arrival' ? 'ARRIVAL AREA · EXPLORABLE' : 'EXPLORABLE GAME AREA';
    const areaNote = !place.playable ? 'This landmark is in the city plan; its game area is not playable in this build.' : outdoor ? 'Walk to it on the city streets and read its sign.' : 'Explore this landmark’s district and visitor hall.';
    const gymNote = outdoor ? 'This landmark has no gym battle or badge.' : !gym ? 'Visit the hall and meet its host. This stop has no gym battle or badge.' : place.gymStatus === 'playable' ? 'A gym battle is playable here. Speak to the leader and win to earn a badge.' : place.gymStatus === 'pending-verification' ? 'This gym challenge is being verified. The district and visitor hall are explorable.' : 'This landmark’s fictional gym challenge is still in development.';
    const artLabel = chinese ? `${place.nameZh}原創插圖` : `Original illustration of ${place.nameEn}`;
    const mapView = !gym && landmarkArt[place.id]?.mapView ? landmarkArt[place.id].facade : undefined;
    const art = gym ? `<div class="landmark-art">${landmarkSketch(place.id, artLabel)}<span>${t('ORIGINAL FIELD SKETCH')}</span></div>`
      : mapView ? `<div class="landmark-art is-map-view"><img src="${escapeHtml(mapView)}" alt="${escapeHtml(chinese ? `遊戲地圖上的${place.nameZh}` : `${place.nameEn} on the game map`)}"><span>${t('ON THE GAME MAP')}</span></div>` : '';
    dialog.querySelector('#landmark-detail')!.innerHTML = `
      ${art}
      <div class="landmark-copy"><p class="landmark-category">${escapeHtml(chinese ? place.categoryZh : place.category)} <span>· ${escapeHtml(chinese ? place.districtZh : place.districtEn)}</span></p><h3>${escapeHtml(chinese ? place.nameZh : place.nameEn)}<span lang="${chinese ? 'en' : 'zh-Hant'}">${escapeHtml(chinese ? place.nameEn : place.nameZh)}</span></h3><p class="visitor-description">${escapeHtml(chinese ? place.descriptionZh : place.description)}</p>${place.location ? `<div class="visitor-address"><span>${t('Real-world address')}</span><address>${escapeHtml(chinese ? place.location.addressZh : place.location.address)}</address></div>` : ''}${info.url ? `<a class="official-link" href="${escapeHtml(info.url)}" target="_blank" rel="noopener noreferrer">${t('Official visitor information')} <span aria-hidden="true">↗</span></a>` : ''}${info.url && place.officialSourceTitle ? `<p class="visitor-source">${t('Source')}: ${escapeHtml(place.officialSourceTitle)}</p>` : ''}</div>
      <div class="landmark-game-note"><span class="area-status ${place.playable ? 'area-playable' : 'area-planned'}">${t(areaLabel)}</span><p>${t(areaNote)}</p><div class="gym-note"><span>${t(gym ? 'FICTIONAL GYM CHALLENGE' : 'LANDMARK')}</span><p>${t(gymNote)}</p></div></div>`;
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
  dialog.querySelector('#guide-place-count')!.textContent = cityPlaceSummary(landmarks, getLocale());
  if (selected) select(selected);
  initializeLocalization(dialog);
  onLocaleChange(() => {
    localizeTree(dialog);
    dialog.querySelector('#guide-place-count')!.textContent = cityPlaceSummary(landmarks, getLocale());
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
