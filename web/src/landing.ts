import { createMapLayers, MAP_LAYERS, DEFAULT_MAP_LAYERS, mapLayerLabel, namedStreetLabels } from './map-layers';
import { observeNeighborhoodLayout } from './neighborhood-layout';
import landmarkCatalog from './data/landmarks.json';
import { BOULEVARD_PREVIEW, cityGeometry as city, sightCatalog } from './preview-world';
import './landing.css';
import { escapeHtml } from './city-guide';
import { getLocale, onLocaleChange, setLocale, t } from './i18n';
import type { Locale } from './i18n';
import { badgeArt, landingMedia, landmarkArt } from './landing-assets';
import { landmarkCaptureCopy } from './capture-copy';
import type { PokemonIcon } from './landing-assets';
import { pixelFlag } from './landing-flag';
import { districtLabelSpots, isGym, isGymOpen, localizedPlace, markerPosition, orderPlaces, placeStatus, placeWorld } from './landing-model';
import type { LandingLandmark } from './landing-model';
import type { MapView } from './map-fold';

interface LandingHost {
  startNewGame(): void;
  continueGame(): void;
  getState(): { running: boolean; starting: boolean; immersive: boolean; hasSave: boolean };
}

// Every pin on the page: the ten gyms, then the landmarks without one (temple halls and outdoor set pieces).
const landmarks = orderPlaces([...landmarkCatalog, ...sightCatalog] as LandingLandmark[]);
const gyms = landmarks.filter(isGym);
const sights = landmarks.filter((place) => !isGym(place));
const DEFAULT_LANDMARK = 'old-taichung-station';
// The Boulevard map folds between two views around Taiwan Blvd; this is the boulevard's centre row, in tiles.
const taiwanBoulevard = city.world.streetBands?.find((band) => band.name.en === 'Taiwan Boulevard')?.bounds;
const BOULEVARD_ROW = taiwanBoulevard ? (taiwanBoulevard[1] + taiwanBoulevard[3]) / 2 : city.world.height / 2;
// The page's words sell the city; they do not explain how the map was made.
const LEAD_HEADING = 'Explore Taichung, street by street.';
const LEAD_TEXT = 'Taiwan Boulevard runs through the heart of this map, just as it runs through the heart of the city. The night market, the temples and the old station were all built out from it by hand. Flip the map to see the real Taichung underneath.';
const REAL_MAP_CAPTION = 'The real city. Everything inside the bright ground is yours to explore.';
const GAME_MAP_CAPTION = 'The same streets, ready to ride.';
const HOW_HEADING = 'Plays like the Pokémon you remember.';
const HOW_TEXT = "Pick a partner, take on gym leaders, fill your badge case. The only thing that's new is the city.";
const GITHUB_URL = 'https://github.com/peteryushunli/taichung-quest';
const starters = [
  { key: 'charmander', name: 'Charmander', dex: '004', type: 'Fire', tint: '#f3d9cc', ink: '#8a3a22' },
  { key: 'bulbasaur', name: 'Bulbasaur', dex: '001', type: 'Grass', tint: '#dbe5c4', ink: '#3d5b2e' },
  { key: 'squirtle', name: 'Squirtle', dex: '007', type: 'Water', tint: '#d3e3e5', ink: '#2f5a66' },
  { key: 'pikachu', name: 'Pikachu', dex: '025', type: 'Electric', tint: '#f3e6bc', ink: '#6e5420' },
] as const;

const copy = (text: string) => `<span data-i18n="${escapeHtml(text)}">${escapeHtml(t(text))}</span>`;
const number = (index: number) => String(index + 1).padStart(2, '0');
const placeholder = (label: string, extra = '') => `<div class="lp-slot ${extra}">${copy(label)}</div>`;
const pixelImage = (url: string, alt = '') => `<img class="lp-px" src="${escapeHtml(url)}" alt="${escapeHtml(t(alt))}"${alt ? ` data-i18n-alt="${escapeHtml(alt)}"` : ''} loading="lazy">`;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// Party-menu icons flip between their two frames; `index` staggers a row of them.
const monIcon = (mon: PokemonIcon, index: number, labelled = true) => `<span class="lp-mon" ${labelled ? `role="img" aria-label="${escapeHtml(t(mon.name))}" data-i18n-label="${escapeHtml(mon.name)}"` : 'aria-hidden="true"'} style="--i:${index};background-image:url('${escapeHtml(mon.icon)}')"></span>`;

