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

The unmodified emulator modules are loaded through `public/emulator-loader.js`, using a native HTML module script rather than a Vite source import. This preserves the script URL used by mGBA's pthread worker.

## Controls and saves

- Arrows or WASD: movement.
- Z / X: A / B.
- Enter: Start; Backspace or right Shift: Select.
- Q / E: L / R.
- Onscreen buttons support pointer and touch input.
- Save spot captures an emulator snapshot. Snapshots are also stored every 20 seconds and restored on the next visit.
- In-game saves persist in IndexedDB and can be downloaded/imported as `.sav` files. Use the game's own Save menu before downloading a save.
- Restart returns to the cartridge's title screen while keeping the in-game save.
- Losing page visibility pauses the game and releases held buttons.

Browser saves belong to the current origin. Downloads provide a portable backup across browsers or deployment URLs.

Emulator snapshots are namespaced by the first 16 hexadecimal characters of the actual cartridge's SHA-256 digest. A rebuilt ROM therefore starts without restoring incompatible CPU/memory state from another build. The normal in-game `.sav` path stays stable so Continue remains available across builds. Older snapshots are retained, while obsolete downloaded cartridge copies are removed from IndexedDB to avoid storing another 16 MB for every build.

## City Map and interface language

The persistent City Map button opens a native modal visitor guide. Five example landmarks use the shared `src/data/landmarks.json` catalog, with bilingual names, verified official visitor links, and original SVG field sketches. Marker positions and the green connecting path use catalog coordinates. The overview is a compressed schematic, not a street-navigation map. Only the Greenway starting area is playable. Other markers are visitor-guide examples labeled as not playable; the full city layout and final landmark/gym roster remain undecided.

Opening the guide releases held inputs and pauses an active game. Closing it, including with Escape, restores the prior running/paused state and returns keyboard focus to the opener. The guide does not simulate visited places, badges, player position, or progression.

The header and guide language selectors switch the browser interface and all five visitor descriptions between English and Traditional Chinese without replacing the canvas or resetting the emulator. The preference persists as `taichung-quest-interface-language` in localStorage. The cartridge's own language is selected independently inside the game; this UI selector does not modify cartridge state.

## Runtime source and license

`@thenick775/mgba-wasm` is pinned to 2.6.0 (MPL-2.0), published from commit `c0d196432c4437ff06827dccd1a785de2afab5b8`. The corresponding source is available at:

https://github.com/thenick775/mgba/tree/c0d196432c4437ff06827dccd1a785de2afab5b8

The distributed runtime is unmodified. `licenses/MPL-2.0.txt` is copied next to its assets, along with a source notice. The emulator's license covers its runtime; the game project has separate upstream provenance.
