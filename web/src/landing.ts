import landmarkCatalog from './data/landmarks.json';
import sightCatalog from './data/sights.json';
import cityGeometry from './data/minimap-contract.json';
import './landing.css';
import { escapeHtml } from './city-guide';
import { getLocale, onLocaleChange, setLocale, t } from './i18n';
import type { Locale } from './i18n';
import { badgeArt, landingMedia, landmarkArt } from './landing-assets';
import type { PokemonIcon } from './landing-assets';
import { pixelFlag } from './landing-flag';
import { cityPlaceSummary, districtCount, districtLabelSpots, gymStatusSummary, isGym, isGymOpen, localizedPlace, markerPosition, orderPlaces, placeStatus, placeWorld } from './landing-model';
import type { LandingLandmark } from './landing-model';
import type { MinimapGeometry } from './minimap-model';

interface LandingHost {
  startNewGame(): void;
  continueGame(): void;
  getState(): { running: boolean; starting: boolean; immersive: boolean; hasSave: boolean };
}

// Every pin on the page: the ten gyms, then the landmarks without one (temple halls and outdoor set pieces).
const landmarks = orderPlaces([...landmarkCatalog, ...sightCatalog] as LandingLandmark[]);
const gyms = landmarks.filter(isGym);
const sights = landmarks.filter((place) => !isGym(place));
const city = cityGeometry as MinimapGeometry;
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
const pixelImage = (url: string, alt = '') => `<img class="lp-px" src="${escapeHtml(url)}" alt="${escapeHtml(t(alt))}"${alt ? ` data-i18n-alt="${escapeHtml(alt)}"` : ''} loading="lazy">`;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// Party-menu icons flip between their two frames; `index` staggers a row of them.
const monIcon = (mon: PokemonIcon, index: number, labelled = true) => `<span class="lp-mon" ${labelled ? `role="img" aria-label="${escapeHtml(t(mon.name))}" data-i18n-label="${escapeHtml(mon.name)}"` : 'aria-hidden="true"'} style="--i:${index};background-image:url('${escapeHtml(mon.icon)}')"></span>`;

function cityMap() {
  const { width, height } = city.world;
  const labels = districtLabelSpots(city).map(({ label, sign, x, y }) =>
    `<span class="lp-district-name${sign ? ' lp-district-sign' : ''}" style="left:${x}%;top:${y}%">${label}</span>`).join('');
  return `<img class="lp-map-art" src="${escapeHtml(landingMedia.cityMap)}" width="${width * 16}" height="${height * 16}" alt="">${labels}<span class="lp-map-chip">${copy('IN-GAME MAP')}</span>`;
}

// Step 3's City Pass, stamped with every gym's badge as the game draws it.
function renderPass() {
  const chinese = getLocale() === 'zh-Hant';
  return gyms.map((place, index) => {
    const badge = (chinese ? place.badgeNameZh : place.badgeNameEn) ?? '';
    const label = `${number(index)} · ${badge} · ${chinese ? place.shortNameZh : place.shortNameEn}`;
    const art = badgeArt[place.id] ? `<img class="lp-px" src="${escapeHtml(badgeArt[place.id])}" alt="" width="32" height="32">` : '';
    return `<div class="lp-stamp ${isGymOpen(place) ? 'is-earned' : ''}" role="img" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${art}<span>${number(index)}</span></div>`;
  }).join('');
}

