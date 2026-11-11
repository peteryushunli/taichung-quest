# Settings screen, Town Map minimap and stuck touch buttons

This change answers four notes from a phone playtest on 2026-11-11.

- The minimap looked too much like GTA.
- The encounter labels on the opening settings screen were too short.
- Language was chosen in a web dialog outside the game.
- A button stayed held in Chrome on iPhone until the game was paused.

Native work is commit b8b762b on `claude/settings-language-encounters` over native 9cb6855. `patches/taichung.patch` is exported from that working tree. The test cartridge is `d811cb2a…` (16,777,216 bytes). It includes the shorter Chinese text and the new Chinese font rendering described below. The cartridge with only the shorter text was `619d5639…`, and the one before both was `82018e09…`.

## Language on the first settings screen

The web no longer asks for a language. On first visit the site follows the browser: any `zh` language picks Traditional Chinese, and anything else picks English. A language the player chose before still wins.

When a new game starts, the web hands that language to the game, and the bedroom opens straight onto the settings screen. The screen has four rows:

1. **LANGUAGE / 語言**: English or 繁體中文, each written in its own script. Left, Right or A switches it, and the whole screen redraws in the new language at once.
2. **WILD POKéMON ENCOUNTERS / 野生寶可夢遭遇**: Off, Low or Normal.
3. **TRAINER ENCOUNTERS / 訓練家遭遇**: Off, Low or Normal.
4. **CONTINUE / 繼續探索**: the cursor starts here.

Each row has two lines of help text at the bottom of the screen. The web chrome follows the game through the language bridge, so the button labels and City Map change with it.

The language selects are gone from Game options and the City Map. The Start menu's OPTION screen still changes language later. If the bridge is unavailable, the game falls back to English and the player can switch on the same screen.

`tools/taichung/home_start.py` now checks that the bedroom opens the settings screen with no separate language prompt or multichoice. Its hash pin for `TaichungGuestHouse_2F/scripts.inc` is updated.

## Town Map minimap

The round GTA-style radar is now a rounded rectangle drawn like FireRed's Town Map.

- **Size.** The panel is 64×48 GBA pixels in the top-left corner, 3 px from each edge. It scales with the game screen.
- **Pixel art.** One tile is one GBA pixel, about 60×44 tiles in view. Everything is drawn with crisp edges on whole pixels, with no anti-aliasing or strokes.
- **Colours.** These are GBA-friendly values with every channel a multiple of 8: green land `#88c870`, cream roads `#f8f0c8`, blue water `#5090e8` and a dark slate outside the city `#384858`.
- **Frame.** A white window frame with a dark outline and rounded corners, and a small N tab.
- **Markers.** Gyms are red squares, landmarks are yellow dots, and the guest house is a blue-roofed house. The player is a white arrow that turns with their facing. Gyms out of view stay pinned to the edge as smaller squares.

The radar art (`web/src/assets/minimap/city.png`) is re-derived at 1 px per tile with the new palette. The minimap contract is unchanged, and `export_minimap.py --check` passes.

## Stuck buttons on touch

Chrome on iOS can drop a `touchend` or `pointerup` when a long press turns into text selection. The screenshot showed a "Copy | Search with Google" callout over the game.

- Every touch event now checks each held button against the fingers that are actually on the screen. A button with no finger on it, or within a small margin, is released on the next touch.
- `touchstart` on the pad and buttons calls `preventDefault`, so iOS does not start a selection or callout.
- Text selection, the callout, the context menu and dragging are disabled on the controls and around the game screen.

## Shorter Chinese text

All 375 in-game Chinese strings were rewritten to use fewer characters, from about 5,150 to about 4,010 (−22%). The meaning, facts, names and character voices are unchanged.

| Area | Before | After |
|---|---|---|
| Gyms, City Pass and gym adapter | 1,958 | 1,521 |
| Landmark history (signs, tours, staff) | 709 | 523 |
| Battle, quest log and TEAM menu | 748 | 575 |
| City signs, guest house, tips, starter and settings | 1,731 | 1,393 |

