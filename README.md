# Taichung Quest

Public source: <https://github.com/peteryushunli/taichung-quest>

A working Pokémon FireRed modification set around a compact, fictionalized version of Taichung's West District and Calligraphy Greenway. The game runs as a real Game Boy Advance ROM inside a browser emulator.

The first version uses FireRed's existing tiles and character art. Landmark placement, dialogue, and the opening quest are provisional so they can be revised after the first playable build.

The planned world is a condensed version of Taichung as a whole, with landmark gyms and habitat-based encounters. The Greenway is the first playable foundation; the larger city and custom gyms are not implemented yet. [docs/game-design.md](docs/game-design.md) records the current design decisions and open questions.

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

Choose Charmander, Bulbasaur, Squirtle, or Pikachu, then explore a small daytime Greenway neighborhood with a plaza, tea shop, and optional local errand. Changes to the game map must retain valid collisions, door warps, and NPC positions. English dialogue and Romanized place names fit the original game's font; Traditional Chinese needs a separate font and text-engine project.

## Design input

The most useful next decisions are three must-have landmarks, their relative positions, a time of day, and the player's opening objective. A rough sketch can be translated into tiles. Geographic distances will be compressed for a walkable game map.

Source reconstruction and emulator licenses do not grant publication rights to Pokémon's game content. Keep attribution and licenses for the emulator and dependencies with the browser build.
