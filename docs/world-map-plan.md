# Translating real Taichung into the FireRed world

The user accepted the ten retained landmarks and Old Taichung Station plaza as the start. This document proposes an implementation structure for the compressed world. District sizes, tile coordinates, footprints, and connections below are engineering/design starting points, not final artwork or user-approved pixel layouts.

## Transformation

Use sourced real coordinates to establish approximate north/south/east/west relationships, proximity, and district groupings. Then author a compact tile world that gives every landmark enough room for its silhouette, entrance, NPC interactions, and paths. Map real streets into a small set of readable avenues and links; compress the intervening ordinary city blocks aggressively.

This is not a uniform geometric scale. The station and Miyahara are close in reality, but even simplified buildings need separate tile footprints. Expand dense landmark clusters enough to fit buildings and footpaths while shrinking the longer journeys between clusters. Retain both real coordinates and game coordinates under stable landmark IDs so the visitor guide remains geographically accurate.

## Proposed three connected districts

These are gameplay regions, not literal administrative-district boundaries.

| Game district | Included landmarks | Initial outdoor size | Suggested stitched-world origin |
| --- | --- | --- | --- |
| Xitun / western district | Fengjia Night Market, Maple Garden, National Taichung Theater | 40 × 64 metatiles | (0, 0) |
| Greenway / cultural district | Science Museum, Greenway/Civic Square, Shen Ji New Village, Fine Arts Museum | 40 × 72 metatiles | (40, 32) |
| Old city / arrival district | Taichung Park, Miyahara, Old Station | 40 × 72 metatiles | (80, 48) |

The offset arrangement keeps the western landmarks generally northwest of the arrival district and permits real side-to-side map connections. These outdoor sizes are ordinary-city scale relative to the local source's Viridian 48×40, Celadon 60×40, and Saffron 66×55 maps. They are proposed starting budgets, not the engine's maximum sizes.

Connect Xitun's east edge to the Greenway's west edge over their shared world-space Y range. Connect the Greenway's east edge to the old city's west edge over their shared Y range. Use two streets across the latter seam if needed to provide a loop instead of a single forced corridor. Both directions of every connection must agree on offsets. Buildings receive separate interior maps through door warps.

## Coarse landmark anchors

Suggested coordinates below are **local to the proposed district**, and represent a public-facing entrance or approach anchor. They are not real GPS coordinates. The map owner can adjust them during the first layout pass.

| Landmark | District | Proposed local anchor (x, y) |
| --- | --- | --- |
| Fengjia Night Market | Xitun | (24, 12) |
| Maple Garden | Xitun | (12, 32) |
| National Taichung Theater | Xitun | (12, 44) |
| Science Museum | Greenway | (24, 20) |
| Greenway / Civic Square | Greenway | (22, 36) |
| Shen Ji New Village | Greenway | (10, 44) |
| Fine Arts Museum | Greenway | (10, 62) |
| Taichung Park | Old city | (32, 30) |
| Miyahara | Old city | (20, 52) |
| Old Station | Old city | (32, 64) |

Place the player's new-game spawn on clear paving just outside the station, near but not on the doorway/arrival anchor. Reserve a nearby fictional welcome-guide interaction and return/healing location. Leave safe drop-off coordinates for the later ride-hailing feature. Ensure that a landmark anchor never forces its whole building footprint outside the district.

## Build sequence

1. **Playable skeleton:** ground, paths, rectangular placeholder landmarks, ponds/grass habitat zones, collision, district connections, doors, and station spawn. Every landmark must be reachable on foot before custom art is required.
2. **Map and event data:** create or repurpose compatible source maps, update layouts and metatile grids, register map IDs, pair door/return warps, and place named NPC/sign/script events. Preserve stable content IDs and saved starter/progression variables.
3. **Starter and travel integration:** move the brief opening to the station, preserve the four-choice starter flow and one-time grant, enable immediate cycling, and verify healing/respawn. Existing prototype saves need an explicit migration policy if their coordinates or maps change.
4. **Distinctive art:** replace placeholder façades and props without changing agreed door anchors or collision footprints where practical. Regional tilesets allow the market/modern district, cultural district, and old city to look distinct. The source uses primary and secondary tilesets per map, so art work must follow a region-level tile/palette budget.
5. **Gym and habitat content:** implement one complete gym pattern, then repeat it for the selected landmarks. Add encounter tables by habitat after species allocation is chosen. Keep routine travel lanes convenient to cycle through rather than making every street an encounter strip.
6. **Compile and playtest:** compile the actual ROM and run it in the browser. Check walking, cycling, doors and return exits, starter choice, all landmark approaches, healing, saves/Continue, and map/guide consistency.

Porymap provides map-tile editing, collision editing, events, connections, new-map creation, and tileset editing. A source generator can produce repeatable initial grids and metadata; Porymap can then support visual adjustments. Do not rerun `scripts/apply-taichung-map.py` over the current source: that earlier prototype generator intentionally rewrites files from its original baseline. A new city generator or source patch must preserve subsequent opening, bike, localization, and integration work.

## Ten landmark gyms

The roster now has ten featured landmarks, and the user's rule is one fictional gym per featured landmark. The base FireRed trainer card explicitly renders only eight vanilla badge flags. Plan ten named gym-completion records and a suitable progress display rather than silently dropping two gyms or treating all ten as native Kanto badge slots. Gym rosters and exact reward/display design remain open.

## Parallel ownership

After an initial anchor/footprint agreement, one map owner per district can build its outdoor geometry independently. Art work follows those footprints, script work follows stable event/door/landmark IDs, and the web guide follows the same landmark catalog with separate real and game coordinates. One integration owner registers IDs, resolves shared tileset/header changes, assembles the districts, and publishes verified builds.

## Technical references

- [Porymap: map tiles, layouts, and tilesets](https://huderlem.github.io/porymap/manual/editing-map-tiles.html)
- [Porymap: seamless map connections](https://huderlem.github.io/porymap/manual/editing-map-connections.html)
- [Porymap: object events and door warps](https://huderlem.github.io/porymap/manual/editing-map-events.html)
- Local FireRed source: `data/layouts/layouts.json`, `data/maps/*/map.json`, `src/fieldmap.c`, `include/constants/flags.h`, and `src/trainer_card.c`.