function cityMap() {
  const { width, height } = city.world;
  const labels = districtLabelSpots(city).map(({ label, name, sign, x, y }) =>
    `<span class="lp-district-name${name ? ' is-neighborhood' : sign ? ' lp-district-sign' : ''}" ${name ? `data-neighborhood="${escapeHtml(name.en)}" data-anchor-x="${x}" data-anchor-y="${y}"` : ''} style="left:${x}%;top:${y}%">${name ? `<span lang="en">${escapeHtml(name.en)}</span><span lang="zh-Hant">${escapeHtml(name.zh)}</span>` : label}</span>`).join('');
  // The map leads the page now, so its picture loads at once.
  const art = `<img class="lp-map-art" src="${escapeHtml(landingMedia.cityMap)}" width="${width * 16}" height="${height * 16}" alt="" decoding="async">`;
  const layers = `<div id="lp-districts-layer" data-map-layer="districts" hidden>${labels}</div><div id="lp-streets-layer" data-map-layer="streets" hidden></div>`;
  if (!BOULEVARD_PREVIEW) return `${art}${layers}<span class="lp-map-chip">${copy('IN-GAME MAP')}</span>`;
  // The Boulevard map has a second view, real Taichung, which folds into this one around Taiwan Blvd (real-map.ts).
  // The gold line traces the boulevard in both; its name tag sits on the one point that never moves.
  const lineHeight = 1000 * height / width;
  const lineY = (lineHeight * BOULEVARD_ROW / height).toFixed(1);
  return `${art}<img class="lp-map-real-art" id="lp-map-real-art" alt="" hidden><canvas class="lp-map-fold" id="lp-map-fold" hidden></canvas>
    <svg class="lp-map-boulevard-line" viewBox="0 0 1000 ${lineHeight.toFixed(3)}" preserveAspectRatio="none" aria-hidden="true"><polyline class="lp-boulevard-casing" points="0,${lineY} 1000,${lineY}"/><polyline class="lp-boulevard-gold" points="0,${lineY} 1000,${lineY}"/></svg>
    ${layers}
    <div class="lp-map-anchor" style="top:${BOULEVARD_ROW / height * 100}%" aria-hidden="true"><i></i><span>${copy('Taiwan Blvd')}</span></div>
    <div class="lp-map-real-only" aria-hidden="true"><span class="lp-map-north"><svg viewBox="-12 -12 24 24" width="26" height="26"><g transform="rotate(-34.4)"><path d="M0 -10L4.2 3.5L0 1.2L-4.2 3.5Z"/><text y="10.6" text-anchor="middle">N</text></g></svg></span><span class="lp-map-scale"><b id="lp-map-scale-bar"></b><span>2 km</span></span></div>`;
}

function mapSwitch() {
  const tab = (view: MapView, label: string) => `<button type="button" data-map-view="${view}" aria-pressed="${view === 'game'}">${copy(label)}</button>`;
  return `<div class="lp-map-tabs" role="group" aria-label="${escapeHtml(t('Which map to show'))}" data-i18n-label="Which map to show">${tab('real', 'Real Taichung')}${tab('game', 'In the game')}</div>`;
}

function renderStreets() {
  const { width, height, streetBands = [] } = city.world;
  const language = getLocale() === 'zh-Hant' ? 'zh' : 'en';
  const lines = streetBands.map(({ name, bounds: [left, top, right, bottom], axis }) => {
    const [x1, y1, x2, y2] = axis === 'h' ? [left, (top + bottom) / 2, right, (top + bottom) / 2] : [(left + right) / 2, top, (left + right) / 2, bottom];
    return `<path d="M${x1},${y1}L${x2},${y2}"><title>${escapeHtml(name[language])}</title></path>`;
  }).join('');
  const names = namedStreetLabels(city);
  return `<svg class="lp-street-lines" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(t('Named streets'))}"><desc>${escapeHtml(names.map(street => street.name[language]).join(', '))}</desc>${lines}</svg>`
    + names.map(({ name, bounds: [left, top, right, bottom], axis }) => `<span class="lp-street-label" data-axis="${axis}" data-bounds="${[left / width * 100, top / height * 100, right / width * 100, bottom / height * 100]}">${escapeHtml(name[language])}</span>`).join('');
}

