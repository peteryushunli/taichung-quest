import landmarkCatalog from './data/landmarks.json';
import './landing.css';
import { escapeHtml } from './city-guide';
import { getLocale, onLocaleChange, setLocale, t } from './i18n';
import type { Locale } from './i18n';
import { landingMedia, landmarkArt } from './landing-assets';
import { districtCount, gymStatusSummary, isGymOpen, localizedPlace, markerPosition } from './landing-model';
import type { LandingLandmark } from './landing-model';

interface LandingHost {
  startNewGame(): void;
  continueGame(): void;
  getState(): { running: boolean; starting: boolean; immersive: boolean; hasSave: boolean };
}

const landmarks = landmarkCatalog as LandingLandmark[];
const DEFAULT_LANDMARK = 'old-taichung-station';
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
const pixelImage = (url: string, alt = '') => `<img class="lp-px" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy">`;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function schematicLayer() {
  const route = 'M22 30 C 32 40, 40 44, 48 52 S 70 70, 84 76';
  return `<div class="lp-map-grid"></div>
    <svg class="lp-map-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="${route}" stroke="#efe9cf" stroke-width="3.2"/><path d="${route}" stroke="#c9b98a" stroke-width="1" stroke-dasharray="5 5"/></svg>
    <div class="lp-district lp-district-xitun"></div><div class="lp-district lp-district-greenway"></div><div class="lp-district lp-district-old"></div>
    <span class="lp-district-name lp-name-xitun">XITUN 西屯</span><span class="lp-district-name lp-name-greenway">GREENWAY 草悟道</span><span class="lp-district-name lp-name-old">OLD CITY 舊城</span>
    <span class="lp-map-chip">${copy('SCHEMATIC · NOT TO SCALE')}</span>`;
}

