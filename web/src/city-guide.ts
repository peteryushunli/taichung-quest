import { observeNeighborhoodLayout } from './neighborhood-layout';
import { encounterProgress, encounterOutcome, ENCOUNTER_LABELS } from './encounter-progress';
import type { EncounterProgress } from './encounter-progress';
import type { EncounterBridgeState } from './encounter-bridge';
import landmarkCatalog from './data/landmarks.json';
import { BOULEVARD_PREVIEW, cityGeometry, sightCatalog } from './preview-world';
import { landingMedia, landmarkArt } from './landing-assets';
import { districtLabelSpots, isGym, localizedPlace, markerPosition, orderPlaces, placeWorld } from './landing-model';
import type { LandingLandmark } from './landing-model';
import './city-guide.css';
import { getLocale, initializeLocalization, localizeTree, onLocaleChange, t } from './i18n';
import { landmarkSketch } from './landmark-art';
import { landmarkCaptureCopy } from './capture-copy';

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
      <p class="guide-intro" id="city-guide-intro"><span data-i18n="Explore Taichung’s real neighborhoods and landmarks.">Explore Taichung’s real neighborhoods and landmarks.</span> <span data-i18n="Choose a landmark to explore its game-world stop and find visitor information where available.">Choose a landmark to explore its game-world stop and find visitor information where available.</span></p>
      <div class="guide-body">
        <section class="guide-overview" aria-label="Taichung city map" data-i18n-label="Taichung city map">
          <div class="overview-heading"><span>TAICHUNG <span lang="zh-Hant">臺中</span></span>${cityGeometry.coordinateSystem?.northUp === false ? '' : '<span class="compass" aria-label="North points up">N ↑</span>'}</div>
          <div class="guide-map" style="--guide-map-aspect:${width} / ${height}">
            <img class="guide-map-drawing" src="${escapeHtml(landingMedia.cityMap)}" width="${width * 16}" height="${height * 16}" alt="" loading="lazy" decoding="async">
            ${districtLabelSpots(cityGeometry).map(({ label, name, sign, x, y }) => `<span class="map-district${name ? ' is-neighborhood' : sign ? ' is-sign' : ''}" ${name ? `data-neighborhood="${escapeHtml(name.en)}" data-anchor-x="${x}" data-anchor-y="${y}"` : ''} style="left:${x}%;top:${y}%">${name ? `<span lang="en">${escapeHtml(name.en)}</span><span lang="zh-Hant">${escapeHtml(name.zh)}</span>` : label}</span>`).join('')}
            ${landmarks.map((place, index) => {
              const { x, y, side } = markerPosition(placeWorld(place, cityGeometry.markersById), cityGeometry.world);
              const kind = isGym(place) ? 'is-gym' : 'is-landmark';
              // This map's two-line labels can need a different side from the website's one-line ones.
              const labelSide = place.guideLabelSide ?? place.landingLabelSide ?? side;
              return `<button class="landmark-marker ${kind} label-${labelSide}" data-landmark="${escapeHtml(place.id)}" style="--map-x:${x}%;--map-y:${y}%" aria-label="${index + 1}. ${escapeHtml(place.nameEn)} · ${escapeHtml(place.nameZh)}" aria-pressed="false" aria-controls="landmark-detail"><span class="marker-number">${String(index + 1).padStart(2, '0')}</span><span class="marker-label"><b lang="zh-Hant">${escapeHtml(place.shortNameZh)}</b><span lang="en">${escapeHtml(place.shortNameEn)}</span></span></button>`;
            }).join('')}
          </div>
          <div class="map-legend"><span><i class="legend-gym"></i><span data-i18n="Gym">Gym</span></span><span><i class="legend-landmark"></i><span data-i18n="Landmark">Landmark</span></span><span><i class="legend-selected"></i><span data-i18n="Selected">Selected</span></span><span><i class="guide-encounter-mark legend-caught">✓</i><span data-i18n="Caught">Caught</span></span><span><i class="guide-encounter-mark legend-spent">×</i><span data-i18n="Try used">Try used</span></span></div>
          <p class="map-caveat" data-i18n="Drawn from the game’s own map, so the streets are the ones you walk. Gyms award badges; selected landmarks offer rare Pokémon captures.">Drawn from the game’s own map, so the streets are the ones you walk. Gyms award badges; selected landmarks offer rare Pokémon captures.</p>
          <div class="landmark-tabs" aria-label="Choose a landmark">${landmarks.map((place, index) => `<button class="${isGym(place) ? 'is-gym' : 'is-landmark'}" data-guide-select="${escapeHtml(place.id)}" aria-pressed="false" aria-controls="landmark-detail"><span class="landmark-tab-number">${String(index + 1).padStart(2, '0')}</span><span class="landmark-tab-names"><b lang="en">${escapeHtml(place.shortNameEn)}</b><span lang="zh-Hant">${escapeHtml(place.shortNameZh)}</span></span></button>`).join('')}</div>
        </section>
        <section class="landmark-detail" id="landmark-detail" aria-label="Selected landmark information" aria-live="polite"></section>
      </div>
      <footer class="guide-footer"><p><span data-i18n="Real places. A fictional adventure.">Real places. A fictional adventure.</span><br><span data-i18n="Visitor information is available from the start.">Visitor information is available from the start.</span></p><button class="guide-return"><span data-i18n="Back to adventure">Back to adventure</span><span aria-hidden="true">↗</span></button></footer>
    </div>`;
  document.body.append(dialog);

  const layoutLabels = observeNeighborhoodLayout(dialog.querySelector('.guide-map')!, '.is-neighborhood', '.marker-number, .guide-encounter-mark');
  let selected = landmarks.find((place) => place.playable)?.id ?? landmarks[0]?.id;
  let encounters: EncounterProgress | undefined;
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
    const outdoor = place.kind === 'sight' || place.id === 'maple-garden';
    const areaLabel = !place.playable ? 'PLANNED AREA · NOT PLAYABLE' : place.phase === 'arrival' ? 'ARRIVAL AREA · EXPLORABLE' : 'EXPLORABLE GAME AREA';
    const areaNote = !place.playable ? 'This landmark is in the city plan; its game area is not playable in this build.' : outdoor ? 'Walk to it on the city streets and read its sign.' : 'Explore this landmark’s district and visitor hall.';
    const hasEncounter = BOULEVARD_PREVIEW ? cityGeometry.markersById[place.id]?.captureBit !== undefined : undefined;
    const gymNote = landmarkCaptureCopy(place.id, 'guide', hasEncounter) ?? (!gym ? 'Visit this landmark and learn its local history.' : place.gymStatus === 'playable' ? 'A gym battle is playable here. Speak to the leader and win to earn a badge.' : place.gymStatus === 'pending-verification' ? 'This gym challenge is being verified. The district and visitor hall are explorable.' : 'This landmark’s fictional gym challenge is still in development.');
    const artLabel = chinese ? `${place.nameZh}原創插圖` : `Original illustration of ${place.nameEn}`;
    const facade = landmarkArt[place.id]?.facade;
    const art = facade ? `<div class="landmark-art is-facade"><img src="${escapeHtml(facade)}" alt="${escapeHtml(info.name)}" loading="lazy" decoding="async"></div>`
      : gym ? `<div class="landmark-art">${landmarkSketch(place.id, artLabel)}<span>${t('ORIGINAL FIELD SKETCH')}</span></div>` : '';
    dialog.querySelector('#landmark-detail')!.innerHTML = `
      ${art}
      <div class="landmark-copy"><p class="landmark-category">${escapeHtml(chinese ? place.categoryZh : place.category)} <span>· ${escapeHtml(chinese ? place.districtZh : place.districtEn)}</span></p><h3>${escapeHtml(chinese ? place.nameZh : place.nameEn)}<span lang="${chinese ? 'en' : 'zh-Hant'}">${escapeHtml(chinese ? place.nameEn : place.nameZh)}</span></h3><p class="visitor-description">${escapeHtml(chinese ? place.descriptionZh : place.description)}</p>${place.location ? `<div class="visitor-address"><span>${t('Real-world address')}</span><address>${escapeHtml(chinese ? place.location.addressZh : place.location.address)}</address></div>` : ''}${info.url ? `<div class="visitor-link"><a class="official-link" href="${escapeHtml(info.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(info.visitLabel)} <span aria-hidden="true">↗</span></a></div>` : ''}</div>
      <div class="landmark-game-note"><span class="area-status ${place.playable ? 'area-playable' : 'area-planned'}">${t(areaLabel)}</span><p>${t(areaNote)}</p><div class="gym-note"><span>${t(gym ? 'FICTIONAL GYM CHALLENGE' : 'LANDMARK')}</span><p>${t(gymNote)}</p><p class="guide-encounter-status" hidden></p></div></div>`;
    renderEncounterStatus();
    layoutLabels();
    if (reveal && matchMedia('(max-width: 670px)').matches) dialog.querySelector('#landmark-detail')!.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  function renderEncounterStatus() {
    dialog.querySelectorAll<HTMLButtonElement>('[data-landmark], [data-guide-select]').forEach((button) => {
      const id = (button.dataset.landmark ?? button.dataset.guideSelect)!;
      const bit = cityGeometry.markersById[id]?.captureBit;
      const outcome = encounterOutcome(bit, encounters);
      button.dataset.encounter = outcome;
      const place = landmarks.find((entry) => entry.id === id)!;
      const label = `${place.nameEn} · ${place.nameZh}`;
      button.setAttribute('aria-label', bit === undefined ? label : `${label} · ${t(ENCOUNTER_LABELS[outcome])}`);
      let mark = button.querySelector<HTMLElement>('.guide-encounter-mark');
      if (bit !== undefined && !mark) {
        mark = document.createElement('span'); mark.className = 'guide-encounter-mark'; mark.setAttribute('aria-hidden', 'true'); button.append(mark);
      }
      if (mark) { mark.textContent = outcome === 'caught' ? '✓' : outcome === 'spent' ? '×' : outcome === 'pending' ? '…' : '●'; mark.title = t(ENCOUNTER_LABELS[outcome]); }
    });
    const detail = dialog.querySelector<HTMLElement>('.guide-encounter-status');
    if (detail) {
      const bit = selected ? cityGeometry.markersById[selected]?.captureBit : undefined;
      const outcome = encounterOutcome(bit, encounters);
      detail.hidden = bit === undefined;
      detail.dataset.encounter = outcome;
      detail.textContent = t(ENCOUNTER_LABELS[outcome]);
    }
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
    updateEncounter(next: EncounterBridgeState) { const value = encounterProgress(next, encounters); if (value === encounters) return; encounters = value; renderEncounterStatus(); },
    get isOpen() { return dialog.open; },
    open(trigger?: HTMLElement) {
      if (dialog.open) return;
      returnFocus = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      const state = host.getState();
      resumeOnClose = state.running && !state.paused;
      host.releaseInputs();
      if (resumeOnClose) host.pause();
      renderEncounterStatus();
      dialog.showModal();
      layoutLabels();
      dialog.querySelector<HTMLButtonElement>('.guide-close')!.focus();
    },
    onGameStarted() {
      if (dialog.open) { resumeOnClose = true; host.pause(); }
    },
  };
}
