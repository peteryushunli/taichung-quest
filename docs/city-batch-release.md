# City and gym batch: Xitun, Nantun, Old City and ten battles

This draft combines three map workstreams and the seven remaining gym implementations, with one combined save v8:

- **Xitun streets.** Xitun gets its street layout. Its west and north edges become a highway instead of a tree wall, and its southern seam opens into Nantun.
- **Nantun.** Two new outdoor maps: Nantun North (`43:14`) and Wanhe (`43:15`). It adds two temple halls, Wanhe Temple and Wenchang Temple. Nantun's west edge is the same highway, and its border is water. Twelve Greenway seam cells change from trees to pavers.
- **Old City buildings.** The city-v3 building styles go into Old City.
- **Ten gym battles.** Codex's seven new leaders join Station, Park and Miyahara. Their existing portraits, bilingual text and level-50 teams share the voluntary challenge and matching-real-win badge flow. Native trainer IDs746–752 use the existing completion bits3–9; the temples remain visits, without extra badges.

The world grows from 120×120 to 120×176 tiles. The in-game minimap, the landing-page map and the minimap contract all follow. The contract now has 5 exteriors, 13 interiors, 12 markers (ten gyms and two temples) and 12 seams.

Miyahara's street layout and unrelated opening/settings proposals are not included. The accepted compact tutorial uses an in-game dialogue frame with native A/B hints and retains the shipped touch-release fix. Game-screen text selection, long-press callouts and dragging are suppressed without consuming normal controls. The fresh-game opening restores the existing encounter-preference menu after language selection, before welcome text or partner selection; existing Continue saves keep their choices. PR6's completed gym code is consolidated here at source level; its older standalone patch is not used over the city release.

## Current combined draft build

Native `6366b9e5c037647ce4d2a007efa3d3dfbedcdb48` combines `dc92cf8` and `b7b027d`, preserving both histories, and includes the saved-facing review fix plus the restored fresh-game encounter setup. The full portable patch applies to the pinned baseline and produces the exact combined tree `5cdb840ddb710fea1dd81c24eaed512be5e452c5`.

The matching ROM SHA-256 is `9550aaff12089132384e82f244c3359b7c09a3fe57a43696610821f8e0c0a020` (SHA-1 `5fc45a510e69d7323b5b6bdf72399c6c403d1b24`). Fresh ELF extraction verifies language33813644, navigation33813680 and onboarding33813728; the minimap fingerprint remains `f52e2fee43b6fb0b928eeb9a5958bc9898fcb29577bbac3d7262a597ef8e09c0`. EWRAM261244 adds exactly8 transient bytes, leaving900 bytes free; IWRAM29824 is unchanged. The frozen ELF independently reproduces the ROM bytes.

All map/layout/tileset/art asset trees are exact to `dc92cf8`, apart from restoring the startup call in the shared Pallet script; the gym code, trainer parties and appended glyphs match the tested gym-only source. The existing landing-map PNG is retained because its render inputs are unchanged. All506 released glyph mappings/rows are preserved, with105 appended once, for611 total. Combined gym/progress/team/save-v8/preset checks and the map guards pass. This is build/source evidence, not combined runtime acceptance.

Evidence: `artifacts/pr8-codex-consolidation/startup-combined-source-verification.json` and `frozen-6366b9e/README.md`. The actual ROM bytecode calls the existing exploration menu, waits, then marks language ready; native onboarding and all nine encounter-setting combinations pass. Actual Science, Greenway, Shen Ji, Fine Arts, Fengjia and Maple win/save checks on the earlier gym-only ROM `88efa224…` support unchanged gym code, but do not establish acceptance of this combined ROM. Theater completion and combined smoke/save-v8 checks are pending.

The combined frontend passes50 tests, TypeScript and the production build with this exact ROM/metadata pair. These checks retain PR8's 120×176 geometry, landing map and existing controls. No production deployment is performed by this consolidation.

## Original map-only baseline build

| | |
| --- | --- |
| ROM SHA-256 | `5315de1e89b9d08d66e0dedf7115da7e700cc8e16ad32a81e9f58e8450eef452` |
| ROM SHA-1 | `f06959741abe42cf0203a87a3cbada02031e1693` |
| Native source | `dc92cf8617b78c74e372ee0bf35f8549d7fa6149` on `claude/release-city-batch`, from canonical `c8e1495` |
| Minimap fingerprint | `f52e2fee43b6fb0b928eeb9a5958bc9898fcb29577bbac3d7262a597ef8e09c0` |
| Bridges | navigation 33813680, language 33813644, onboarding 33813728 (unchanged) |
| EWRAM | 261,236 B, 908 B free (unchanged) |

