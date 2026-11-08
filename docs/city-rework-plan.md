# City rework plan: borders, roads, water and Nantun North

Set on 8 November 2026, after the city batch went live (native `6366b9e`, ROM `9550aaff…`). The user asked for five things:

1. Highways are far too narrow.
2. Complete the border of the current four-district map.
3. Redo the whole road system. Xitun's roads look right and should be used everywhere, with a clear difference between urban streets and parks. Make the map bigger if needed.
4. Add things between Xitun and Nantun.
5. Better water: connected and functional, and better drawn.

This plan turns those into one shared kit and three district passes, then one integration with a new save version.

## What is there now

The world is 120×176 tiles. Each tile is 16 px.

| Map | Rect (x0, y0, x1, y1) | Size | Primary tileset | Secondary tileset | Outer edges today |
| --- | --- | --- | --- | --- | --- |
| Xitun `43:2` | 0, 0, 40, 64 | 40×64 | XitunPrivate | XitunFinal (359/384 defs, tiles full) | West and north: highway, 3 tiles wide. East above Greenway: trees. |
| Greenway `43:1` | 40, 32, 80, 104 | 40×72 | GreenwayPrivate | GreenwayCmp (288 defs, 256 tiles) | North, east above Old City, south east of Wanhe: trees. |
| Old City `43:0` | 80, 48, 120, 120 | 40×72 | OldCorePrimary | OldCore (371/384 defs, tiles full) | North, east, south, west below Greenway: trees. |
| Nantun North `43:14` | 0, 64, 40, 104 | 40×40 | GreenwayPrivate | NantunNorth (359/384) | West: highway. |
| Wanhe `43:15` | 0, 104, 64, 176 | 64×72 | GreenwayPrivate | Nantun (359/384) | West: highway. South: river. East: trees, river at the corner. |

Other facts that shape the plan:

- **The highway** is the edge kit (`tools/taichung/nantun/edge_art.py`): parapet, two lanes, median, two lanes, parapet, all inside 3 tiles (48 px). Against a 640 px wide map it reads as a grey stripe.
- **Roads.** Only Xitun has streets: asphalt with a dashed yellow centre line and crosswalks, drawn in its secondary bank (`tools/taichung/streetscape/xitun_streets.py`). Greenway, Old City and Nantun have pale paver paths only. Nantun North is a grid of paths around empty grass blocks.
- **Water** is FireRed's pond tiles from the primary (`0x1A0`–`0x1B2`), plain blue with the vanilla ripple. Old City has a 132-cell square lake. Wanhe has 595 cells: a river along the south edge and two canal pieces that do not join each other.
- **Every exterior uses only 53 primary metatile definitions** out of 640, but the primary tile graphics are not free: all three private primaries were rebuilt from General with 412 of 640 tiles replaced by relocated district art, and 228 slots are protected animation and General tiles. The three primaries have identical metatile definitions, attributes and palettes. Secondary tiles are full in Xitun and Old City. Secondary palettes are full everywhere (6 of 6).
- **Map size limit.** The game's map buffer holds `(width + 15) × (height + 14) ≤ 10,240` cells per map. So 40×72 (5,000) can grow a lot: 40×120 is 7,370, 48×96 is 6,930, 64×96 is 8,690, 72×96 is 9,570. The world canvas itself has no limit except the minimap contract, which we re-export.
- **Any change to walkable cells or coordinates needs a save version**, with relocation of saved positions and a one-time outdoor reload on Continue. v8 did this for three districts; v9 does it for all five.

## Decisions

### One shared city kit, in the primaries

Roads, highway and water must render identically across seams, because each map draws its neighbours' edge strips with its own tilesets. The edge kit solved this by living at the same IDs in every bank. The rework extends that idea: a **city kit** of highway, street and water metatiles installed at identical tile and metatile IDs in all three private primaries. Each primary has 587 unused metatile definitions, so definitions are not the constraint. Tile graphics are: the first task is an audit of which of the 640 primary tiles are referenced by any used metatile (primary or secondary) or protected by animation, in each of the three primaries, and which indices are free in all three. The kit must fit the common free set. If it does not, the fallback is the edge-kit pattern in each secondary at reserved slots, which is tighter (Xitun and Old City secondaries are full, so some unused relocated patterns would have to go).

### Highway: 6 tiles wide, grown outward

The west and north highway grows from 3 tiles to 6: verge or sound wall, three lanes, a barrier median, three lanes, verge. It should read as a freeway, not a street: no crosswalks, cars, an embankment or wall against the city side, and an overpass piece where a district street meets it so the city visibly passes under it. The extra 3 tiles come from **growing the maps outward**, not from eating content, so no existing building moves: Xitun, Nantun North and Wanhe gain 3 columns on the west, and Xitun gains 3 rows on the north. The highway also needs a corner piece and a straight piece that can run north–south along an inner edge.

