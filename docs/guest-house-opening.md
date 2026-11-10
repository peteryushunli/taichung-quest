# Guest house opening, radar minimap and no waterway signs

This change answers three gameplay notes from 2026-11-10.

- The story began in what looked like Old Station, then the Old Station gym was a different room.
- The minimap was too detailed and zoomed in.
- Creek and river signs were still in the city.

Native work is commit 9cb6855 on `claude/story-minimap-signs`, over native 09534a8. It is not pushed. `patches/taichung.patch` is exported from that commit. The test cartridge is `a42272cc…` (16,777,216 bytes). The navigation bridge address and the minimap geometry fingerprint are unchanged.

## The new opening

A new game now wakes in a bedroom laid out like FireRed's player's house. These are two new Taichung maps, 43:19 `TaichungGuestHouse_1F` and 43:20 `TaichungGuestHouse_2F`. They use the original Pallet Town house layouts, warps and furniture spots.

1. Upstairs, the player picks a language and an exploration pace. Xiaoyu then calls from downstairs.
2. Downstairs, Xiaoyu greets the player at the stairs. She welcomes them to her guest house, gives the original city welcome and offers the four starters. Then she walks out of the front door.
3. The mat leads out to Old City through the small red-roofed house just west of the station canal. Its painted door, at Old City (20,67), is now a working door.
4. Xiaoyu waits beside the door at (21,68), and the quick tips start there. Talking to her again heals the team. Her line now points to Old Station to the east and Miyahara up the street.

The old station welcome room is retired but kept, so old saves still load:

- A save waiting there for its partner restarts in the guest house bedroom.
- A save that already has a partner steps out of the guest house door.

Saves anywhere else keep their position. Inside the house, the bedroom has a console, a laptop and a city map poster, and downstairs there is a TV. Every line is in English and Traditional Chinese. The text lives in `src/taichung_guest_house.c`, so the protected language table `src/taichung_language.c` is unchanged.

## Waterway signs

The GREEN RIVER and HAN CREEK signs in Old City and the FAZI RIVER sign in Wanhe are gone. The Han Creek and Fazi River signposts are redrawn as the pavement next to them. The Green River sign had no post, since the Prefectural Hall art covers that spot. All the remaining signs name gyms or landmarks.

## Radar minimap

The live minimap is now a round, north-up radar in the style of GTA 3. It shows tan land, dark roads and blue water, with no building detail.

- Gyms are red squares that stay on the rim when they are out of range.
- Other landmarks are yellow dots, shown only in range.
- A purple house marks the guest house door.

The radar hides inside every building, including the guest house, and during dialogue. `docs/website-landmarks-and-minimap.md` has the details.

The city render (`web/src/assets/landing/city-map.png`) and the radar art are redrawn from the new native tree. Exactly two cells change: the two removed signposts.

## Guards

`tools/taichung/home_start.py` is the registered layer for this change.

- It re-derives the door, warp, guide move and sign removals from base bytes. It pins the opening's scripts, text and new maps by hash.
- It proves no cell becomes newly blocked, so no save needs a repair.
- It proves Xiaoyu stands on a square that no older save repair can send a player to.
- The base copies ship in `data/taichung/home-start/baseline`, so the check needs no native git history. Its self-test catches 11 corruption probes.

The older guards read beneath the new layer:

- `approved_art_guard.py` peels this layer first, and its historical view hides the new maps.
- The save-v11 generator (`tools/taichung_gameplay/generate-approved-art-save.py`) validates against the same "beneath" view.
- `data/taichung/minimap-contract.json` takes three refreshed source hashes, and its web copy matches.

## Checks

These pass on the final source:

- `home_start.py --self-test`
- `approved_art_guard.py --self-test`
- `approved_art_guard.py --historical all --self-test`: all eight suites
- `validate_city.py`, `check_connection_boundaries.py`, `rooms/check_welcome_bindings.py` and `export_minimap.py --check`
- The native host tests: onboarding, save, save-v11, save facing, starter, player text, progress, team, exploration, landmark gyms, badge rewards, badge scenes and landmark history
- The Chinese glyph test
- `npm run check`, and `npm test` with 56/56 passing

The patch applies cleanly to the pinned baseline, and both portable guards pass on the patched tree. `audit-quest-log-player-text.py` and the two gym-staff tests already failed on 09534a8, and they still fail at the same place.

The game was played headlessly on cartridge `a42272cc…`.

- **English and Chinese.** A new game ran from the bedroom, down the stairs, through the starter, out the door, through the tips and to Xiaoyu's line. Walking back in shows an empty house, with no repeated scene.
- **Web player.** In the local web player, the radar stayed hidden in the house and during the tips. It appeared outdoors with the home blip just north of the player at the door.

Not checked: an in-game save and Continue from inside the house, and a real pre-change save that was still in the welcome room.