The build reproduces byte for byte. Applying `patches/taichung.patch` to the pinned baseline `ce6406d` gives tree `ab33d02a913bd17d2c67a377547cc5f8d621445e`, which is the release tree.

Native history, first parent from `c8e1495`:

| Commit | What |
| --- | --- |
| `b20617f` | Merge Nantun `d55dddd` |
| `a844098` | Merge Old City buildings `b520191` |
| `4232134` | Minimap canvas 120×176, temple markers |
| `a90a432` | Merge Old City guard binding `7ea35cb` |
| `fdea88c` | Merge Xitun streets, highway edges and Nantun seam `ee00639` |
| `6a0d25e` | Release Nantun North's held highway rows 0–3 |
| `e059f34`, `8f1d580`, `65cb5ad` | One combined v8 refresh |
| `4b58fd2` | Merge Nantun's Greenway preview carry `73bd76e` |
| `4274477` | Re-export the minimap contract |
| `8615fe0` | Register Nantun in the district guards |
| `3ef021e` | Merge Old City `check_cmp` binding `86a909d` |
| `dc92cf8` | Merge Xitun guards and the combined v8 save profile `e73f3c4` |

## Save v8

`0x40F7` goes from 7 to 8. On Continue, a save older than v8 that stands outdoors in Old City, Greenway or Xitun reloads that district once, so its cached view matches the new map. Greenway is included because Nantun turns twelve of its seam cells from trees into pavers. A stale view would block the way into Nantun.

Xitun positions on newly solid tiles move to the nearest valid tile. The v8 table chains after the existing v4 and v7 repairs and covers 353 positions for v1 to v7. Party, bag, money and checkpoint are not touched.

## Static gates

All pass on `dc92cf8`:

- `check_cmp`, `check_old_core`, `check_greenway_science`, `check_xitun_final`, `check_xitun_streets`, `check_nantun`, `build_nantun --check`, `check_library`, `check_welcome_bindings`, Old City buildings check
- `export_minimap --check`, `validate_city` (12 paired landmark rooms, 56 directed seam cells)
- Host suites: save, progress, starter, team, exploration

`check_station` and `check_theater` fail here and on canonical `c8e1495` too. Their pins predate earlier releases, so they are not new failures.

Web: TypeScript and 45 web tests pass. `prepare-vercel.mjs` binds frontend `c3f1366` to this ROM with a clean tree.

## Original map-only runtime evidence

The following runs used the original map-only `5315de1e…` ROM, not the combined candidate above. They used the ordinary button API and the read-only navigation packet. Every save came from real play, every load used the title-menu Continue, and every save was a native in-game Save. There were no RAM writes, emulator snapshots or speed changes. The evidence supports unchanged map behavior; combined runtime acceptance remains separate.

### Xitun: 7 of 7 pass, plus one extra case

Evidence: `artifacts/release-city-batch-runtime/xitun/` (README, manifest of 66 files, contact sheet, traces, saves, comparisons).

1. **v7 save on a now-solid tile.** A v7 save at (31,30) lands on (31,32), the matching table row. After a native Save it is v8. Only `0x40F7` changes (7 to 8). Party, heal checkpoint, money, coins, registered item, PC items and bag are identical. The saved view matches the final map in 210 of 210 cells.
2. **v6 save at (12,35).** Holds its position and saves as v8. Same protected-state comparison.
3. **Landmark doors.** Fengjia, Maple Garden and Theater each go in and back out to the exact approach tile.
4. **Greenway seam.** Crossed both ways, on foot and by bike.
5. **Highway edges.** The west edge blocks at five probes and the north edge at two, on foot and by bike. The corner blocks Up and Left. A control step moves.
6. **Nantun seam.** Crossed both ways, on foot and by bike. The highway runs straight across the seam.
7. **Save, reset, Continue.** Saved at (27,60), reset with A+B+Start+Select. Continue lands on the same tile, facing the same way, and walking resumes.

Extra case: a v7 save on the old x=2 path, which is now highway, lands on (3,30) with Left blocked.

Seen during the run, none of them gate failures:

- On a Chinese-language v6 save, the title Continue panel mixes Chinese and English. The live ROM shows the same panel for the same save.
- West of the highway at the Nantun seam, Xitun shows forest and Nantun North shows water. This follows the choice to keep Xitun's border as trees.
- The north carriageway meets the west highway with no junction art. Fengjia and Theater Roads stop at the highway shoulder.
- A save migrated from v7 while riding loads on foot, as in the earlier Xitun acceptance.

### Nantun: 6 of 6 pass, plus a note on encounters

Evidence: `artifacts/release-city-batch-runtime/nantun/` (README, manifest, 118 files).

