# Taichung Quest browser player

A Vite + TypeScript frontend for the source-built Taichung FireRed cartridge. The canvas displays the real game running in mGBA WebAssembly.

The introduction sells exploring Taichung in the Pokémon world: real landmarks as gyms, leader battles and badges. An inline link leads to a gallery below the player with four existing pixel landmark assets: Old Station, National Taichung Theater, Miyahara and Taichung Park. Current build availability is explained below the player. The gallery uses four columns on wide desktops and two on mobile or narrower player columns, with English/Traditional Chinese captions. Asset provenance and native integration status are recorded in `src/assets/landmarks/README.md`; the gallery is labeled landmark art rather than gameplay screenshots.

## Run

```sh
npm ci
npm run dev
```

The local URL is `http://127.0.0.1:5173`. The game build belongs at `public/roms/taichung-firered.gba`; run the root game build script to generate it. The player detects a missing or invalid cartridge and keeps the start screen available for retry.

```sh
npm run build
npm run preview
```

`build` runs the TypeScript check, copies the pinned emulator distribution into `public/emulator/`, and builds `dist/`. Emulator files are served from this application's origin; no CDN or external font requests are needed.

## Browser requirements

The pinned mGBA runtime uses WebAssembly threads. Both development and deployed responses must include:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Vite sets these headers for dev and preview. `public/_headers` supplies them for compatible static hosts. The game must run in a top-level tab or in an iframe whose parent permits cross-origin isolation. The player explains the requirement if `crossOriginIsolated` or `SharedArrayBuffer` is unavailable.

The emulator modules are loaded through `public/emulator-loader.js`, using a native HTML module script rather than a Vite source import. This preserves the script URL used by mGBA's pthread worker.

## Controls and saves

- Arrow keys: movement.
- **F: Interact / Confirm** (native A); **D: the displayed secondary action** (native B). It remains Back / Cancel without fresh navigation support; exact-ROM native eligibility can label it Bike / Get off during safe outdoor exploration. D never moves right.
- M or Enter: Menu (Start); Backspace or right Shift: Select.
- Z / X remain legacy A / B aliases. E remains the R shoulder button.
- Q / E: L / R.
- Onscreen buttons support pointer and touch input. In portrait, the game sits above a 144px directional pad and large semantic action buttons. Each direction and system control has a 48px target. City Map is a separate browser guide action, not a game key.
- Drag within the pad to change direction; its center and outside edge release movement. Multiple fingers and keyboard presses own their holds independently. Inputs release on cancellation, lost capture, focus loss, rotation, fullscreen transitions, pause and modal opening. A held key must be released before it can drive the game again after focus or modal changes.
- Game shortcuts operate on the game canvas and focused game controls. Text fields, language selectors, guide/dialog controls, links and ordinary page buttons keep their own keyboard behavior. Enter/Space activate a focused game button; F/D remain its primary action shortcuts.
- Play enters a viewport-filling portrait game view and requests native fullscreen directly in the click gesture. The CSS view works when the browser declines or lacks that API. Back to introduction pauses the live game; Return to game resumes the same canvas/runtime.
- Game options keeps language, sound, snapshot save, cartridge restart and save download/import inside the player. Opening options releases controls and preserves the prior pause state on close. City Map remains a separate control. Loading and preflight failures appear beside Play, including when hosting lacks the isolation headers.
- Mobile layout is portrait-only at the user's request. No dedicated landscape mode is provided. The responsive page and desktop F/D/arrow controls remain available.
- Save spot captures an emulator snapshot. Snapshots are also stored every 20 seconds and restored on the next visit.
- In-game saves persist in IndexedDB and can be downloaded/imported as `.sav` files. Use the game's own Save menu before downloading a save. Raw 64/128 KiB files and the pinned mGBA runtime's backups with a 16-byte trailer are accepted unchanged.
- Restart keeps the in-game save, flushes browser storage and reloads the page through a fresh Play gate. The new runtime discards only this build's automatic CPU snapshot before loading the cartridge. Choose Continue on its title screen; progress since the last in-game Save is lost. Import uses the same fresh-runtime path after replacing SRAM.
- Losing page visibility pauses the game and releases held buttons.

Browser saves belong to the current origin. Downloads provide a portable backup across browsers or deployment URLs.

## Live minimap

The compact north-up HUD sits in the upper-left of the game viewport. Its footer uses unique compact landmark names in both languages; the tooltip and accessible name retain the official full name. Indoor status has a separate badge without increasing the HUD footprint. Game options has a bilingual Minimap On/Off selector, defaulting On and remembering the choice in browser storage. Tapping a visible minimap opens the existing City Map and pauses/releases game input. The accepted portrait controls do not move.

Live output requires matching `/roms/build.json` metadata: the loaded cartridge's exact SHA-256 and byte count, `navigationBridge` version 1 / size 48/magic/symbol address, and `minimap.schemaVersion=1` with the bundled mapper geometry fingerprint. Missing or incompatible metadata keeps the HUD hidden and D labeled Back. No demo packet or fallback player coordinate exists in the production app.

`navigation-bridge.ts` reads the separate `TCNAV001` packet without writes, verifies its seqlock/header/reserved fields, discovers the sole advancing allocation and requires fresh frames. Frozen state expires after one second. Pause, options, guide, confirmation, restart and page exit clear live presentation; reset or heap replacement needs new freshness. Native menus/dialogue/battles/unknown contexts also hide it. The 32-byte language bridge stays unchanged.

