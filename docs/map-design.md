# Taichung Greenway prototype

The source of truth is `docs/game-design.md`: the final world is a shrunken Taichung with recognizable landmark gyms, fictional leaders, and environment-appropriate wild Pokémon. West District / Calligraphy Greenway is the first playable foundation within that larger world. This neighborhood uses FireRed's original artwork while establishing the map, starter selection, interaction, save, and battle workflow.

![Prototype source-map overview](taichung-map.png)

The image is rendered directly from the modified Game Boy Advance tile data. It omits NPC sprites and map-edge scrolling. The browser runs the actual compiled game in an emulator.

## What is playable

A new game skips the original movie/title delay and Oak's naming/tutorial sequence. A brief Taichung greeting leads to a native ROM menu with four choices, in this exact order: **Charmander, Bulbasaur, Squirtle, Pikachu**. The selected Pokémon is granted at level 5, exactly once. B cannot dismiss the menu, and an invalid result reopens it. The player then explores as WALKER from the plaza, with five Poké Balls and three Potions. Running, the Pokémon menu, the Pokédex menu, and saving are enabled. The guest-house host can heal the party. Level, supplies, and default player name are implementation defaults; the four species are a fixed design requirement.

The tea-delivery errand is optional. A vendor asks the player to carry tea to the Greenway guide; accepting, declining, or ignoring that request never gates movement, battles, or catching. The guide gives one Potion on delivery, and saved quest progress prevents repeat rewards. The north exit reaches the original Route 1 tall grass for real Pokémon battles and catching. The final Taichung habitat/species allocation and landmark gyms have not been implemented.

## Layout and exact coordinates

Coordinates are zero-based metatile coordinates. Each metatile is 16×16 pixels. The map is 24 columns × 28 rows, enlarged southward from the original 24×20 Pallet Town.

| Element | Coordinate | Purpose |
| --- | --- | --- |
| Player spawn | (10, 9) | Central plaza, clear of NPCs and solid objects |
| Tea vendor | (16, 8) | Starts the errand; moved aside so the shop door stays clear |
| Greenway guide | (6, 22) | Southwest flower garden; completes the errand |
| Guest-house door | (6, 7) | Existing player-house interior and healing host |
| Tea-house door | (15, 7) | Existing rival-house interior; indoor host shares the tea errand |
| Field-station door | (16, 13) | Existing Oak laboratory interior |
| Guest-house sign | (4, 7) | Identifies the guest house |
| Tea-house sign | (13, 7) | Identifies the tea house |
| Town sign | (9, 11) | Taichung / West District welcome |
| Greenway sign | (5, 14) | Directions to the vendor and guide |
| Field-station sign | (16, 16) | Identifies Oak's local research outpost |
| North connection | (12–13, 0) | Route 1, with its original wild encounters |
| South boundary | rows 26–27 | Solid tree wall; the original ocean connection was removed |

The central stone path runs along columns 10–11. The southern garden has flower islands, four complete two-row benches, and open paving around every interaction. Buildings and all three door coordinates retain their original footprints so their interior warps stay valid. The top street and north-route transition are preserved.

## Implementation

- `vendor/pokefirered/data/layouts/PalletTown/map.bin`: actual binary metatile grid, including collision and elevation bits.
- `vendor/pokefirered/data/layouts/layouts.json`: map height.
- `vendor/pokefirered/data/maps/PalletTown/map.json`: NPCs, doors, signs, and connections. Original Oak cutscene coordinate triggers are removed.
- `vendor/pokefirered/data/maps/PalletTown/scripts.inc` and `text.inc`: welcome, tea errand, and local signs.
- `vendor/pokefirered/data/maps/PalletTown_RivalsHouse/scripts.inc`: indoor tea host uses the same errand.
- `vendor/pokefirered/src/data/region_map/region_map_sections.json`: region label `TAICHUNG GREENWAY`.
- `vendor/pokefirered/src/new_game.c`: plaza spawn.
- `vendor/pokefirered/src/oak_speech.c`: short demo new-game entry with default names.
- `vendor/pokefirered/src/intro.c`: preserves save loading, RNG, and save-block initialization while skipping the original movie/title delay; the native main menu still offers Continue.
- `vendor/pokefirered/include/constants/menu.h` and `src/script_menu.c`: native four-option starter menu ID 65, preserving all original menu IDs.