### Border: a straight north edge, a river on the east and south

The outer edge today is stepped. Rather than bend the highway around each step, **Greenway and Old City extend north to y = 0**, so the whole north edge is one straight highway from x = 0 to x = 120 and both districts gain 32 and 48 rows of new city. (Greenway becomes 40×104 and Old City 40×120, both inside the buffer limit.) That is the "increase the scale" the user allowed, and it is where most of the new urban streets go.

East and south are river. One continuous watercourse: along Wanhe's south edge, up Wanhe's east edge, along Greenway's exposed south edge, down Old City's exposed west edge, along Old City's south edge, and up Old City's east edge to meet the highway at the north-east corner. River water stays impassable, including by Surf, as the edge kit's water already is. The two corners where highway meets river get a bridge-abutment piece. In real Taichung this ring is Freeway 1 on the west, Highway 74 on the north, the Fazi River on the south and Han Creek on the east. Those names go in the game only after the landmark-sources check, as before.

### Roads: Xitun's streets everywhere urban, pavers only in parks

Urban blocks get asphalt streets from the kit: straight, corner, T and cross junctions, crosswalks, and a curb-and-sidewalk edge so streets are not bare asphalt against grass. Streets are two tiles of asphalt plus one tile of sidewalk each side where there is room. Parks keep the pale pavers and grass: the Greenway corridor itself, Taichung Park, Maple Garden, the temple forecourts and Nantun's new park. The Greenway is a linear park with a street on each side, so Greenway's map becomes streets flanking a green spine instead of a green field.

### Water: real watercourses, drawn as rivers

The kit replaces the pond tiles with river and canal art: banks on every side and corner, a one-tile canal, a two-or-more-tile river, a road bridge and a path bridge, and an outflow where a canal joins the river. Water animates as flowing water, not pond ripple, using the protected animation slots the General kit already owns. Wanhe's two canal pieces become one canal that reaches the river. Old City gets Green River beside the station, running south to the boundary river. The Taichung Park lake stays a lake but gets the new banks. Water is not for Surf anywhere: the canals are channelled, and allowing Surf would open paths the save relocation cannot predict.

### Between Xitun and Nantun: fill Nantun North

Nantun North becomes a real neighbourhood: a planned housing grid on the Liming New Village pattern, and a park on the Wenxin Forest Park pattern, with streets that continue Xitun's grid south and tie into Wanhe's. Both are real Nantun places; whether either becomes a named landmark is decided after the sources check, and nothing in this pass adds a gym.

### Save v9

Every exterior changes, and three of them shift coordinates. Each map gets a shift rule (dx, dy) applied before the relocation table, and the tables are derived from the map deltas by the existing tooling, as `check_xitun_streets` already does. Continue reloads any outdoor district once for pre-v9 saves, as v8 did. Interiors are untouched. Party, bag, money and checkpoint are never touched.

## Sequence and owners

Native work branches from `6366b9e`, the live source. Integration happens on `claude/city-rework` in the maps session's worktree. Main still publishes.

| Phase | Owner | Branch | Done when |
| --- | --- | --- | --- |
| 1. City kit | Xitun session | `claude/city-kit` | Budget audit written; kit art drawn and installed at identical IDs in the three primaries by one tool with a guard; atlas sheet rendered; the guard passes on all five exteriors unchanged. |
| 2a. District layout drafts (parallel with 1) | Xitun, Nantun, Old City sessions | docs and PNGs only | Each district has a drafted plan: new size, street centrelines, park areas, water course, border treatment, new blocks. Rendered as a blockout so the user can react before any map.bin changes. |
| 2b. District application | same three sessions | `claude/xitun-rework`, `claude/nantun-rework`, `claude/oldcity-rework` | Maps rebuilt from the kit and the drafts, seams agreed with neighbours, district guards re-bound, static checks pass. |
| 3. Integration | Maps session | `claude/city-rework` | Merged, save v9 with shift rules and relocation tables, host suites, minimap contract, landing map and city guide re-exported, ROM built, static gates, runtime gates delegated, handed to Main. |

Greenway belongs to the Old City session in this plan because its north extension and flanking streets share Old City's grid, and because the Nantun session already has two maps.

## Open questions for the user

Each has a recommendation, and work proceeds on the recommendation unless told otherwise.

1. **Grow outward for the highway** (recommended) or take 3 columns from the existing maps?
2. ~~Extend Greenway and Old City north to a straight edge, or keep the stepped edge?~~ **Decided 8 November 2026: extend north.** Greenway becomes 40×104 and Old City 40×120, and the north highway runs straight from x = 0 to x = 120.
3. **No Surf on any water** (recommended) or allow Surf on the inner canals?
4. **Use the real road and river names in the game** (recommended, after sourcing) or leave them unnamed?