// Step 3’s City Pass uses the same stable badge IDs and original-detail masters.
function renderPass() {
  const chinese = getLocale() === 'zh-Hant';
  return gyms.map((place, index) => {
    const badge = (chinese ? place.badgeNameZh : place.badgeNameEn) ?? '';
    const label = `${number(index)} · ${badge} · ${chinese ? place.shortNameZh : place.shortNameEn}`;
    const art = badgeArt[place.id] ? `<img src="${escapeHtml(badgeArt[place.id])}" alt="" width="256" height="256">` : '';
    return `<div class="lp-stamp ${isGymOpen(place) ? 'is-earned' : ''}" role="img" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${art}<span>${number(index)}</span></div>`;
  }).join('');
}

function sectionHead(eyebrow: string, title: string, side?: string, titleId?: string) {
  return `<div class="lp-section-head"><div class="lp-section-title"><p class="lp-eyebrow">${copy(eyebrow)}</p><h2 class="lp-h2 lp-display"${titleId ? ` id="${titleId}"` : ''}>${copy(title)}</h2></div>${side ? `<p class="lp-section-side">${copy(side)}</p>` : ''}</div>`;
}

function heroScreen() {
  if (!landingMedia.heroReel) return placeholder('Gameplay reel', 'lp-slot-fill');
  const poster = landingMedia.heroPoster ? ` poster="${escapeHtml(landingMedia.heroPoster)}"` : '';
  return `<video id="lp-reel" class="lp-px" src="${escapeHtml(landingMedia.heroReel)}"${poster} autoplay muted loop playsinline preload="metadata" aria-label="${escapeHtml(t('Gameplay reel'))}" data-i18n-label="Gameplay reel"></video>`;
}

