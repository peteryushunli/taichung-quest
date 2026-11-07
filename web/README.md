# Taichung Quest browser player

A Vite + TypeScript frontend for the source-built Taichung FireRed cartridge. The canvas displays the real game running in mGBA WebAssembly.

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

- Arrows or WASD: movement.
- Z / X: A / B.
- Enter: Start; Backspace or right Shift: Select.
- Q / E: L / R.
- Onscreen buttons support pointer and touch input.
- Save spot captures an emulator snapshot. Snapshots are also stored every 20 seconds and restored on the next visit.
- In-game saves persist in IndexedDB and can be downloaded/imported as `.sav` files. Use the game's own Save menu before downloading a save. Raw 64/128 KiB files and the pinned mGBA runtime's backups with a 16-byte trailer are accepted unchanged.
- Restart keeps the in-game save, flushes browser storage and reloads the page through a fresh Play gate. The new runtime discards only this build's automatic CPU snapshot before loading the cartridge. Choose Continue on its title screen; progress since the last in-game Save is lost. Import uses the same fresh-runtime path after replacing SRAM.
- Losing page visibility pauses the game and releases held buttons.

Browser saves belong to the current origin. Downloads provide a portable backup across browsers or deployment URLs.

Emulator snapshots are namespaced by the first 16 hexadecimal characters of the actual cartridge's SHA-256 digest. A rebuilt ROM therefore starts without restoring incompatible CPU/memory state from another build. The normal in-game `.sav` path stays stable so Continue remains available across builds. Older snapshots are retained, while obsolete downloaded cartridge copies are removed from IndexedDB to avoid storing another 16 MB for every build.

The wrapper owns the 20-second snapshot timer; mGBA's duplicate internal timer is disabled before the game loads. Restart/import never call `quickReload`, `quitGame`, or change live boolean core settings. The pinned runtime's live setting path interrupts the native thread and froze Chrome after a cartridge save during QA. Confirmations use asynchronous HTML dialogs to keep the threaded player's event loop responsive. The one-time `cartridge-boot` query is consumed only after Play successfully loads the cartridge, so a failed load can be retried without restoring the discarded CPU state.

For sustained runtime QA, use `npm run build` and `npm run preview`. Editing source with Vite HMR while a threaded game is running can leave a development tab unresponsive during its automatic reload; production builds have no HMR client.

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