function sectionHead(eyebrow: string, title: string, side?: string, titleId?: string) {
  return `<div class="lp-section-head"><div class="lp-section-title"><p class="lp-eyebrow">${copy(eyebrow)}</p><h2 class="lp-h2 lp-display"${titleId ? ` id="${titleId}"` : ''}>${titleId ? escapeHtml(title) : copy(title)}</h2></div>${side ? `<p class="lp-section-side">${copy(side)}</p>` : ''}</div>`;
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
      <section class="lp-hero" id="top">
        <div class="lp-hero-copy">
          <p class="lp-eyebrow lp-eyebrow-dot">${copy('A POKÉMON FIRERED ADVENTURE · 臺中')}</p>
          <h1 class="lp-h1 lp-display">${copy('Taichung, shrunk to fit a Game Boy.')}</h1>
          <p class="lp-lede">${copy('Explore Taichung in the world of Pokémon. Challenge leaders at ten real landmark gyms, collect badges, and find ten more landmarks around town, from Taichung Prefectural Hall to Wanhe Temple. Pick a partner, hop on a bike, and play free in your browser.')}</p>
          <div class="lp-actions"><a class="lp-btn" id="hero-play" href="#play" data-play-link><span aria-hidden="true">▶</span> <span data-play-label="Play in your browser">${escapeHtml(t('Play in your browser'))}</span></a><a class="lp-text-link" href="#map">${copy('Explore the map ↓')}</a></div>
          <div class="lp-facts"><span>${gyms.length} ${copy('gyms')}</span><span>${landmarks.length} ${copy('landmarks')}</span><span>${districtCount(landmarks)} ${copy('districts')}</span><span>English · 繁體中文</span>${copy('No install')}</div>
        </div>
        <div class="lp-hero-frame">
          <div class="lp-casing">
            <div class="lp-casing-top"><span class="lp-power"><i></i>臺中 · TAICHUNG</span>${copy('OLD STATION PLAZA')}</div>
            <div class="lp-bezel"><div class="lp-screen">${heroScreen()}</div></div>
            <div class="lp-partner">${landingMedia.heroPartner ? pixelImage(landingMedia.heroPartner, 'Pikachu') : placeholder('Partner Pokémon sprite', 'lp-slot-fill')}</div>
          </div>
          <p class="lp-status"><b>${copy('Early access.')}</b> <span id="lp-gym-status"></span></p>
        </div>
      </section>

      <section class="lp-map-section" id="map"><div class="lp-wrap">
        ${sectionHead('01 — THE MAP', cityPlaceSummary(landmarks, getLocale()), "Distances are compressed, but the city keeps its shape: the old city around the station, the Greenway's museums in the middle, Xitun's theater and night market to the northwest, and Nantun's temples and parks to the south. Green pins are gyms; gold pins are landmarks to find on foot.", 'lp-map-heading')}
        <div class="lp-map-body">
          <div class="lp-map" id="lp-map" style="aspect-ratio:${city.world.width} / ${city.world.height};background-size:${800 / city.world.width}% ${800 / city.world.height}%" role="group" aria-label="${escapeHtml(t('Choose a landmark'))}" data-i18n-label="Choose a landmark">
            ${cityMap()}
            <div id="lp-markers"></div>
            <div class="lp-map-legend"><span><i class="lp-swatch-open"></i>${copy('Gym')}</span><span><i class="lp-swatch-landmark"></i>${copy('Landmark')}</span>${gyms.some((place) => !isGymOpen(place)) ? `<span><i class="lp-swatch-planned"></i>${copy('In development')}</span>` : ''}</div>
          </div>
          <aside class="lp-detail" id="lp-detail" aria-live="polite"></aside>
        </div>
      </div></section>

      <section class="lp-wrap" id="gyms">
        ${sectionHead('02 — THE LANDMARKS', 'Ten gyms and ten more landmarks, all real places.', 'Each place is redrawn tile by tile. Gym leaders are fictional; the buildings are real.')}
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
      <span class="lp-footer-note">${copy('Fan-made and non-commercial. Not affiliated with Nintendo, Game Freak or The Pokémon Company. Pokémon © its respective owners. Landmark info via Wikipedia and the Taichung Tourism and Travel Bureau.')}</span>
      <div class="lp-footer-links"><a href="${GITHUB_URL}" target="_blank" rel="noopener">GitHub</a><a href="/licenses/index.html" target="_blank" rel="noopener">${copy('Licenses')}</a></div>
    </footer>
  </div>`;
}

function renderMarkers(selected: string) {
  const locale = getLocale();
  return landmarks.map((place, index) => {
    const { x, y, side } = markerPosition(placeWorld(place, city.markersById), city.world);
    const { name, mapLabel } = localizedPlace(place, locale);
    const state = `${!isGym(place) ? 'is-landmark' : isGymOpen(place) ? 'is-open' : 'is-planned'}${place.id === selected ? ' is-selected' : ''}`;
    return `<div class="lp-pin ${state} lp-side-${place.landingLabelSide ?? side}" data-pin="${escapeHtml(place.id)}" style="left:${x}%;top:${y}%">
      <button type="button" class="lp-marker" data-select="${escapeHtml(place.id)}" aria-label="${escapeHtml(`${name} · ${t(placeStatus(place))}`)}" aria-pressed="${place.id === selected}">${number(index)}</button>
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
    ? `<div class="lp-facade${art.mapView ? ' lp-map-view' : ''}" role="img" aria-label="${escapeHtml(info.name)}" style="background-image:url('${escapeHtml(art.facade)}')"></div>`
    : `<div class="lp-facade-pending">${copy('Facade art pending')}</div>`;
  const portrait = art?.leader && info.leader
    ? `<div class="lp-portrait lp-portrait-art" role="img" aria-label="${escapeHtml(info.leader)}" style="background-image:url('${escapeHtml(art.leader)}')"></div>`
    : '<div class="lp-portrait">?</div>';
  const team = info.leader ? art?.team : undefined;
  const teamSprites = team
    ? `<div class="lp-team-sprites" role="group" aria-label="${escapeHtml(t("Leader's team"))}">${team.map((mon, slot) => `<i>${monIcon(mon, slot)}</i>`).join('')}</div>`
    : '<div class="lp-team-sprites" aria-hidden="true"><i>?</i><i>?</i><i>?</i></div>';
  return `
    <div class="lp-detail-art">${facade}</div>
    <div class="lp-detail-body">
      <div class="lp-detail-meta"><span>No. ${number(index)} · ${escapeHtml(info.district)}</span><span class="lp-chip ${!isGym(place) ? 'is-landmark' : isGymOpen(place) ? 'is-open' : ''}">${copy(!isGym(place) ? 'LANDMARK' : isGymOpen(place) ? 'GYM OPEN' : 'IN DEVELOPMENT')}</span></div>
      <div class="lp-detail-names"><h3 class="lp-display">${escapeHtml(info.name)}</h3><span>${escapeHtml(info.otherName)}</span></div>
      <p class="lp-detail-text">${escapeHtml(info.description)}</p>
      <div class="lp-detail-foot">
        ${isGym(place) ? `<div class="lp-leader">${portrait}<div class="lp-leader-name"><small>${copy('Gym leader')}</small><b>${info.leader ? escapeHtml(info.leader) : copy('To be revealed')}</b></div>${teamSprites}</div>` : `<p class="lp-landmark-note">${copy(place.kind === 'sight' ? 'In the game: find it on the city map and read its sign. There is no gym battle or badge here.' : 'In the game: step inside the hall and meet its host. There is no gym battle or badge here.')}</p>`}
        ${info.url ? `<div class="lp-real-life"><span>${copy('In real life')}</span><a href="${escapeHtml(info.url)}" target="_blank" rel="noopener">${copy('Visitor info ↗')}</a></div>` : ''}
      </div>
    </div>`;
}

