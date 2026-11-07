# Integration and isolated workstreams

The main session owns integration, source-patch export, the canonical ROM, public source publication, and Site releases. Feature workers edit only their assigned worktree and submit small commits for integration.

## Checkpoints

- Upstream game baseline: `ce6406d8c2eaf46d543c8a2606de0c3cb1951982`.
- Integrated native source: `a1ff057980cf3480b5552ffbbc6ea4a3beaac9c6` on `integration/taichung`.
- Browser guide checkpoint: `922fcdab327c9eb98f8a99dc59d15d755d6a39fa` (merged into parent `main`).
- Combined ROM: SHA-1 `ae0ada352b1cd0b0d281c09fdde42a95446c9b4f`, 16 MiB. Exact source commit, SHA-256 and bridge symbol address are in ignored `build.json`.
- Preserved working English ROM: `artifacts/taichung-before-bilingual.gba`, SHA-1 `c73d860e373eb7255cddcea2c10c5e1a37886406`.

The English checkpoint passed actual browser checks for all four level-five starters, cancellation protection, native Save/Continue, free exploration without the tea errand, and a wild encounter. The bilingual checkpoint compiles and passed actual Chinese greeting/starter/menu rendering, bicycle mount/dismount, dynamic Get off labels, indoor riding rejection with restored controls, and switching native language while preserving party and position. The 24×28 map passes reachability, doors, NPC, and route validation. Runtime screenshots are preserved under ignored `artifacts/qa-native-*.jpg`.

## Worktree ownership

| Owner | Repository / branch | Workspace-relative path | Boundary |
| --- | --- | --- | --- |
| Main session | Parent `main`; game `integration/taichung` | Project root; `vendor/pokefirered` | Integrate reviewed commits, build/release, export the consolidated patch. |
| Localization agent | Game `feature/zh-tw` | `.worktrees/game-localization` | Chinese renderer, encoding, generated glyphs, native translations, startup language/starter scripts. |
| Gameplay agent | Game `feature/world-gyms` | `.worktrees/game-world` | Trainer/gym battle mechanisms, encounters, ten-landmark progression and transport. Owns `src/start_menu.c`; no exterior/room geometry edits. |
| Interface and controls chat | Parent `feature/web-guide` | `.worktrees/web-guide` | Sole web/UI writer after checkpoint `6f42ebc`; desktop/mobile controls, bilingual interface and Vercel preparation. Main retains integration and Site publication. Previous subagent is frozen. |
| Landmarks chat / mapping owner | Game `feature/city-map` | `.worktrees/game-mapping` | Actual district grids, landmark blockouts, paths/collision, connections, room geometry/warps, and arrival/drop-off anchors. |
| Story and characters chat | Shared local content only | `content/story/`; optional `assets/story/` | Bilingual narrative/cast proposals and structured dialogue; no engine, map, browser, font or shared Git mutations. |

The first three feature worktrees were created and verified at the checkpoints above. The user then promoted the existing Landmarks chat to the mapping implementation owner; its fourth feature worktree starts at `ee75ad0` and must not be duplicated. All `.worktrees/` paths are ignored by the public source repository. The game repository's wholesale source/assets and local commits remain local; the public project contains the consolidated patch, original additions, pinned references, and build workflow.

Current integration includes the verified native/browser language bridge, ten-name City Pass, real Station challenge, independent exploration preferences, authored park encounter table, three connected outdoor districts and ten landmark halls. The browser guide has ten bilingual cards and a tested fresh-runtime restart/import flow. Final recovery/preference checks and private hosting are release-owner work. Mapping is preparing the next broader-neighborhood and custom-art pass separately; story content is authored for later reviewed integration.

The integrated start is Old Taichung Station plaza. The mapper's source-owned `docs/taichung-city-contract.json` defines `MAP_TAICHUNG_OLD_CITY`, `MAP_TAICHUNG_GREENWAY`, and `MAP_TAICHUNG_XITUN`, ten room IDs and safe drop-off anchors. Main owns canonical spawn/healing wiring. The full bike loop and Station/Theater doors have native runtime proof; all ten doors pass static validation. Only the Station currently has an implemented gym battle.

## Build and handoff contract

Set `TAICHUNG_GAME_SOURCE` to the assigned absolute game worktree path when using the root helper scripts. Each game worktree builds into its own native build directory and `artifacts/worktrees/<path-hash>/` output namespace. Feature builds do not overwrite `web/public/roms/taichung-firered.gba`. Each web worktree installs its own dependencies and emits its own output directory.

Workers must not edit another checkout, share a writable vendor/build directory, export the central release patch, push wholesale game source, or publish the Site. Submit commit IDs plus validation and known limitations. The integration owner merges reviewed commits, reruns affected checks, rebuilds the canonical ROM, exports the patch against the pinned upstream baseline, and publishes the exact combined source state.

Shared saved variables: `40F7` save version, `40F8` wild mode, `40F9` trainer-sight mode, `40FA` ten-gym bitmask, `40FB` language (1 English, 2 Traditional Chinese), `40FC` starter species and `40FD` legacy optional tea state. Native menu IDs 65 and 66 remain starters/language. Stable landmark IDs and exact map/arrival references are shared by the native contract and `web/src/data/landmarks.json`; gym completion follows actual native battle outcomes.
