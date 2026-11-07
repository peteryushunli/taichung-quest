# Taichung Quest

Public source: <https://github.com/peteryushunli/taichung-quest>

Private playable preview: <https://taichung-quest-hackday.helpfulwren.chatgpt.site> (ChatGPT sign-in required).

A Pokémon FireRed modification set in a compressed, fictionalized Taichung. A real Game Boy Advance ROM runs in the browser through mGBA WebAssembly.

Explore Old City, Greenway and Xitun in a native Pokémon game, with ten enterable landmark halls. Begin inside Old Taichung Station, choose one of four partners from their animated icons and large portraits, then step directly into the plaza beside the custom Station facade. The Station has the first optional native leader battle; the other nine halls are explorable placeholders.

The ten-landmark roster is approved. The remaining nine gym battles and the expanded city are later integrations. [docs/game-design.md](docs/game-design.md) records decisions and open design work.

## Project layout

- `vendor/pokefirered/`: reconstructed FireRed source, with local game modifications.
- `vendor/agbcc/` and `.tools/`: local game build dependencies.
- `web/`: browser player, touch controls, audio, and game saves.
- `scripts/`: reproducible setup, ROM builds, and change export.
- `patches/`: portable changes against the pinned upstream game source.
- `docs/map-design.md`: map coordinates, landmarks, quest, and art decisions.

Upstream FireRed source: <https://github.com/pret/pokefirered>, pinned to `ce6406d8c2eaf46d543c8a2606de0c3cb1951982`.

## Run locally

From the project root:

```sh
bash scripts/bootstrap-game.sh
bash scripts/build-game.sh
cd web
npm ci
npm run dev
```

Open the local address printed by Vite. Start the player with the page's Play button. The browser needs cross-origin isolation for the emulator; the development server sets the required headers. A production host must send COOP and COEP on its actual responses; copying `_headers` alone is not sufficient on every host.

For game compiler prerequisites and baseline verification, see [docs/game-build.md](docs/game-build.md). After editing the vendor game source, run `bash scripts/build-game.sh` and reload the browser player. Export the finished source changes with `bash scripts/export-game-patch.sh`.

For a static/Vercel build, run `bash scripts/build-site.sh` from the root after building the ROM. For the existing private Site, run `node scripts/build-sites-worker.mjs` followed by `node scripts/validate-sites-worker.mjs`; this packages the same files in a Worker that supplies the required response headers. `.openai/hosting.json` retains the existing Site identity. See [Sites hosting](docs/sites-worker-hosting.md) and [deployment verification](docs/deployment.md). Public source excludes generated game images, saves, dependencies, and local tools; the website artifact contains the built game required by the player.

## First playable scope

Choose English or Traditional Chinese, independent Off / Low / Normal encounter settings, and Charmander, Bulbasaur, Squirtle or Pikachu. The native TEAM menu freely adds or replaces up to six Pokémon from species 001–150, including evolved forms, with level-50 stats and useful moves. Accepted Station challenges heal the team; city battles avoid EXP and evolution gates. Genuine victory records one Station stamp in the ten-landmark City Pass; defeat heals and returns to the nearby plaza for a retry. Bike/Get off is available in the native menu. Other landmark halls remain explorable placeholders.

The bilingual City Map describes all ten real places with original illustrations and official visitor links. It distinguishes playable areas from unfinished gym content and does not simulate live location or earned stamps.

Native Traditional Chinese covers custom city text, district names, starters, City Pass, exploration settings, menu actions and common save/battle labels. Original FireRed story, Pokémon/move names and many detail screens remain English. The browser and native language controls synchronize through a versioned packet validated against the exact ROM. Changes wait while the game is busy or paused. See [docs/native-localization.md](docs/native-localization.md) for coverage.

Native saves survive reloads and can be exported/imported. Version-2 migration preserves older Taichung parties and progress, refreshes cached Station tiles, and preserves valid saved positions; six newly blocked facade cells fall back to the safe plaza. Browser snapshots are isolated by ROM digest. Use native Save before exporting a backup or changing ROM revisions.

## Design input

The map and story chats own the next creative pass: broader neighborhoods and ordinary streets, recognizable landmark silhouettes, and fictional leaders with paired English/Traditional Chinese dialogue. The common level is 50; final leader teams and balance remain open. Live minimap, faster contextual cycling, expanded city blocks and further landmark facades are deferred from the submission build. The three-district blockout is the working baseline for those additions.

Source reconstruction and emulator licenses do not grant publication rights to Pokémon's game content. Keep attribution and licenses for the emulator and dependencies with the browser build.

## Submission checkpoint

See [the submission release notes](docs/submission-release.md) for the exact native source, cartridge hashes, verified scope and limitations. The public repository contains the portable source patch and build tooling; generated cartridges and native saves remain excluded.