function markup() {
  return `
  <div class="landing">
    <header class="lp-header"><div class="lp-header-inner">
      <a class="lp-brand" href="#top" aria-label="Taichung Quest">${pixelFlag}<span class="lp-wordmark" lang="en" aria-hidden="true"><span>Taichung</span> <span class="lp-wordmark-quest">Quest</span></span><span class="lp-brand-party" aria-hidden="true">${landingMedia.starterIcons.map((mon, index) => monIcon(mon, index, false)).join('')}</span></a>
      <nav class="lp-nav" aria-label="Page sections">
        <a class="lp-nav-link" href="#map">${copy('Map')}</a>
        <a class="lp-nav-link" href="#gyms">${copy('Landmarks')}</a>
        <a class="lp-nav-link" href="#how">${copy('How it plays')}</a>
        <div class="lp-lang" role="group" aria-label="Language · 語言"><button type="button" data-locale-toggle="en" lang="en">EN</button><button type="button" data-locale-toggle="zh-Hant" lang="zh-Hant">中文</button></div>
        <a class="lp-btn lp-btn-small" href="#play" data-play-link><span aria-hidden="true">▶</span> <span data-play-label="Play">${escapeHtml(t('Play'))}</span></a>
      </nav>
    </div></header>
    <main>
      <span id="top"></span>
      <!-- The map leads the page: the city first, with the way into the game beside it. -->
      <section class="lp-map-section lp-lead" id="map"><div class="lp-wrap">
        <div class="lp-lead-head">
          <div class="lp-lead-title">
            <p class="lp-eyebrow lp-eyebrow-dot">${copy('A POKÉMON FIRERED ADVENTURE · 臺中')}</p>
            <h1 class="lp-h1 lp-display" id="lp-map-heading">${copy(LEAD_HEADING)}</h1>
          </div>
          <div class="lp-lead-side">
            <p class="lp-lede">${copy(LEAD_TEXT)}</p>
            <div class="lp-actions"><a class="lp-btn lp-btn-light" id="hero-play" href="#play" data-play-link><span aria-hidden="true">▶</span> <span data-play-label="Play in your browser">${escapeHtml(t('Play in your browser'))}</span></a><a class="lp-text-link" href="#how">${copy('See how it plays ↓')}</a></div>
          </div>
        </div>
        <div class="lp-map-body" id="lp-map-stage">
          <div class="lp-map-col">
          <div class="lp-map-bar">
            ${BOULEVARD_PREVIEW ? mapSwitch() : ''}
            <fieldset class="lp-map-controls" id="lp-map-controls"><legend class="visually-hidden">${copy('Map layers')}</legend>${MAP_LAYERS.map(layer => `<label><input type="checkbox" data-map-toggle="${layer}" aria-controls="lp-${layer}-layer"${DEFAULT_MAP_LAYERS[layer] ? ' checked' : ''}><span data-map-layer-label="${layer}">${mapLayerLabel(layer, getLocale())}</span></label>`).join('')}</fieldset>
          </div>
          <div class="lp-map${BOULEVARD_PREVIEW ? ' lp-map-boulevard' : ''}" id="lp-map" style="aspect-ratio:${city.world.width} / ${city.world.height};background-size:${800 / city.world.width}% ${800 / city.world.height}%" role="group" aria-label="${escapeHtml(t('Choose a landmark'))}" data-i18n-label="Choose a landmark">
            ${cityMap()}
            <div id="lp-markers"></div>
            <div class="lp-map-legend"><span data-map-legend="gyms"><i class="lp-swatch-open"></i>${copy('Gym')}</span><span data-map-legend="landmarks"><i class="lp-swatch-landmark"></i>${copy('Landmark')}</span>${gyms.some((place) => !isGymOpen(place)) ? `<span data-map-legend="gyms"><i class="lp-swatch-planned"></i>${copy('In development')}</span>` : ''}${BOULEVARD_PREVIEW ? `<span><i class="lp-swatch-boulevard"></i>${copy('Taiwan Blvd')}</span><span class="lp-legend-real-only"><i class="lp-swatch-covered"></i>${copy('In the game')}</span>` : ''}</div>
          </div>
          ${BOULEVARD_PREVIEW ? `<div class="lp-map-foot"><p><span data-map-caption="real" hidden>${copy(REAL_MAP_CAPTION)}</span><span data-map-caption="game">${copy(GAME_MAP_CAPTION)}</span></p><small>${copy('Real map © OpenStreetMap contributors')}</small></div>` : ''}
          </div>
          <aside class="lp-detail" id="lp-detail" aria-live="polite"></aside>
        </div>
      </div></section>

      <section class="lp-wrap" id="gyms">
        ${sectionHead('01 — THE LANDMARKS', 'Ten landmark gyms. Rare Pokémon across the city.', 'Each place is redrawn tile by tile. Gym leaders are fictional; the buildings are real.')}
        <div class="lp-gallery" id="lp-gallery"></div>
      </section>

      <section class="lp-how" id="how"><div class="lp-wrap">
        <div class="lp-how-lead">
          <div class="lp-how-copy">
            <p class="lp-eyebrow">${copy('02 — HOW IT PLAYS')}</p>
            <h2 class="lp-h2 lp-display">${copy(HOW_HEADING)}</h2>
            <p class="lp-lede">${copy(HOW_TEXT)}</p>
          </div>
          <div class="lp-hero-frame">
            <div class="lp-casing">
              <div class="lp-casing-top"><span class="lp-power"><i></i>臺中 · TAICHUNG</span>${copy('OLD STATION PLAZA')}</div>
              <div class="lp-bezel"><div class="lp-screen">${heroScreen()}</div></div>
              <div class="lp-partner">${landingMedia.heroPartner ? pixelImage(landingMedia.heroPartner, 'Pikachu') : placeholder('Partner Pokémon sprite', 'lp-slot-fill')}</div>
            </div>
          </div>
        </div>
        <div class="lp-step-one">
          <div class="lp-step-one-copy">
            <span class="lp-step-label">${copy('STEP 1')}</span>
            <h3 class="lp-step-one-title lp-display">${copy('Pick your partner.')}</h3>
            <p>${copy('Wake up in a guest house near Old Taichung Station. Choose your first Pokémon, then meet your guide outside.')}</p>
          </div>
          <div class="lp-starters">${starters.map((starter) => `<div class="lp-starter">
            <div class="lp-starter-art" style="background:${starter.tint}">${landingMedia.starters[starter.key] ? pixelImage(landingMedia.starters[starter.key]!, starter.name) : placeholder(`${starter.name} sprite`, 'lp-slot-fill')}</div>
            <div class="lp-starter-body"><div class="lp-starter-meta"><span>No. ${starter.dex}</span><span class="lp-type" style="background:${starter.tint};color:${starter.ink}">${copy(starter.type)}</span></div><span class="lp-starter-name">${copy(starter.name)}</span></div>
          </div>`).join('')}</div>
          <div class="lp-team">
            <div class="lp-team-copy"><span>${copy('Then build a team of six.')}</span><p>${copy('Use TEAM to add or swap available Pokémon at Lv50. Rare landmark Pokémon unlock after you catch them.')}</p></div>
            <div class="lp-party">${[0, 1, 2, 3, 4, 5].map((slot) => landingMedia.party[slot] ? `<div class="lp-party-slot">${monIcon(landingMedia.party[slot]!, slot)}</div>` : `<div class="lp-party-slot lp-party-empty">${slot + 1}</div>`).join('')}</div>
          </div>
        </div>
        <div class="lp-steps">
          <div class="lp-step">
            <div class="lp-shot">${landingMedia.bikeShot ? `<img class="lp-px" src="${escapeHtml(landingMedia.bikeShot)}" alt="${escapeHtml(t('Biking down the Greenway'))}" data-i18n-alt="Biking down the Greenway" loading="lazy">` : placeholder('Biking down the Greenway', 'lp-slot-fill')}</div>
            <span class="lp-step-label">${copy('STEP 2')}</span>
            <h3>${copy('Ride across town')}</h3>
            <p>${copy('The bike is yours from the start — tap B. On the first screen, pick your language and set wild Pokémon encounters and trainer encounters to Off, Low or Normal.')}</p>
          </div>
          <div class="lp-step">
            <div class="lp-pass" id="lp-pass">${renderPass()}</div>
            <span class="lp-step-label">${copy('STEP 3')}</span>
            <h3>${copy('Fill your City Pass')}</h3>
            <p>${copy("Beat a landmark's leader to earn its stamp. Lose, and you're healed back at the plaza for another try.")}</p>
          </div>
        </div>
      </div></section>

      <section class="lp-cta" id="play"><div class="lp-wrap lp-cta-inner">
        <div class="lp-cta-copy">
          <h2 class="lp-cta-title lp-display">${copy('Taichung is waiting.')}</h2>
          <p class="lp-cta-text">${copy('Runs in any modern browser with keyboard or touch. Saves stay on your device — export a backup anytime.')}</p>
          <div class="lp-actions">
            <button type="button" class="lp-btn" id="lp-new-game"><span aria-hidden="true">▶</span> ${copy('Start a new game')}</button>
            <button type="button" class="lp-btn-outline" id="lp-continue">${t('Continue saved game')}</button>
          </div>
          <p class="lp-play-status" id="feedback" role="status" aria-live="polite"></p>
        </div>
        <div class="lp-cta-art"><img class="lp-px" src="${escapeHtml(landmarkArt[DEFAULT_LANDMARK].facade!)}" alt="${escapeHtml(t('Old Taichung Station, pixel facade'))}" data-i18n-alt="Old Taichung Station, pixel facade"></div>
      </div></section>
    </main>
    <footer class="lp-footer">
      <span class="lp-footer-note">${copy('Fan-made and non-commercial. Not affiliated with Nintendo, Game Freak or The Pokémon Company. Pokémon © its respective owners. Landmark info via Wikipedia and the Taichung Tourism and Travel Bureau.')}</span>
      <div class="lp-footer-links"><a href="${GITHUB_URL}" target="_blank" rel="noopener">GitHub</a><a href="/licenses/index.html" target="_blank" rel="noopener">${copy('Licenses')}</a></div>
    </footer>
  </div>`;
}