1. **Greenway refresh.** A v7 save made on the live ROM at Greenway (2,51), facing the old trees, continues on the release ROM with those cells already drawn as pavers. Saving at once passes the strict comparison: only `0x40F7` changes. The player then walks through without a map reload and crosses into Nantun North.
2. **Seams.** 16 crossings, both ways, on foot and by bike: Xitun–North, North–Greenway, North–Wanhe (two places) and Wanhe–Greenway. All land on the expected map and tile. On foot, the views from both sides of North–Greenway and Xitun–North match cell for cell.
3. **Temples.** In both halls, the door leads in, the host speaks all three pages, the centre mat leads back out, and both signs display.
4. **Edges.** 15 of 15 probes block: Wanhe's west highway, North's highway (including the released rows), the river edge, the levee bridge and both south corners.
5. **Preview carry.** Nantun North's view of Greenway matches Greenway's own rendering in every cell the camera reaches. Three cells are out of camera reach. They are covered by `check_old_core`'s preview strips (3,803 cells, 0 mismatches).
6. **Save, reset, Continue in Wanhe.** Saved at (21,36), reset, and Continue lands on the same tile with a byte-identical screenshot.

Note: Nantun has no wild encounter table, so its tall grass starts no battles. 37 grass steps were checked.

### Old City: 6 of 6 pass

Evidence: `artifacts/release-city-batch-runtime/oldcity/` (README, manifest).

1. **v7 save made on the live ROM** next to a replaced building. Continue shows the new walk-up at once, with no stale art. Saving without moving writes v8, and only `0x40F7` changes (7 to 8).
2. **Real v6 save at (28,54).** Holds its position, shows the new buildings, and saves as v8. Only `0x40F7` changes (6 to 8).
3. **All 19 buildings.** 20 wall probes all block. Nothing clips.
4. **Doors.** Park, Station and Miyahara return to their approach tiles. Miyahara's challenge offer still appears.
5. **Greenway seam.** Crossed both ways, on foot and by bike.
6. **Save, reset, Continue.** Lands on the saved tile, facing the saved direction.

Gates 1 and 3–6 ran as one session: 110 recorded operations, none failed.

### Known issues found during the runs

None blocks a gate.

- **Temple and gym side exits.** In every hall on the shared landmark layout (all 12, gyms included), the side exit tiles at (5,14) and (7,14) do nothing. Only the centre mat leads out. This is older than this release.
- **Facing after the refresh (source fix included).** The original map-only ROM faces down after a pre-v8 cache refresh. The combined source now preserves the saved direction only for same-position cache refreshes, retaining pending-warp and repaired-position arrival rules. Twenty compiled native engine-path cases pass; removing the hook reproduces the bug. Actual combined-ROM Continue remains a release gate.
- **Nantun has one location name,** so crossing between North and Wanhe shows no banner.
- **Painted doors.** The new Old City buildings have front doors that look enterable but are not.
- **Mixed styles at Old City's west edge.** Columns x0–7 keep the original buildings because Greenway borrows those cells, so the old and new styles sit side by side there.

Comparisons that report FAIL in the evidence (`compare-gate6-save.json`, `compare-live-source.json`, `compare-fixture-vs-wanhe-save.json`) compare saves made after walking. Step counters and friendship moved, as expected. The clean comparisons, saved without moving, all pass.

## Not covered

- Physical phones.
- Surf on Nantun's river. The test party could not Surf. Collision blocks it in source.
- Real saves from v5 or older. These are covered by the host save suite only.
- Battles. No gym or wild battle was started on this ROM.
- Gameplay in the production web client. The runtime gates used the QA page. On the release build of the web client, I checked that the play page loads this ROM with no console errors and that the minimap is sized to the new world.
- The original map-only frontend omitted Nantun/temple guide coverage. The current source fixes that: five contract shapes, four districts, twelve stops and ten badge stamps. Responsive appearance remains to be checked in the combined client.

## Consolidation and pending review followups

The clean native merge retains Claude's map/save-v8 work and all ten gym registrations. Main regenerated one patch from that combined source and rebuilt its matching ROM/metadata; it did not replace the map patch with PR6's older export. The draft also includes the bilingual ten-gym web catalog, all accepted leader portraits and exact team icons.

Both source-level review fixes are now included: the full City Map/catalog follows the contract with visit-only temples, and a guarded8-byte one-shot handoff preserves cache-only saved facing. The source guard binds the reviewed save/header/overworld bytes; pending native warps and position repairs retain priority. Keep PR8 in draft, distinguish evidence by exact ROM, and complete combined runtime checks before production publication. Main owns non-force updates to this existing PR head; concurrent author commits must be reconciled rather than overwritten.
