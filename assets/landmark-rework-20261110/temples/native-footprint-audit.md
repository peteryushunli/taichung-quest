# Visit-landmark footprint audit

Native: `2362263510dfa38987c36b6cc40dca8d9372fc3c` at `/Users/peter/devday_hackathon/.claude/worktrees/native-gym-text-fixes-a79571/.worktrees/game-gym-text`.
Website: `757e90c55551ddbf74e260f181e5a085a9b97920`; its ROM metadata binds this native head. Read-only audit; no source edits.

| No. | ID | Native map | Origin | Cells | Door | Bank |
|---|---|---|---|---|---|---|
| 11 | wanhe-temple | [43, 15] | [27, 27] | [9, 7] | {'x': 31, 'y': 33, 'warpId': 0, 'elevation': 0} | TaichungNantun |
| 12 | wenchang-temple | [43, 15] | [18, 28] | [7, 6] | {'x': 21, 'y': 33, 'warpId': 1, 'elevation': 0} | TaichungNantun |
| 13 | botanical-garden | [43, 1] | [9, 26] | [13, 7] | none (outdoor scene) | TaichungGreenwayCmp |
| 14 | confucius-temple | [43, 18] | [30, 25] | [10, 9] | none (outdoor scene) | TaichungOldCityNorth |
| 15 | yizhong-street | [43, 18] | [30, 39] | [10, 8] | none (outdoor scene) | TaichungOldCityNorth |
| 16 | prefectural-hall | [43, 0] | [13, 36] | [10, 10] | none (outdoor scene) | TaichungOldCore |
| 17 | second-market | [43, 18] | [18, 25] | [7, 9] | none (outdoor scene) | TaichungOldCityNorth |
| 18 | cultural-heritage-park | [43, 15] | [65, 17] | [11, 18] | none (outdoor scene) | TaichungNantun |
| 19 | fengle-sculpture-park | [43, 15] | [65, 55] | [11, 9] | none (outdoor scene) | TaichungNantun |
| 20 | wenxin-forest-park | [43, 14] | [20, 24] | [12, 7] | none (outdoor scene) | TaichungNantunNorth |

Exact current collision and clear masks, map hashes, layer/behavior IDs, entrance/approach/arrival coordinates and bank counts are in `native-footprint-audit.json`. Secondary graphics have376 static slots; definitions384. Loaded sheet size and locally unused entries do not prove safe replacement capacity: connected-map donors, all bank consumers, animation and per-palette use must be retained.

Native paired-landmark contract holds10gyms+2temples. Eight outdoor scenes are registered in actual map words via newLandmarks plan, not extra gym/door entries.
Rect ends of plan newLandmarks are exclusive. The stored native collision/clear masks are actual per-cell state, not a proposed new collision mask.
Native contract world origin is used for masterplan transforms; frontend minimap shifts all world origins +5,+5. Do not mix them.
This audit binds the website checkout shown above; no deployment/live truth claimed. No native source files changed.

## Clear-space and display-crop clarification

Existing clear masks are reference geometry, not blanket hard reservations. The JSON separately lists actual door/approach/arrival and nearby event anchors. Website artRect crops add presentation context and are not replacement-footprint allocations.

| Bank | Append-only definition slots | Static graphics not referenced by any retained definition |
|---|---:|---:|
| gTileset_TaichungOldCore | 13 | 0 |
| gTileset_TaichungGreenwayCmp | 65 | 91 |
| gTileset_TaichungXitunFinal | 25 | 10 |
| gTileset_TaichungNantunNorth | 168 | 132 |
| gTileset_TaichungNantun | 168 | 132 |
| gTileset_TaichungOldCityNorth | 13 | 163 |

Counts retain every existing definition; they are not a full bank-packing or deployment proof. Replacing old art may reclaim exclusively used patterns/definitions after an all-consumer, seam, palette and save audit.