function renderMarkers(selected: string) {
  const locale = getLocale();
  const pins = landmarks.map((place, index) => {
    const { x, y, side } = markerPosition(placeWorld(place, city.markersById), city.world);
    const { name, mapLabel } = localizedPlace(place, locale);
    const state = `${!isGym(place) ? 'is-landmark' : isGymOpen(place) ? 'is-open' : 'is-planned'}${place.id === selected ? ' is-selected' : ''}`;
    return { layer: isGym(place) ? 'gyms' : 'landmarks', html: `<div class="lp-pin ${state} lp-side-${place.landingLabelSide ?? side}" data-pin="${escapeHtml(place.id)}" data-x="${x}" data-y="${y}" style="left:${x}%;top:${y}%">
      <button type="button" class="lp-marker" data-select="${escapeHtml(place.id)}" aria-label="${escapeHtml(`${name} · ${t(placeStatus(place))}`)}" aria-pressed="${place.id === selected}">${number(index)}</button>
      <span class="lp-pin-label" data-select="${escapeHtml(place.id)}" aria-hidden="true">${escapeHtml(mapLabel)}</span>
    </div>` };
  });
  return (['gyms', 'landmarks'] as const).map(layer => `<div id="lp-${layer}-layer" data-map-layer="${layer}">${pins.filter(pin => pin.layer === layer).map(pin => pin.html).join('')}</div>`).join('');
}