function renderCard(place: LandingLandmark, locale: ReturnType<typeof getLocale>) {
  const index = landmarks.indexOf(place);
  const info = localizedPlace(place, locale);
  const art = landmarkArt[place.id];
  return `<button type="button" class="lp-card${isGym(place) ? '' : ' is-landmark'}" data-card="${escapeHtml(place.id)}">
      <span class="lp-card-art${art?.mapView ? ' lp-map-view' : ''}" style="background:${art?.tint ?? '#eee8dc'}">${art?.facade ? `<span class="lp-card-facade" style="background-image:url('${escapeHtml(art.facade)}')"></span>` : `<span class="lp-card-pending">${copy('facade art')}</span>`}</span>
      <span class="lp-card-body"><span class="lp-card-meta"><span>No. ${number(index)}</span><span class="${!isGym(place) ? 'is-landmark' : isGymOpen(place) ? 'is-open' : 'is-planned'}">● ${copy(placeStatus(place))}</span></span><span class="lp-card-name">${escapeHtml(info.shortName)}</span><span class="lp-card-other">${escapeHtml(info.otherName)}</span></span>
    </button>`;
}

function renderGallery() {
  const locale = getLocale();
  const group = (title: string, note: string, places: LandingLandmark[]) => `<div class="lp-gallery-group">
      <div class="lp-gallery-head"><h3>${copy(title)} <span>${places.length}</span></h3><p>${copy(note)}</p></div>
      <div class="lp-gallery-grid">${places.map((place) => renderCard(place, locale)).join('')}</div>
    </div>`;
  return group('Gyms', 'Beat the leader inside to earn a City Pass stamp.', gyms)
    + group('Landmarks', 'No battles here: real places drawn into the city, from temples and markets to parks.', sights);
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
    root.querySelector('#lp-pass')!.innerHTML = renderPass();
    root.querySelector('#lp-map-heading')!.textContent = cityPlaceSummary(landmarks, getLocale());
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