`data/minimap-contract.json` is the exact Mapper 42dd4a2 export: three districts, ten gym entrances and the Station welcome room. Exterior tiles project through their authored world origins. Indoors use the explicit parent entrance with an indoor label; room coordinates never become city coordinates. Unknown maps, wrong layout dimensions and out-of-bounds tiles hide the marker. Native `CAN_TOGGLE_BIKE` alone permits Bike/Get off labels on a fresh mapped outdoor snapshot; the actual B-button latch/speed/eligibility remains native-owned.

`npm test` covers protocol coherence, freshness, exact build binding and every mapped exterior tile. `npm run build:control-tests` additionally emits `/control-tests/minimap-browser.html` with clearly labeled simulated data and eleven UI checks, alongside the existing thirteen input/view checks. A normal production build removes these fixtures. See `docs/minimap-validation.md` for proof and remaining actual-ROM checks.

Emulator snapshots are namespaced by the first 16 hexadecimal characters of the actual cartridge's SHA-256 digest. A rebuilt ROM therefore starts without restoring incompatible CPU/memory state from another build. The normal in-game `.sav` path stays stable so Continue remains available across builds. Older snapshots are retained, while obsolete downloaded cartridge copies are removed from IndexedDB to avoid storing another 16 MB for every build.

The wrapper owns the 20-second snapshot timer; mGBA's duplicate internal timer is disabled before the game loads. Restart/import never call `quickReload`, `quitGame`, or change live boolean core settings. The pinned runtime's live setting path interrupts the native thread and froze Chrome after a cartridge save during QA. Confirmations use asynchronous HTML dialogs to keep the threaded player's event loop responsive. The one-time `cartridge-boot` query is consumed only after Play successfully loads the cartridge, so a failed load can be retried without restoring the discarded CPU state.

For sustained runtime QA, use `npm run build` and `npm run preview`. Editing source with Vite HMR while a threaded game is running can leave a development tab unresponsive during its automatic reload; production builds have no HMR client.

`npm test` covers the held-input model and native-language bridge. For synthetic DOM input regression checks, run `npm run build:control-tests` **after** a normal build, then open `/control-tests/controls-browser.html` on the local preview and run the checks. This fixture stubs the emulator callbacks and OS pointer-capture boundary; it is not evidence of physical multi-touch or Wasm behavior. The next normal build removes the fixture from `dist/`, so release builds do not include it. Physical iPhone Safari and Android Chrome testing remains separate from desktop viewport checks.

## City Map and interface language

The persistent City Map button opens a native modal visitor guide before or after Play. The ten approved urban landmarks use the shared `src/data/landmarks.json` catalog, with English/Traditional Chinese names, descriptions and real-world addresses, verified official visitor links and original SVG field sketches. CMP is part of Greenway visitor copy. Numbered markers follow the native City Pass order and mapper entrance anchors across Old City, Greenway and Xitun; this is compressed game geography, not a street-navigation map. A readable indexed list provides the same ten choices on mobile without floating-label clutter. Selecting a landmark brings its card into view on small screens.

The integrated districts and ten visitor halls are explorable, with provisional game artwork explicitly identified. Gym readiness is separate per catalog entry. The Station's first prototype battle is playable with a provisional leader/team; other nine challenges are unimplemented, with leaders/teams undecided. The guide uses real visitor information from the start and does not present future gym concepts as playable battles. Sources and coordinate provenance are recorded in `../docs/landmark-sources.md`.

Opening the guide releases held inputs and pauses an active game. Closing it, including with Escape, restores the prior running/paused state and returns keyboard focus to the opener. The guide does not simulate visited places, badges, player position, or progression.

The header and guide language selectors switch the browser interface and all ten visitor descriptions between English and Traditional Chinese without replacing the canvas or resetting the emulator. Before the cartridge chooses its startup language, this remains an interface preference only. Once the matching native bridge publishes a language, the game becomes authoritative and the selectors request subsequent native changes. A queued request waits while gameplay is paused or a native menu/script is busy. Native Language-menu choices, including re-selecting the current language, supersede a pending browser request. The controls show when a request is queued; they never claim it applied before native acknowledgement.

The interface preference persists as `taichung-quest-interface-language` in localStorage. The native language persists through the game's own Save menu; Continue publishes that saved language back to the browser. Coverage is custom Taichung content and menus; original FireRed screens remain English. A cartridge without exact matching bridge metadata still has usable interface controls, explicitly labeled to use the in-game Language menu separately.

The client in `src/language-bridge.ts` checks the fetched ROM's SHA-256 and size against `public/roms/build.json`. It scans the current shared Wasm heap in yielding chunks and requires a unique advancing packet with both magic words, supported version/size, and the exact EWRAM symbol address from metadata. Frozen ROM/snapshot copies and ambiguous candidates cannot receive requests. Only the request-language byte and aligned request-sequence word may be written; party, position and other gameplay state are untouched. Heap replacement triggers a fresh liveness probe. `npm test` covers these fail-closed and conflict-handling cases with synthetic shared heaps.

## Runtime source and license

`@thenick775/mgba-wasm` is pinned to 2.6.0 (MPL-2.0), published from commit `c0d196432c4437ff06827dccd1a785de2afab5b8`. The corresponding source is available at:

https://github.com/thenick775/mgba/tree/c0d196432c4437ff06827dccd1a785de2afab5b8

The WebAssembly core is unmodified. `scripts/prepare-emulator.mjs` verifies the exact upstream JavaScript SHA-256, then adds only `getTaichungHeapU8()`, a getter for its current private heap view. It does not itself modify game memory. The complete modified glue, preferred reproducible patch script, `licenses/MPL-2.0.txt`, and explicit modification/source notice are served together under `/emulator/`. A changed upstream glue file fails preparation until reviewed. The emulator's license covers its runtime; the game project has separate upstream provenance.
