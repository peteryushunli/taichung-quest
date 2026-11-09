# City rework: raised freeway, streets everywhere, a bigger Taichung

This batch follows PR 9 (`9c32da1`, native `2c48f28`, save v9) and ships the
city rework set out in [city-rework-plan.md](city-rework-plan.md). It uses native
source `a2f2afaeaebd0fd5a30c4547bed8a0df5dac00fd`. Its matching 16 MiB cartridge
has SHA-256 `be7d154c336eab69d16df64b43c686be9564726d5501c5c89f448007bb9af92d`
(SHA-1 `f7f8f768e708e5043bb085889c9dff740858b7f4`). The portable patch applies
to pinned upstream `ce6406d8` and reproduces native tree `a7b84692528e7064dcbac6039ce4e47e300fc42b` exactly.

## Player-visible changes

- **A bigger city.** The outdoor world grows from 120×176 to 129×181 tiles, now
  six exteriors:

  | Map | Size | World origin |
  | --- | --- | --- |
  | Xitun `43:2` | 45×69 | 0, 0 |
  | Greenway `43:1` | 40×109 | 45, 0 |
  | Old City North `43:18` (new) | 44×53 | 85, 0 |
  | Old City `43:0` | 44×77 | 85, 53 |
  | Nantun North `43:14` | 45×40 | 0, 69 |
  | Nantun Wanhe `43:15` | 85×72 | 0, 109 |

  Greenway and Old City North reach the north edge, so the north side is one
  straight line. Wanhe grows east into the notch below Greenway, giving new
  Greenway–Wanhe and Wanhe–Old City seams.
- **A raised freeway.** Freeway 1 (west) and Highway 74 (north) run six tiles
  wide outside a two-tile retaining wall, with an overpass at the north-west
  corner. Rivers close the east and south edges. No street runs into the
  freeway or a river: dead ends stop one tile short behind bollards, and walks
  beside water have railings.
- **One street system.** Xitun's asphalt streets with sidewalks, crosswalks
  and junctions now run through every urban district. Parks keep paver paths,
  with trees in rows and tall grass, and every door connects to a path.
- **Nantun North is filled.** Liming New Village housing sits north of Gongyi
  Rd, and Wenxin Forest Park sits south of it. The Wanhe canal has one street
  (east bank) and a railed walk on the west bank.
- **Eight new set pieces** with signs and no gyms: Botanical Garden (Greenway),
  Confucius Temple, Yizhong Street and Second Market (Old City North),
  Prefectural Hall (Old City), Wenxin Forest Park (Nantun North), and Cultural
  Heritage Park and Fengle Sculpture Park (Wanhe). Street and river signs name
  Gongyi Rd, Liming Rd, Huiwen S St, Fazi River, Han Creek and Green River.
- **Gyms.** All ten keep their interiors, trainers and rewards. Three doors
  moved relative to their map: Miyahara `(20,52)→(20,51)` in Old City, and
  Shen Ji `(10,44)→(11,81)` and Fine Arts `(10,62)→(13,99)` in Greenway (moved
  east, out of the strip Nantun North draws with its own tiles). The other doors
  move only with their map's shift.
- **Park encounters.** Tall grass on all five original exteriors has a small
  table (rate 12, levels 2–5).
- **Seam fix.** On a side with two neighbours, the engine sent the first cell of
  the second neighbour into the first one (`IsCoordInIncomingConnectingMap` used
  `coord <= srcMax`). The bound is now exclusive. Before the rework no Taichung
  side had two walkable neighbours, so this only matters for the new seams.
- **Web.** The minimap and the landing-page city map use the 129×181 world,
  with freeway labels and Old City North (舊城北段). Gym markers and the city
  guide follow the moved doors.

## Save v10

Older saves (v9 and earlier) are repaired once on Continue, after the older
repairs. An explicit outdoor position moves with its map's shift, so the player
stays on the same world tile. A cell the rework closed moves to the nearest open
cell that is reachable from the Old City station and is neither a door nor tall
grass, from tables generated against the released v9 maps. A position saved as
a door (warp id) resolves through the map's warp list, so it follows a moved
door. The five original exteriors reload their cache once. Party, bag, money,
badges, flags and preferences are untouched.

