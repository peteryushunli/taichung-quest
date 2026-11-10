# Website landmarks, title card and street minimap

Web-only changes on `claude/gym-gameboy-website-updates-9d8798`, based on main 80c714f. No ROM change.

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

- **Live minimap.** The minimap is a 36×27-tile window on the real city render. It follows the player and is clamped to the world edges. It marks all ten gyms (squares) and ten landmarks (rounds).
- **City Map dialog.** Tapping the minimap opens the City Map, which now uses the same render at full size, with all twenty places, district signs and tabs. The schematic district boxes (`city-guide-model.ts`) are gone.
- **Derived art.** `web/scripts/derive-city-art.py` writes the minimap image (`src/assets/minimap/city.png`, 4 px per tile) and the ten landmark crops (`src/assets/landmarks/map/`). Both come from `src/assets/landing/city-map.png`. Re-run the script whenever the city render changes, for example after the street signs come out of the ROM.

## Checks

- `npm run check` and `npm test`: 50/50 tests pass.
- Browser fixtures: minimap 12/12, controls 20/20, onboarding 5/5.
- Headless screenshots: landing, title card and City Map, at 1440, 820 and 390 px wide, in English and Traditional Chinese.