Starter selection uses persistent `VAR_0x40FC`: zero means unselected; a successful grant stores the actual species ID. The independent optional quest uses `VAR_0x40FD`: 0 = not initialized; 1 = errand available; 2 = carrying tea; 3 = delivered. Both variables were unused upstream. Initialization runs on the first overworld frame, after the base game's map flag reset. Continue preserves the selected species, party, and quest state. Earlier prototype saves with a fixed Bulbasaur are migrated on map transition **and resume** without replaying the introduction or gifting another Pokémon.

The existing rival-battle-completed flag enables guest-house healing. The lab starter sequence is advanced to prevent another starter gift. The original three-way `VAR_STARTER_MON` is set correctly for the three classic starters; Pikachu uses the safe legacy index 0 for unchanged Kanto story scripts outside the prototype. The actual starter species is always stored separately in `VAR_0x40FC`. Future fictional Taichung leaders and rosters do not yet use that legacy story path.

## Editing and validation

Open `vendor/pokefirered` in Porymap, then select `PalletTown`. The original internal map ID is retained for compatibility. Use the normal game build after editing.

```sh
python3 scripts/validate-game-map.py
python3 scripts/render-game-map.py --output docs/taichung-map.png
bash scripts/build-game.sh
```

`validate-game-map.py` reads the actual binary grid. It checks map dimensions, defined metatiles, walkable spawn, reachable NPC interaction spaces, consistent NPC elevation, accessible signs, each door's interior/return warp, the north exit, and the closed south boundary. It initially caught a vendor standing in front of the tea-house door; that NPC was moved to (16, 8). The latest report is `docs/map-validation.json`.

The optional source-map renderer needs Pillow. Validation and the initial content generator use only Python's standard library. A compiled game still needs visual and interaction QA in the browser.

`apply-taichung-map.py` is the initial content generator, pinned to upstream commit `ce6406d8c2eaf46d543c8a2606de0c3cb1951982`. It deliberately rewrites the affected files from that baseline. It is **not** part of ordinary incremental builds: do not rerun it after making custom Porymap/source edits unless you intend to restore this prototype. Its script/text templates live in `scripts/map-content/`.

## Starter and save acceptance checks

After building, verify the actual ROM in the emulator:

1. New Game reaches the brief greeting and native four-option menu quickly. The menu order is Charmander, Bulbasaur, Squirtle, Pikachu; pressing B keeps it open.
2. Select each of the four options in a fresh game. Check the Pokémon menu: exactly one Pokémon, the selected species, level 5. Verify that movement is immediately available after the short confirmation.
3. Save, reset, and choose Continue. Confirm the same party, position, supplies, and quest state; starter selection must not appear again. Re-enter the map and check again for duplicate gifts.
4. Load a save from the original fixed-Bulbasaur prototype. Continue must preserve its party and skip starter selection.
5. Ignore or decline the tea errand and walk directly north. The encounter route remains accessible.

The source-grid validator covers map topology; these starter/save checks exercise game state and must be run against the compiled ROM.

## Artistic and mapping choices for the next version

These are useful decisions the user can work on while the build is in progress:

1. Shortlist prominent landmarks across Taichung, sketch their compressed relative placement, and choose which become gyms. Create fictional leader concepts for them; final gym count, rosters, badges, order, and scaling remain open.
2. Choose which geographical relationships should stay recognizable and which routes can be compressed. Allocate possible wild-Pokémon habitats across parks, urban areas, waterways, and trails without assigning final species or making every street an encounter zone.
3. Choose a daytime or evening identity. The current direction is sunny greenery, warm roofs, stone paving, and a calm tea errand.
4. Supply a short reason for the first Pokémon journey: meeting a friend, making deliveries, helping a guide, or following a local mystery.
5. Decide how much Traditional Chinese to show. English ROM text is the working default. Traditional Chinese requires a deliberate game-font/encoding project; the surrounding web app can display it immediately.

Prioritize custom tiles for a Taichung landmark façade, a tea-stall awning/counter, local street furniture, and a distinctive Greenway sign. Tile assets must respect the GBA tileset/palette system. Whole new buildings also need planned door tiles, solid footprints, and interior destinations. Existing battle systems and the world outside this first neighborhood remain the underlying FireRed game.
