# Native English and Traditional Chinese

The ROM now has a real language choice before its Taichung introduction and four-starter menu. The native Start menu can change that preference without resetting the player, party, map position or quest. The working English ROM from before this change is preserved locally in `artifacts/taichung-before-bilingual.gba`.

## Preference and coverage

Persistent event variable `0x40FB` stores the language: zero is unset, one is English and two is Traditional Chinese. Starter selection remains independently stored in `0x40FC`; the optional tea errand uses `0x40FD`. The language selection ignores B and retries unexpected menu results. The preference is included in the normal cartridge save when the player uses Save; continuing that save retains it.

Implemented Traditional Chinese coverage includes the custom introduction and starter menu, all city signs/hall dialogue, three district names, native ten-landmark City Pass, Station challenge, exploration settings, Start actions including Bike/Get off/Language, common Yes/No options, normal Save prompts/stat labels, and the four battle actions. Legacy prototype Greenway signs and tea dialogue remain translated. English is available for the same content.

Original Kanto story dialogue, most Bag/party/options/Pokédex detail screens, Pokémon and move names, and most battle narration retain English. Future translations should be added to the catalog and verified in their actual windows before expanding the stated coverage. The three custom district names use compact Chinese strings that fit the engine's 19-byte map-name buffer.

The browser player, City Map and native ROM synchronize through the versioned language bridge. The native startup choice remains authoritative. Browser requests wait until a safe field frame, while menus, battles, messages, replay or pause are active. Explicit native choices override older pending browser requests. Metadata must match the actual ROM digest and symbol address, and the client attaches only to one advancing live packet. See [bridge validation](web-language-bridge-validation.md). Since 2026-11-11 the web has no language picker of its own: it sends the browser's language to the opening, and the player keeps or switches it on the first settings screen ([details](settings-minimap-touch.md)).

## Font and encoding

The subset is generated from [Google Fonts Noto Sans TC](https://github.com/google/fonts/tree/86aced91de05cd4f96a06838124cca45be337b2b/ofl/notosanstc), licensed under [SIL Open Font License 1.1](https://github.com/google/fonts/blob/86aced91de05cd4f96a06838124cca45be337b2b/ofl/notosanstc/OFL.txt). The raw font is cached under `.tools/fonts/` and is not shipped with the webpage. The font SHA-256 is `864727d210d54f2537bbe23b3a839436c3992af72de9322af5270897246bd44f`.

The generated font uses a 12-pixel horizontal advance and a 14-pixel cell, rendered through the game's existing four-bit window graphics. Only the required glyphs are embedded; the first checkpoint contains 255. This preserves the 14/15-pixel menu-row layouts and does not allocate a large Chinese character set in RAM. The font's notice is retained in `assets/fonts/OFL.txt` and served at `web/public/licenses/NotoSansTC-OFL.txt`.

New Chinese glyphs are encoded as `FC 19 low high`, where `index = (low - 1) + (high - 1) * 240`. Both digits are between one and 240, so neither can be a string terminator, placeholder or message delimiter. Existing Latin and Japanese byte encodings are preserved. A few punctuation marks already supported by the original character map retain their original encoded forms: `！`, `？` and `。` stay on FireRed's `!`, `?` and `.` bytes, which original English text also uses.

The native renderer consumes the complete four-byte sequence and draws the 12-pixel glyph in a 13-pixel cell: the glyph in the active text colour, a FireRed-style shadow one pixel right and down in the shadow colour, and a one-pixel gap before the next character. It advances by 13 pixels. When `!`, `?` or `.` directly follows a Chinese glyph, it is drawn as full-width `！`, `？` or `。` with the same 13-pixel advance; English text is unchanged. Those three rows are generated into `src/data/taichung_cjk_punctuation.h` by `tools/taichung_gameplay/generate-cjk-punctuation.py`. Native width calculation uses the same rules, so menu sizing agrees with rendering. Custom Chinese dialogue includes explicit short lines and page breaks; lines are kept below the dialogue window width. The renderer also wraps a Chinese glyph before the window edge. Text expansion preserves both glyph-index bytes. Character-map changes invalidate all encoded C and data-assembly objects in the game Makefile.

## Rebuild and extend

Ordinary source builds use the checked-in generated font header, translation source and character map; Pillow and a font download are only needed when regenerating them.

To regenerate after editing `scripts/map-content/taichung-zh.json` or adding Chinese labels in project-owned `src/taichung*.c` modules:

```sh
python3 -m pip install Pillow
python3 scripts/generate-chinese-font.py
bash scripts/build-game.sh
```

The generator downloads the pinned font only when missing and verifies its hash. It updates the compact glyph header, appended character map, native translations and custom starter/language menus. It also creates `artifacts/chinese-glyphs.json` and `artifacts/chinese-font-proof.png` for review. Repeating it without content changes preserves generated source contents. `TAICHUNG_GAME_SOURCE` can select another game checkout/worktree; the font and catalog remain in the project root.

`scripts/apply-taichung-map.py` is a legacy prototype generator. It refuses to run over the integrated city because doing so would overwrite later map content. Normal builds apply the consolidated patch and use the checked-in generated font; they do not rerun either map generator.

## Runtime verification

Before reporting the feature complete, verify in the emulator:

1. A new game shows English and 繁體中文 before the introduction.
2. Chinese selection produces readable Chinese introduction, four starter names and native Start menu, with no clipped rows.
3. Every starter still gives exactly one level-five Pokémon and exploration starts immediately.
4. Start → 語言/Language changes the dialogue/menu language while preserving the chosen starter and current position.
5. Saving and continuing retains the preference and never reruns the starter choice.
6. English selection still renders the original English custom content, and Bike/Get off keeps its native eligibility checks.

## Optional saved-preference integration

The normal cartridge save stores `0x40FB` at SaveBlock1 offset `0x11F6`: the variable array begins at `0x1000`, with two bytes per variable from `0x4000`. Since save-data chunks are `0xF80` bytes, this corresponds to logical save section 2 at payload offset `0x276`. Physical sectors rotate between saves; a future bridge must validate the section signature/checksum and select a consistent latest save before reading it. Reading this saved preference cannot by itself provide immediate, bidirectional synchronization.
