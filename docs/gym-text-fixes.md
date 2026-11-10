# Gym text fixes

Four native fixes on top of main `80c714f` (native `d47712a`). Native source `2362263510dfa38987c36b6cc40dca8d9372fc3c`; 16 MiB cartridge SHA-256 `5c3e041d7ee8dacc126eb600098c8e63f7498dd73bd712aa4bb504c04c0ee1bb`. `patches/taichung.patch` recreates that exact native tree from the pinned upstream commit.

**City Pass info box.** The badge name, district, EARNED/NOT YET and the footer now sit inside the orange border in both languages. Small-font lines paint a 13 px (Latin) or 14 px (Chinese) cell, so the box is three 14 px rows inside its 2 px frame, and the badge grid moved up 2 px to make room. The award screen is unchanged.

**NPC text colour.** Every character on the Taichung maps speaks in the neutral grey. Leaders and custom characters already did. Stock-sprite staff and hosts took FireRed's gendered red or blue: Miyahara, Shen Ji, Fine Arts, the Wenchang host and the Greenway guide in red; Park, Maple Garden and Wanhe in blue. Other regions keep their colours.

**Leader history as the lead-in.** "About this place" is gone. A leader now greets you, tells the landmark's history, then asks the challenge question with Challenge / Leave only. After a win, talking to the leader tells the history and then the already-recorded line, with no menu. All ten gyms, English and Traditional Chinese. Temple hosts and gym helpers are unchanged.

**Street-name signs removed.** The four road-name signposts are gone: GONGYI RD. and LIMING RD. (Nantun North), HUIWEN S. ST. (Wanhe) and Hwy 74 (Old City North). Each cell is now the ground its builder draws there without the sign: park grass for the three Nantun cells, sidewalk for Hwy 74. Gym, landmark, temple and waterway signs stay, as does Yizhong Street, which is a landmark-list entry. No save change is needed: a signpost is solid, so no saved position can stand on one, and the save v10 tables are unchanged.

## Guards

`tools/taichung/street_signs.py` registers the sign removal as an exact layer over `d47712a`. Its self-test rejects five corruptions. The frozen rework, Nantun, gym staff and save v10 checks read the maps underneath it. `check_cmp.py` re-pins the gym staff v9 profile's guard source to `77fef88`. The minimap contract refreshes only three map.json provenance hashes; the geometry fingerprint stays `5ec62740…`, so the web's bundled contract still matches this cartridge. Main can sync those three `sourceSha256` lines on its next contract update.

## Validation

Every native guard passes except the two already stale on main (`check_station`, `check_theater`). The Python suite (19 tests, 135 subtests) and the gameplay suites pass, including save, team and the landmark history routes for all ten gyms in both languages.

In the actual cartridge, through the native QA page:
- The City Pass reads cleanly in English (2/10) and Chinese (10/10).
- The Miyahara and Maple Garden staff print the same grey (99,99,99) as their leaders.
- Peiqi goes greeting, history, question and Challenge/Leave, then the battle, in both languages. Leave gives her declined line.
- A completed Maple Garden gym tells the history, then the recorded line.
- The player stands on all four former sign cells, and A in front of each shows nothing.

Screenshots are local, in `artifacts/gym-text-qa/` (not committed).
