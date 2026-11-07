# Taichung Quest

Public source: <https://github.com/peteryushunli/taichung-quest>

A Pokémon FireRed modification set in a compressed, fictionalized Taichung. A real Game Boy Advance ROM runs in the browser through mGBA WebAssembly.

The current blockout connects Old City, Greenway and Xitun, with ten enterable landmark halls. Old Taichung Station is the starting point and has the first optional native gym battle. Reused facades and provisional teams support the playable build while broader neighborhoods, original landmark art and story content are developed separately.

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

Open the local address printed by Vite. Start the player with the page's Play button. The browser needs cross-origin isolation for the emulator; the development server sets the required headers. A production host must also apply the rules in `web/public/_headers`.

For game compiler prerequisites and baseline verification, see [docs/game-build.md](docs/game-build.md). After editing the vendor game source, run `bash scripts/build-game.sh` and reload the browser player. Export the finished source changes with `bash scripts/export-game-patch.sh`.

For a deployment build, run `bash scripts/build-site.sh` from the root after building the ROM. It writes the complete static app to `dist/`. `.openai/hosting.json` binds that output to the existing private Site. Public source excludes generated game images, saves, dependencies, and local tools; the website artifact contains the built game required by the player.

## First playable scope

Choose English or Traditional Chinese, one of Charmander, Bulbasaur, Squirtle or Pikachu, and independent Off / Low / Normal encounter settings. Explore immediately from the Station, use Bike/Get off in the native menu, meet Pidgey/Rattata in marked park grass, or challenge fictional Station leader Jun. Winning records the Station stamp in a native ten-landmark City Pass. Other landmark halls remain explorable placeholders.

The bilingual City Map describes all ten real places with original illustrations and official visitor links. It distinguishes playable areas from unfinished gym content and does not simulate live location or earned stamps.

Native Traditional Chinese covers custom city text, district names, starters, City Pass, exploration settings, menu actions and common save/battle labels. Original FireRed story, Pokémon/move names and many detail screens remain English. The browser and native language controls synchronize through a versioned packet validated against the exact ROM. Changes wait while the game is busy or paused. See [docs/native-localization.md](docs/native-localization.md) for coverage.

Native saves survive reloads, can be exported/imported, and migrate earlier Taichung prototype progress to the Station without replacing the party. Browser snapshots are isolated by ROM digest. Use native Save before exporting a backup or changing ROM revisions.

## Design input

The map and story chats own the next creative pass: broader neighborhoods and ordinary streets, recognizable landmark silhouettes, and fictional leaders with paired English/Traditional Chinese dialogue. Final teams, levels, progression and balance remain open. The three-district blockout is the working baseline for those additions.

Source reconstruction and emulator licenses do not grant publication rights to Pokémon's game content. Keep attribution and licenses for the emulator and dependencies with the browser build.