| Map | Shift | Repaired cells |
| --- | --- | --- |
| Xitun | +5, +5 | 396 |
| Greenway | 0, +37 | 337 |
| Old City | 0, 0 | 475 |
| Nantun North | +5, 0 | 309 |
| Nantun Wanhe | +5, 0 | 816 |

The escape warp used by the indoor region-map marker is not migrated; it only
changes which square the indoor map highlights.

## Validation and provenance

- **Runtime, on the release cartridge.** Three district sessions played it
  with normal buttons only. Positions came from the read-only navigation
  packet, with no RAM writes or teleports. Every save used the in-game menu,
  and every Continue went through the title.
  - Nantun North and Wanhe: 25/25 seam crossings and 38/38 walks on foot,
    14/14 and 14/14 by bike. This covers every seam both ways, the three
    two-neighbour boundary cells, the freeway and river edges, the canal-walk
    railings and the bridges. Also: North's drawing of the moved Shen Ji and
    Fine Arts matches Greenway's (0 differing cells), both temples' signs,
    doors and hosts work, and Wanhe grass encounters fire.
  - Greenway, Old City North and Old City: a new game reaches the station and
    saves v10. All seven district doors enter and exit, including the three
    moved ones. Seams, the freeway wall and the east river were checked on foot
    and by bike, and a whiteout respawns at the station with the heal.
  - Xitun: the wall, kerbs and seams were checked on foot and by bike, with the
    Maple Garden, Fengjia and Theater doors and the Maple art.
  - Save v10, from eleven genuine v9 saves made on the live `89d22931…`
    cartridge:
    - Pure shifts and table repairs land as generated. Saves inside the
      Maple, Shen Ji and Fine Arts gyms exit at those gyms' current doors.
    - Only the save-version variable changes (9→10). Party slots, bag, money,
      coins, PC items, flags, badges and the heal checkpoint compare
      unchanged.
    - A later Reset and Continue does not move the player again.
- **Seam fix.** Nantun found the two-neighbour misroute on an earlier build of
  this tree, `4174821a…`, which had the same maps. The engine fix rebuilt only
  `fieldmap.c`. `git diff 6587b2f a2f2afa -- data` is empty, so the map, door
  and save passes on that build carry over. The boundary cells and the crossings
  on those three sides were re-run on `be7d154c…`. The stray blocked cells that
  the misroute left in Wanhe until a Reset no longer appear.
- **Source guards.** On `a2f2afa`, every map, landmark, kit, collision, CMP,
  Nantun, Old City, Xitun-street, encounter and minimap guard passes, and so does
  each guard's self-test (its corruption probes are rejected). This includes:
  - `validate_city`: 340 directed seam cells and 41 seam wall bumps.
  - `save_v10.py`: the tables match the record.
  - The new `check_connection_boundaries.py`: 381 walkable edge cells, 0
    misrouted. Under the old bound it finds exactly the three cells.
  - The host suites: 145,438 compiled warp/avatar cases, and v10 facing on
    every released cell from v1–v9: kept on 12,195 pure-shift cells, South on
    the 2,333 repaired ones. The progress, gym, starter, team and Continue
    suites also pass.
  The guards that pin older bases read beneath each registered layer (Old City,
  Xitun and Nantun rework, kit, collision, save v10). Only the CMP v9 profile
  needed a re-pin.
- **Web.** 50 unit tests, the TypeScript check and the production build
  pass. `verify-cartridge` accepts `be7d154c…`. The minimap contract in `web/`
  matches the native export byte for byte.
- **Build.** A clean build reproduces the cartridge. The patch applies to
  `ce6406d8` and reproduces the native tree.

Known and unchanged: `check_station.py` (still written for a 40-wide Old City)
and `check_theater.py` fail identically on the released `2c48f28`. Both need
re-binding to the reworked maps. A save made on the bike continues on foot,
as any warp does. The escape warp is not shifted; only Escape Rope or Dig from
a cave read it, and the next cave entry overwrites it.

Local evidence: `artifacts/city-rework/release/` (cartridge, save-v10 record),
`artifacts/downloads/cr-xitun-runtime/`, `artifacts/downloads/cr10-*`,
`cr10b-*`, `nantun-v10-*` and `nantun-v10-be7d-*` in Main's workspace. Browser
coverage is desktop Chrome in the QA harness. It does not claim a physical
phone run.