function sectionHead(eyebrow: string, title: string, side?: string) {
  return `<div class="lp-section-head"><div class="lp-section-title"><p class="lp-eyebrow">${copy(eyebrow)}</p><h2 class="lp-h2 lp-display">${copy(title)}</h2></div>${side ? `<p class="lp-section-side">${copy(side)}</p>` : ''}</div>`;
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
      <a class="lp-brand" href="#top"><span class="lp-brand-glyph" lang="zh-Hant">臺</span><span class="lp-brand-title" lang="en">Taichung Quest</span></a>
      <nav class="lp-nav" aria-label="Page sections">
        <a class="lp-nav-link" href="#map">${copy('Map')}</a>
        <a class="lp-nav-link" href="#gyms">${copy('Landmarks')}</a>
        <a class="lp-nav-link" href="#how">${copy('How it plays')}</a>
        <div class="lp-lang" role="group" aria-label="Language · 語言"><button type="button" data-locale-toggle="en" lang="en">EN</button><button type="button" data-locale-toggle="zh-Hant" lang="zh-Hant">中文</button></div>
        <a class="lp-btn lp-btn-small" href="#play" data-play-link><span aria-hidden="true">▶</span> <span data-play-label="Play">${escapeHtml(t('Play'))}</span></a>
      </nav>
    </div></header>
    <main>
      <section class="lp-hero" id="top">
        <div class="lp-hero-copy">
          <p class="lp-eyebrow lp-eyebrow-dot">${copy('A POKÉMON FIRERED ADVENTURE · 臺中')}</p>
          <h1 class="lp-h1 lp-display">${copy('Taichung, shrunk to fit a Game Boy.')}</h1>
          <p class="lp-lede">${copy('A custom Pokémon adventure set in a pocket-sized Taichung. Ten real landmarks — from Old Taichung Station to the National Theater — each host a gym. Pick a partner, hop on a bike, and play it free in your browser.')}</p>
          <div class="lp-actions"><a class="lp-btn" id="hero-play" href="#play" data-play-link><span aria-hidden="true">▶</span> <span data-play-label="Play in your browser">${escapeHtml(t('Play in your browser'))}</span></a><a class="lp-text-link" href="#map">${copy('Explore the map ↓')}</a></div>
          <div class="lp-facts"><span>${landmarks.length} ${copy('landmarks')}</span><span>${districtCount(landmarks)} ${copy('districts')}</span><span>English · 繁體中文</span>${copy('No install')}</div>
        </div>
        <div class="lp-hero-frame">
          <div class="lp-casing">
            <div class="lp-casing-top"><span class="lp-power"><i></i>臺中 · TAICHUNG</span>${copy('OLD STATION PLAZA')}</div>
            <div class="lp-bezel"><div class="lp-screen">${heroScreen()}</div></div>
            <div class="lp-partner">${landingMedia.heroPartner ? pixelImage(landingMedia.heroPartner) : placeholder('Partner Pokémon sprite', 'lp-slot-fill')}</div>
          </div>
          <p class="lp-status"><b>${copy('Early access.')}</b> <span id="lp-gym-status"></span></p>
        </div>
      </section>

      <section class="lp-map-section" id="map"><div class="lp-wrap">
        ${sectionHead('01 — THE MAP', 'Three districts. Ten real places.', "Distances are compressed and side streets are gone, but the city keeps its shape: the old city around the station, the Greenway's museums in the middle, Xitun's theater and night market to the northwest.")}
        <div class="lp-map-body">
          <div class="lp-map" id="lp-map" role="group" aria-label="${escapeHtml(t('Choose a landmark'))}" data-i18n-label="Choose a landmark">
            ${landingMedia.mapMode === 'art' && landingMedia.mapArt ? `<img class="lp-map-art lp-px" src="${escapeHtml(landingMedia.mapArt)}" alt="">` : schematicLayer()}
            <div id="lp-markers"></div>
            <div class="lp-map-legend"><span><i class="lp-swatch-open"></i>${copy('Gym open')}</span><span><i class="lp-swatch-planned"></i>${copy('In development')}</span></div>
          </div>
          <aside class="lp-detail" id="lp-detail" aria-live="polite"></aside>
        </div>
      </div></section>

      <section class="lp-wrap" id="gyms">
        ${sectionHead('02 — THE LANDMARKS', 'Every gym is a place you can actually visit.', 'Each facade is redrawn tile by tile. Leaders are fictional; the buildings are real.')}
        <div class="lp-gallery" id="lp-gallery"></div>
      </section>

      <section class="lp-how" id="how"><div class="lp-wrap">
        ${sectionHead('03 — HOW IT PLAYS', 'A short guide, then the city is yours.')}
        <div class="lp-step-one">
          <div class="lp-step-one-copy">
            <span class="lp-step-label">${copy('STEP 1')}</span>
            <h3 class="lp-step-one-title lp-display">${copy('Pick your partner.')}</h3>
            <p>${copy('Four Pokémon wait inside Old Taichung Station. The one you choose steps out into the plaza with you.')}</p>
          </div>
          <div class="lp-starters">${starters.map((starter) => `<div class="lp-starter">
            <div class="lp-starter-art" style="background:${starter.tint}">${landingMedia.starters[starter.key] ? pixelImage(landingMedia.starters[starter.key]!, starter.name) : placeholder(`${starter.name} sprite`, 'lp-slot-fill')}</div>
            <div class="lp-starter-body"><div class="lp-starter-meta"><span>No. ${starter.dex}</span><span class="lp-type" style="background:${starter.tint};color:${starter.ink}">${copy(starter.type)}</span></div><span class="lp-starter-name">${copy(starter.name)}</span></div>
          </div>`).join('')}</div>
          <div class="lp-team">
            <div class="lp-team-copy"><span>${copy('Then build a team of six.')}</span><p>${copy('Add any of the original 150 from the TEAM menu, evolved forms included, all at level 50. Swap them out whenever you like.')}</p></div>
            <div class="lp-party">${[0, 1, 2, 3, 4, 5].map((slot) => landingMedia.party[slot] ? `<div class="lp-party-slot">${pixelImage(landingMedia.party[slot]!)}</div>` : `<div class="lp-party-slot lp-party-empty">${slot + 1}</div>`).join('')}</div>
          </div>
        </div>
        <div class="lp-steps">
          <div class="lp-step">
            <div class="lp-shot">${landingMedia.bikeShot ? `<img class="lp-px" src="${escapeHtml(landingMedia.bikeShot)}" alt="${escapeHtml(t('Biking down the Greenway'))}" data-i18n-alt="Biking down the Greenway" loading="lazy">` : placeholder('Biking down the Greenway', 'lp-slot-fill')}</div>
            <span class="lp-step-label">${copy('STEP 2')}</span>
            <h3>${copy('Ride across town')}</h3>
            <p>${copy('The bike is yours from the start — tap B. Turn wild encounters and trainer challenges to Off, Low or Normal.')}</p>
          </div>
          <div class="lp-step">
            <div class="lp-pass">${landmarks.map((place, index) => `<div class="lp-stamp ${isGymOpen(place) ? 'is-earned' : ''}">${number(index)}</div>`).join('')}</div>
            <span class="lp-step-label">${copy('STEP 3')}</span>
            <h3>${copy('Fill your City Pass')}</h3>
            <p>${copy("Beat a landmark's leader to earn its stamp. Lose, and you're healed back at the plaza for another try.")}</p>
          </div>
        </div>
      </div></section>

      <section class="lp-cta" id="play"><div class="lp-wrap lp-cta-inner">
        <div class="lp-cta-copy">
          <p class="lp-eyebrow">${copy('YOUR JOURNEY STARTS AT')}</p>
          <h2 class="lp-cta-title lp-display">${copy('Old Taichung Station.')}<span class="lp-cta-zh" lang="zh-Hant">舊臺中車站</span></h2>
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
      <span class="lp-footer-note">${copy('Fan-made and non-commercial. Not affiliated with Nintendo, Game Freak or The Pokémon Company. Pokémon © its respective owners. Landmark info via Taichung Tourism and Travel Bureau.')}</span>
      <div class="lp-footer-links"><a href="${GITHUB_URL}" target="_blank" rel="noopener">GitHub</a><a href="/licenses/index.html" target="_blank" rel="noopener">${copy('Licenses')}</a></div>
    </footer>
  </div>`;
}

function renderMarkers(selected: string) {
  const locale = getLocale();
  return landmarks.map((place, index) => {
    const { x, y } = markerPosition(place);
    const { name, mapLabel } = localizedPlace(place, locale);
    const state = `${isGymOpen(place) ? 'is-open' : 'is-planned'}${place.id === selected ? ' is-selected' : ''}`;
    return `<div class="lp-pin ${state} lp-side-${place.mapLabelSide === 'left' ? 'left' : 'right'}" data-pin="${escapeHtml(place.id)}" style="left:${x}%;top:${y}%">
      <button type="button" class="lp-marker" data-select="${escapeHtml(place.id)}" aria-label="${escapeHtml(name)}" aria-pressed="${place.id === selected}">${number(index)}</button>
      <span class="lp-pin-label" data-select="${escapeHtml(place.id)}" aria-hidden="true">${escapeHtml(mapLabel)}</span>
    </div>`;
  }).join('');
}

function renderDetail(id: string) {
  const index = landmarks.findIndex((place) => place.id === id);
  const place = landmarks[index];
  const info = localizedPlace(place, getLocale());
  const art = landmarkArt[id];
  const facade = art?.facade
    ? `<div class="lp-facade" role="img" aria-label="${escapeHtml(info.name)}" style="background-image:url('${escapeHtml(art.facade)}')"></div>`
    : `<div class="lp-facade-pending">${copy('Facade art pending')}</div>`;
  const portrait = art?.leader && info.leader
    ? `<div class="lp-portrait lp-portrait-art" role="img" aria-label="${escapeHtml(info.leader)}" style="background-image:url('${escapeHtml(art.leader)}')"></div>`
    : '<div class="lp-portrait">?</div>';
  return `
    <div class="lp-detail-art">${facade}</div>
    <div class="lp-detail-body">
      <div class="lp-detail-meta"><span>No. ${number(index)} · ${escapeHtml(info.district)}</span><span class="lp-chip ${isGymOpen(place) ? 'is-open' : ''}">${copy(isGymOpen(place) ? 'GYM OPEN' : 'IN DEVELOPMENT')}</span></div>
      <div class="lp-detail-names"><h3 class="lp-display">${escapeHtml(info.name)}</h3><span>${escapeHtml(info.otherName)}</span></div>
      <p class="lp-detail-text">${escapeHtml(info.description)}</p>
      <div class="lp-detail-foot">
        <div class="lp-leader">${portrait}<div class="lp-leader-name"><small>${copy('Gym leader')}</small><b>${info.leader ? escapeHtml(info.leader) : copy('To be revealed')}</b></div><div class="lp-team-sprites" aria-hidden="true"><i>◓</i><i>◓</i><i>◓</i></div></div>
        <div class="lp-real-life"><span>${copy('In real life')}</span><a href="${escapeHtml(info.url)}" target="_blank" rel="noopener">${copy('Visitor info ↗')}</a></div>
      </div>
    </div>`;
}

function renderGallery() {
  const locale = getLocale();
  return landmarks.map((place, index) => {
    const info = localizedPlace(place, locale);
    const art = landmarkArt[place.id];
    return `<button type="button" class="lp-card" data-card="${escapeHtml(place.id)}">
      <span class="lp-card-art" style="background:${art?.tint ?? '#eee8dc'}">${art?.facade ? `<span class="lp-card-facade" style="background-image:url('${escapeHtml(art.facade)}')"></span>` : `<span class="lp-card-pending">${copy('facade art')}</span>`}</span>
      <span class="lp-card-body"><span class="lp-card-meta"><span>No. ${number(index)}</span><span class="${isGymOpen(place) ? 'is-open' : 'is-planned'}">● ${copy(isGymOpen(place) ? 'Gym open' : 'In dev')}</span></span><span class="lp-card-name">${escapeHtml(info.shortName)}</span><span class="lp-card-other">${escapeHtml(info.otherName)}</span></span>
    </button>`;
  }).join('');
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

  function renderLocalized() {
    markers.innerHTML = renderMarkers(selected);
    detail.innerHTML = renderDetail(selected);
    gallery.innerHTML = renderGallery();
    root.querySelector('#lp-gym-status')!.textContent = gymStatusSummary(landmarks, getLocale());
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
  }

  markers.addEventListener('click', (event) => {
    const id = (event.target as HTMLElement).closest<HTMLElement>('[data-select]')?.dataset.select;
    if (id) select(id);
  });
  gallery.addEventListener('click', (event) => {
    const id = (event.target as HTMLElement).closest<HTMLElement>('[data-card]')?.dataset.card;
    if (!id) return;
    select(id);
    root.querySelector('#map')!.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
    markers.querySelector<HTMLElement>(`[data-pin="${id}"] button`)?.focus({ preventScroll: true });
  });
  root.querySelectorAll<HTMLButtonElement>('[data-locale-toggle]').forEach((button) => {
    button.addEventListener('click', () => setLocale(button.dataset.localeToggle as Locale));
  });
  // With a game already open there is nothing to choose: Play goes straight back to it.
  root.querySelectorAll<HTMLAnchorElement>('[data-play-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!host.getState().running) return;
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
