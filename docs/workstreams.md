# Integration and isolated workstreams

The main session owns integration, source-patch export, the canonical ROM, public source publication, and Site releases. Feature workers edit only their assigned worktree and submit small commits for integration.

## Checkpoints

- Upstream game baseline: `ce6406d8c2eaf46d543c8a2606de0c3cb1951982`.
- Local game checkpoint: `1c8d243002fb4d36f2ef28e217e46f17235dff80` on `integration/taichung`.
- Parent project checkpoint: `b00ed77e901b8f75917dc8466785560bb74df86b` on `main`.
- Current compiled ROM: SHA-1 `8d0b2a311d40e14cfff035df28f9506e4801f569`, 16 MiB. Source commit and digests are emitted into the ignored ROM `build.json`.
- Preserved working English ROM: `artifacts/taichung-before-bilingual.gba`, SHA-1 `c73d860e373eb7255cddcea2c10c5e1a37886406`.

The English checkpoint passed actual browser checks for all four level-five starters, cancellation protection, native Save/Continue, free exploration without the tea errand, and a wild encounter. The bilingual checkpoint compiles and passed actual Chinese greeting/starter/menu rendering, bicycle mount/dismount, dynamic Get off labels, indoor riding rejection with restored controls, and switching native language while preserving party and position. The 24×28 map passes reachability, doors, NPC, and route validation. Runtime screenshots are preserved under ignored `artifacts/qa-native-*.jpg`.

## Worktree ownership

| Owner | Repository / branch | Workspace-relative path | Boundary |
| --- | --- | --- | --- |
| Main session | Parent `main`; game `integration/taichung` | Project root; `vendor/pokefirered` | Integrate reviewed commits, build/release, export the consolidated patch. |
| Localization agent | Game `feature/zh-tw` | `.worktrees/game-localization` | Chinese renderer, encoding, generated glyphs, native translations, startup language/starter scripts. |
| World/gameplay agent | Game `feature/world-gyms` | `.worktrees/game-world` | Map layout/collision and native bicycle/menu gameplay. Owns `src/start_menu.c`; coordinate language callback/labels with localization. |
| Web/guide agent | Parent `feature/web-guide` | `.worktrees/web-guide` | Browser player, City Map, interface translation, guide data and illustrations. No Site registration or publication calls. |

All three feature worktrees have been created and verified: both game worktrees start at `1c8d243`, and web/guide starts at `b00ed77`. All `.worktrees/` paths are ignored by the public source repository. The game repository's wholesale source/assets and local commits remain local; the public project contains the consolidated patch, original additions, pinned references, and build workflow.

Current bounded handoffs: localization verifies canonical regeneration and saved language persistence; world/gameplay verifies a fully isolated build and records map/bike contracts; web/guide verifies the bilingual companion map, pause/resume, and font attribution. Feature commits are reviewed and integrated by the main session before the release artifact is rebuilt.

## Build and handoff contract

Set `TAICHUNG_GAME_SOURCE` to the assigned absolute game worktree path when using the root helper scripts. Each game worktree builds into its own native build directory and `artifacts/worktrees/<path-hash>/` output namespace. Feature builds do not overwrite `web/public/roms/taichung-firered.gba`. Each web worktree installs its own dependencies and emits its own output directory.

Workers must not edit another checkout, share a writable vendor/build directory, export the central release patch, push wholesale game source, or publish the Site. Submit commit IDs plus validation and known limitations. The integration owner merges reviewed commits, reruns affected checks, rebuilds the canonical ROM, exports the patch against the pinned upstream baseline, and publishes the exact combined source state.

Shared identifiers: language variable `0x40FB` (1 English, 2 Traditional Chinese), starter-species variable `0x40FC`, optional tea-quest variable `0x40FD`; native menu IDs 65 (starters) and 66 (language). Landmark IDs live in `web/src/data/landmarks.json`; guide examples are not a finalized gym roster. Map IDs, door coordinates, trainer IDs, and completion flags for future gyms must be agreed before parallel implementation.