- **Line width.** Every dialogue line is now 13 characters or fewer, so it fits even a 16px font. Most lines are 12 or fewer.
- **Rendered check.** Each dialogue page was rendered into the real dialogue box, and none overflows. The quest log keeps its three-line entries.
- **New character.** Only one was added: 黑, as in 你眼前一黑！. The glyph refresh appended it at index 771 and kept every existing code.
- **Landmark history.** The rewrite was made in the source records in `data/taichung/landmark-history/*.json`, and `src/taichung_landmark_history_data.c` was regenerated. `docs/landmark-history-source-snapshot.json` holds the new record hashes.
- **Start menu.** Two labels are shorter so they fit the original seven-tile window with the wider font: 城市護照 is now 護照, and 騎腳踏車 is now 騎車. The rest of `src/start_menu.c` is unchanged.
- **Left unchanged.** City names, badge names and Pokémon names, because they are proper nouns.
- **Re-pinned.** `tools/taichung/home_start.py` re-pins `taichung_guest_house.c` and `taichung_onboarding_text.c`.
- **Older guards.** `tools/taichung/landmarks/check_old_core.py` and `audit-quest-log-player-text.py` were already failing before this change, on the opening blocks and the save pair.
  - `check_old_core.py` also pins `taichung_language.c` and `taichung_starter_menu.c`.
  - The quest-log audit freezes `src/taichung_language.c`, `src/text.c` and `src/start_menu.c` at commit 970295, so it now stops on the first of those instead. With those pins skipped, it reaches the same save-pair failure as before.

## Chinese font: gap and shadow

Chinese characters were drawn touching each other, with no shadow, so lines looked squished next to English. Four options were mocked up on real game screens. Option B was chosen: the same Fusion Pixel 12px font, with a 1px gap and a FireRed-style shadow.

- **Gap.** Each character is drawn in a 13px cell, so there is 1px of space between characters. Lines get 1px wider per character. The landmark history renderer already budgeted 13px per character.
- **Shadow.** Each character gets a shadow one pixel right and down, in the window's shadow colour, like FireRed's own text. It shows in dialogue, signs, menus, the settings screen, the City Pass and the save screen.
- **Chinese punctuation.** `！`, `？` and `。` share bytes with English `!`, `?` and `.`, so the character map is unchanged. Instead, when one of those bytes comes right after a Chinese character, the game draws the full-width Chinese mark in a 13px cell. English text keeps its own punctuation. `，`, `、` and `：` were already Chinese glyphs.
- **Width.** Menu and window widths are measured with the same rules, so menus size to the new text.
- **Code.**
  - `DecompressGlyph_Taichung` and `GetStringWidth` in `src/text.c` draw and measure the 13px cell.
  - `tools/taichung_gameplay/generate-cjk-punctuation.py` writes the three punctuation rows from the pinned font into `src/data/taichung_cjk_punctuation.h`. With no options it checks that the header matches the font.

The game was played headlessly in Chinese on both `619d5639…` and `d811cb2a…`, and the same screens were compared: the settings screen, opening dialogue, Start menu, City Pass, save prompt, Yes/No box and save summary. Everything fits. The Start menu was the one place where text was cut off, and the two shorter labels fix it.

## Checks

These pass on the final source:

- `home_start.py --self-test`, `approved_art_guard.py --self-test` and `approved_art_guard.py --historical all --self-test`
- `validate_city.py`, `check_connection_boundaries.py`, `rooms/check_welcome_bindings.py` and `export_minimap.py --check`
- The native host tests (onboarding, exploration, player text, progress, starter, team, landmark gyms, badge rewards, badge scenes, landmark history, save, save v11, save facing, navigation bridge, bike shortcut, badge sprites, gym money) and the Chinese glyph test, on the rewritten text
- `render-landmark-history.py` in check mode, against the regenerated history module
- `generate-cjk-punctuation.py` and `generate-chinese-font.py --check`, against the pinned font
- `npm run check`, and `npm test` with 57/57 passing
- Browser fixtures at phone (390 px, touch) and desktop widths: controls 22/22, minimap 12/12, onboarding 4/4, plus the simulated adapter

The game was played headlessly on cartridge `82018e09…`.

- **Chinese browser.** The site opened in Traditional Chinese with no web language picker. The settings screen opened in Chinese. Switching to English redrew it and the web buttons, and Xiaoyu's next line was in English.
- **Minimap.** It stayed hidden in the house and appeared outdoors at the door. It followed the player west at desktop size and at phone size.

Not checked: the stuck-button fix on a real iPhone. It can only be confirmed by playing on one.