function renderDetail(id: string) {
  const index = landmarks.findIndex((place) => place.id === id);
  const place = landmarks[index];
  const info = localizedPlace(place, getLocale());
  const captureBit = city.markersById[id]?.captureBit;
  const hasEncounter = BOULEVARD_PREVIEW ? captureBit !== undefined : undefined;
  const art = landmarkArt[id];
  const facade = art?.facade
    ? `<img class="lp-facade" src="${escapeHtml(art.facade)}" alt="${escapeHtml(info.name)}" loading="lazy" decoding="async">`
    : `<div class="lp-facade-pending">${copy('Facade art pending')}</div>`;
  const portrait = art?.leader && info.leader
    ? `<img class="lp-portrait lp-portrait-art" src="${escapeHtml(art.leader)}" alt="" width="56" height="56" loading="lazy" decoding="async">`
    : '<div class="lp-portrait">?</div>';
  const team = info.leader ? art?.team : undefined;
  const teamSprites = team
    ? `<div class="lp-team-sprites" role="group" aria-label="${escapeHtml(t("Leader's team"))}">${team.map((mon, slot) => `<i>${monIcon(mon, slot)}</i>`).join('')}</div>`
    : '<div class="lp-team-sprites" aria-hidden="true"><i>?</i><i>?</i><i>?</i></div>';
  return `
    <div class="lp-detail-art">${facade}</div>
    <div class="lp-detail-body" role="region" aria-labelledby="lp-detail-name" tabindex="0">
      <div class="lp-detail-meta"><span>No. ${number(index)} · ${escapeHtml(info.district)}</span></div>
      <div class="lp-detail-names"><h3 class="lp-display" id="lp-detail-name">${escapeHtml(info.name)}</h3><span>${escapeHtml(info.otherName)}</span></div>
      <p class="lp-detail-text">${escapeHtml(info.description)}</p>
      <div class="lp-detail-foot">
        ${isGym(place) ? `<div class="lp-leader">${portrait}<div class="lp-leader-name"><small>${copy('Gym leader')}</small><b>${info.leader ? escapeHtml(info.leader) : copy('To be revealed')}</b></div>${teamSprites}</div>` : `<p class="lp-landmark-note">${copy(landmarkCaptureCopy(place.id, 'landing', hasEncounter, BOULEVARD_PREVIEW ? captureBit : undefined) ?? 'Visit this landmark and learn its local history.')}</p>`}
      </div>
      ${info.url ? `<div class="lp-visit-link"><a href="${escapeHtml(info.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(info.visitLabel)} <span aria-hidden="true">↗</span></a></div>` : ''}
    </div>`;
}

function renderCard(place: LandingLandmark, locale: ReturnType<typeof getLocale>) {
  const index = landmarks.indexOf(place);
  const info = localizedPlace(place, locale);
  const art = landmarkArt[place.id];
  return `<button type="button" class="lp-card${isGym(place) ? '' : ' is-landmark'}" data-card="${escapeHtml(place.id)}">
      <span class="lp-card-art" style="background:${art?.tint ?? '#eee8dc'}">${art?.facade ? `<img class="lp-card-facade" src="${escapeHtml(art.facade)}" alt="" loading="lazy" decoding="async">` : `<span class="lp-card-pending">${copy('facade art')}</span>`}</span>
      <span class="lp-card-body"><span class="lp-card-meta"><span>No. ${number(index)}</span></span><span class="lp-card-name">${escapeHtml(info.shortName)}</span><span class="lp-card-other">${escapeHtml(info.otherName)}</span></span>
    </button>`;
}

function renderGallery() {
  const locale = getLocale();
  const group = (title: string, note: string, places: LandingLandmark[]) => `<div class="lp-gallery-group">
      <div class="lp-gallery-head"><h3>${copy(title)} <span>${places.length}</span></h3><p>${copy(note)}</p></div>
      <div class="lp-gallery-grid">${places.map((place) => renderCard(place, locale)).join('')}</div>
    </div>`;
  return group('Gyms', 'Beat the leader inside to earn a City Pass stamp.', gyms)
    + group('Landmarks', 'Explore temples, markets and parks. Selected landmarks offer rare Pokémon captures that unlock new TEAM choices.', sights);
}

/** Renders into `root` and binds; call refresh() whenever host state changes. */
export function createLanding(root: HTMLElement, host: LandingHost) {
  let selected = DEFAULT_LANDMARK;
  root.innerHTML = markup();
  const markers = root.querySelector<HTMLElement>('#lp-markers')!;
  const detail = root.querySelector<HTMLElement>('#lp-detail')!;
  const gallery = root.querySelector<HTMLElement>('#lp-gallery')!;
  const newGame = root.querySelector<HTMLButtonElement>('#lp-new-game')!;
  const continueGame = root.querySelector<HTMLButtonElement>('#lp-continue')!;
  const reel = root.querySelector<HTMLVideoElement>('#lp-reel');

  const mapFrame = root.querySelector<HTMLElement>('#lp-map')!;
  const placeLabels = observeNeighborhoodLayout(mapFrame, '.is-neighborhood', '.lp-marker, .lp-pin-label, .lp-map-chip, .lp-map-legend, .lp-map-anchor > span');

  // Real Taichung behind the Boulevard map. Its picture and drawing code are fetched once the page has settled;
  // the two tabs then fold the frame from one map to the other.
  const mapTabs = [...root.querySelectorAll<HTMLButtonElement>('[data-map-view]')];
  let realMap: { choose(view: MapView): void; layout(): void; view(): MapView } | undefined;
  let realMapLoading = false;
  let wantedView: MapView | undefined;
  // Neighbourhood names are placed round the pins where the game map has them, so only while that map shows.
  const layoutLabels = () => { if (!realMap || realMap.view() === 'game') placeLabels(); };
  const layers = createMapLayers(mapFrame, root.querySelector('#lp-map-controls')!, layoutLabels);
  function showMapView(view: MapView, settled: boolean) {
    mapTabs.forEach((tab) => tab.setAttribute('aria-pressed', String(tab.dataset.mapView === view)));
    root.querySelectorAll<HTMLElement>('[data-map-caption]').forEach((caption) => { caption.hidden = caption.dataset.mapCaption !== view; });
    if (settled && view === 'game') layers.refresh();
  }
  function loadRealMap() {
    if (realMapLoading || !mapTabs.length) return;
    realMapLoading = true;
    void import('./real-map').then(({ createRealMap }) => {
      const created = createRealMap({
        map: mapFrame,
        canvas: root.querySelector<HTMLCanvasElement>('#lp-map-fold')!,
        gameArt: root.querySelector<HTMLImageElement>('.lp-map-art')!,
        realArt: root.querySelector<HTMLImageElement>('#lp-map-real-art')!,
        boulevard: [...root.querySelectorAll<SVGPolylineElement>('.lp-map-boulevard-line polyline')],
        scaleBar: root.querySelector<HTMLElement>('#lp-map-scale-bar')!,
        reducedMotion,
        onView: showMapView,
      });
      return created.ready.then(() => { realMap = created; if (wantedView) created.choose(wantedView); });
    }).catch(() => { realMapLoading = false; });
  }
  mapTabs.forEach((tab) => tab.addEventListener('click', () => {
    const view = tab.dataset.mapView as MapView;
    if (realMap) realMap.choose(view);
    else { wantedView = view; loadRealMap(); }
  }));
  // The map is the first thing on the page, so fetch its second view as soon as the browser is idle.
  if (mapTabs.length) {
    const whenIdle = (window as Window & { requestIdleCallback?: (run: () => void, options?: { timeout: number }) => number }).requestIdleCallback;
    if (whenIdle) whenIdle(loadRealMap, { timeout: 2500 });
    else window.setTimeout(loadRealMap, 600);
  }

  function renderLocalized() {
    markers.innerHTML = renderMarkers(selected);
    realMap?.layout();
    detail.innerHTML = renderDetail(selected);
    gallery.innerHTML = renderGallery();
    root.querySelector('#lp-streets-layer')!.innerHTML = renderStreets();
    root.querySelectorAll<HTMLElement>('[data-map-layer-label]').forEach(label => { label.textContent = mapLayerLabel(label.dataset.mapLayerLabel as typeof MAP_LAYERS[number], getLocale()); });
    layers.refresh();
    root.querySelector('#lp-pass')!.innerHTML = renderPass();
    root.querySelectorAll<HTMLImageElement>('[data-i18n-alt]').forEach((image) => { image.alt = t(image.dataset.i18nAlt!); });
    root.querySelectorAll<HTMLButtonElement>('[data-locale-toggle]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.localeToggle === getLocale())));
  }

  function select(id: string) {
    selected = id;
    markers.querySelectorAll<HTMLElement>('[data-pin]').forEach((pin) => {
      const active = pin.dataset.pin === id;
      pin.classList.toggle('is-selected', active);
      pin.querySelector('button')!.setAttribute('aria-pressed', String(active));
    });
    detail.innerHTML = renderDetail(id);
    layers.refresh();
  }

  markers.addEventListener('click', (event) => {
    const id = (event.target as HTMLElement).closest<HTMLElement>('[data-select]')?.dataset.select;
    if (id) select(id);
  });
  gallery.addEventListener('click', (event) => {
    const id = (event.target as HTMLElement).closest<HTMLElement>('[data-card]')?.dataset.card;
    if (!id) return;
    select(id);
    root.querySelector('#lp-map-stage')!.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
    markers.querySelector<HTMLElement>(`[data-pin="${id}"] button`)?.focus({ preventScroll: true });
  });
  root.querySelectorAll<HTMLButtonElement>('[data-locale-toggle]').forEach((button) => {
    button.addEventListener('click', () => setLocale(button.dataset.localeToggle as Locale));
  });
  // Play goes straight to the game, where the title menu offers New Game or Continue.
  root.querySelectorAll<HTMLAnchorElement>('[data-play-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!BOULEVARD_PREVIEW && !host.getState().running) return;
      event.preventDefault();
      host.continueGame();
    });
  });
  newGame.addEventListener('click', () => host.startNewGame());
  continueGame.addEventListener('click', () => host.continueGame());
  if (reel) reel.muted = true;

  function refresh() {
    const { running, starting, immersive, hasSave } = host.getState();
    root.querySelectorAll<HTMLElement>('[data-play-label]').forEach((label) => { label.textContent = t(running ? 'Return to game' : label.dataset.playLabel!); });
    continueGame.textContent = t(running ? 'Return to game' : 'Continue saved game');
    continueGame.disabled = starting || (!running && !hasSave);
    newGame.disabled = starting;
    if (reel) {
      if (immersive || reducedMotion()) reel.pause();
      else void reel.play().catch(() => undefined);
    }
  }

  renderLocalized();
  onLocaleChange(() => { renderLocalized(); refresh(); });
  return { refresh };
}
