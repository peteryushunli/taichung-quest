# Website landmarks, title card and street minimap

Web changes on `claude/gym-gameboy-website-updates-9d8798`, based on main 80c714f. The branch also merges the in-game fixes (native 2362263, cartridge `5c3e041d…`, see `docs/gym-text-fixes.md`).

## Title card

The console screen shows a GBA-style title card until the cartridge runs (`web/src/title-screen.css`, markup in `main.ts`).
The card holds a dawn sky, the Old Taichung Station facade, the four starters, the logo "POKÉMON × TAICHUNG" and a Start button.
Everything is laid out on the 240×160 grid: `--p` is one GBA pixel.
While loading, the Start button hides and a GBA text box shows the status. On an error, the button comes back above the text box so the player can retry.
The exit button now reads "Back to site" / 返回網站.

## Twenty places on the website

- **Ten gyms.** Gyms stay in `landmarks.json`, with the two temple visits.
- **Eight set pieces.** The other landmarks from the city rework are in `web/src/data/sights.json` (`kind: "sight"`, `gymStatus: "not-a-gym"`). They are kept out of `minimap-contract.json`, which is fingerprinted. Each one carries:
  - its own `world` sign tile;
  - an `artRect` crop of the city render;
  - researched descriptions in English and Chinese, with `descriptionSources`;
  - an official visitor link.
- **Map pins.** On the website map, gyms are green squares and landmarks are gold rounds. Every pin opens the detail panel. Non-gyms show their crop of the in-game map instead of a facade.
- **Gallery.** The gallery is split into Gyms and Landmarks.
- **Label overrides.** `landingLabelSide` sets the label side on the website map. `guideLabelSide` sets it on the in-game City Map, where labels are two lines.
- **Detail panel.** The leader block now sits right under the description, and the panel stays in view while you scroll.
- **Descriptions.** All twenty descriptions were rewritten from Wikipedia and official sites. Where sources disagreed, the fact was left out.

## Street minimap and City Map

- **Live minimap.** The minimap is now a round radar in the style of GTA 3, in the top-left corner. It shows a north-up circle about 60 tiles across, always centred on the player, with a small white arrow for the player's facing and an N badge on the rim. It does not stop at the world edge, so the dark surround shows the outline of the city. There is no caption and no building detail.
- **Blips.** The ten gyms are red squares and the ten other places are yellow dots. A purple house marks home, the door of the starting house at world tile (105, 120). Gyms and home stay on the rim, pointing the way, when they are out of range. Other places show only inside the circle. The button's title and label still name the nearest landmark for screen readers.
- **Hidden indoors.** The minimap shows outdoors while exploring. It hides inside any building, as well as in menus, battles and transitions. The settings hint says so in English and Traditional Chinese.
- **City Map dialog.** Tapping the minimap opens the City Map, which now uses the same render at full size, with all twenty places, district signs and tabs. The schematic district boxes (`city-guide-model.ts`) are gone.
- **Derived art.** `web/scripts/derive-city-art.py` writes the radar map (`src/assets/minimap/city.png`) and the ten landmark crops (`src/assets/landmarks/map/`). Both come from `src/assets/landing/city-map.png`. Re-run the script whenever the city render changes.
- **Radar map.** Each world tile becomes one of four flat colours. A tile is outside if more than half of it is transparent, and water if more than half is the still water blue. It is road if it is mostly street or highway asphalt and joins a long run of road. Tiles with cars or crossings join a road they touch, one-tile gaps are filled and one-tile spurs are dropped. Everything else is land, so roofs that reuse the asphalt greys never show as road. The PNG is 2 px per tile with a 2-tile dark border.
- **City render.** `city-map.png` is now rendered from the guest-house native tree (09534a8 plus `tools/taichung/home_start.py`), so the four removed street signs and the Han Creek and Fazi River signposts are gone (see `docs/guest-house-opening.md`). `render-landing-map.py` now draws animated tile slots with their first frame, as the cartridge shows them. Before this, the map showed the tileset's raw wave texture, while the game draws its water one still, flat colour. Water, sand edges and flowers now match the game.
- **Contract.** `minimap-contract.json` takes native's three refreshed source hashes (Nantun North, Wanhe, Old City North). The geometry fingerprint is unchanged, and `verify-cartridge.mjs` passes with cartridge `5c3e041d…`.

## Checks

- `npm run check` and `npm test`: 50/50 tests pass.
- Browser fixtures: minimap 12/12, controls 20/20, onboarding 5/5.
- Radar minimap: `npm run check` passes, `npm test` 56/56, minimap fixture 12/12 at desktop and phone widths. Headless screenshots at the Station (117, 119), the west highway (3, 40) and Wanhe (31, 143) show clean roads and no building detail.
- Headless screenshots: landing, title card and City Map, at 1440, 820 and 390 px wide, in English and Traditional Chinese.
- Live game: the cartridge was booted in the web player with the Wanhe test save. The minimap followed the player from world tile (10, 125) to (17, 125), naming Wenchang Temple as the nearest landmark, and tapping it opened the City Map.
