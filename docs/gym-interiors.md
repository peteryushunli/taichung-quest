# Gym interiors and the Wanhe Temple gym

This change answers two requests from 2026-11-11.

- Every gym should have its own interior, shaped like its building and related to it, at the level of detail of the start house.
- Muqing's gym moves from Maple Garden to Wanhe Temple, so there is a gym in the old Nantun streets.

The user approved all ten rooms from the gym interiors review board, with one condition: the player must walk between the theater's seat rows without clipping. After the first build the user replaced the Taichung Park room, which had water all round although the pavilion stands on dry lakeshore outside, with a dry tea hall (option B).

Native work is commit `cf76598` on `claude/gym-interiors`, over native `9cb6855` (the guest house opening). It is not pushed. `patches/taichung.patch` is exported from that commit, and applying it to the pinned baseline `ce6406d` reproduces its tree exactly (`8321fa93`). The test cartridge is `bf68b580…` (SHA-256 `f4dd1a85…`, 16,777,216 bytes). The minimap geometry fingerprint changes to `48fe4ba5…`, because the room sizes changed.

## In the game

- **Ten rooms.** Each gym has its own layout, `LAYOUT_TAICHUNG_GYM_*`, that follows its building. Old Station, Park, Miyahara, Fine Arts, Fengjia and the theater get private tilesets that mix FireRed pieces with new art. Science Museum, Greenway, Shen Ji and Wanhe Temple reuse FireRed tilesets as they are.
- **No new people or lines.** Each room keeps its leader and one existing helper with their existing scripts. Only where they stand changed.
- **Exits.** Every outside door lands on the middle exit mat, and stepping on it leads back out to the same door.
- **Taichung Park** is one open tea hall under both roofs: tea tables in the wings, a red runner from the door to Lian, and the lake seen only through the north windows.
- **The theater** keeps two seat aisles (rows 6 and 8) that the player walks end to end, drawn in front of the row behind.
- **Wanhe Temple is the ninth gym.** Muqing keeps her save bit and team, her lines now speak of Mazu and the sea, and her badge is the Tide Badge / 潮汐徽章 with the same water-drop art. The temple host beside her tells Wanhe's story, so she gives no history tour.
- **Maple Garden is a visit stop.** Its hall stays open with the scientist guide where the leader stood.
- **Save v12.** A save made inside any of the eleven rooms by an older version reloads that room on its exit mat. Nothing else in the save changes.

## On the website

- The ninth gym card and map pin are Wanhe Temple: Muqing, her team (Poliwhirl, Butterfree, Vaporeon) and the Tide Badge on the City Pass. The badge image is the game's own award icon, moved to `badges/wanhe-temple.png`.
- The Wanhe facade (`landmarks/wanhe-temple.png`) is cut from the Nantun Wanhe map with the paving cleared, since no drawn facade exists.
- Maple Garden joins Wenchang Temple as a visit stop: no leader, no badge, its own official page. It keeps its drawn facade and gains a map-view crop (`landmarks/map/maple-garden.png`, world tiles 14–25 × 31–39) like the other non-gym places.
- The landing lede now names Maple Garden among the ten more landmarks.
- `web/src/data/minimap-contract.json` is the native export: the new room sizes, Wanhe as `landmark-gym` and Maple Garden as `landmark`.

## Checks

- Native: the gym layer guard and the guest house and approved-art guards self-test; `validate_city`, `export_minimap --check` and `verify_gyms` pass; the save v12 host suite passes (2,140 cases) and `test-save.sh` passes. Every other native check matches its result on `9cb6855`.
- Runtime, on cartridges built from this tree: each room loaded from a save made inside it and arrived on its exit mat; the leader and helper each talked; the exit led to the building's door and re-entering landed on the mat. Wanhe Temple and Maple Garden were walked again on `056a1ca6` (the build before the Park redo), and the Park tea hall on `bf68b580`.
- Website: `npm run check`, `npm test` (57 pass) and `npm run build` pass, and `scripts/test-build-game-metadata.py` passes.

## Combined with the settings, minimap and Chinese text work

This change ships in one release with `docs/settings-minimap-touch.md`. That work covers the language row on the settings screen, the Town Map minimap, the touch fix, shorter Chinese text and the Chinese glyph gap and shadow.

- **Native.** Merge `1ce0e1b` on `claude/gym-interiors-chinese-font` combines `cf76598` with `b8b762b`. The next commit, `59e51d9`, fixes `--install` on a committed or merged layer. `patches/taichung.patch` is exported from `59e51d9`, and applying the patch to `ce6406d` reproduces that tree exactly (`85ce88fa`).
- **Combined cartridge.** `1f1b4c36…` (SHA-256 `1f1b4c364bf52d34e664fa602b6e48265383c7e3ddbc77c5e78ec9bbacc7c540`, 16,777,216 bytes). The minimap geometry fingerprint stays `48fe4ba5…`.
- **Glyphs.** This change's 13 glyphs keep indices 770–782, and 黑 from the other change is appended at 783.
- **Muqing.** Her Wanhe Temple lines are kept and shortened in the same style as the other gyms, for example 萬和宮徽章記入城市護照！
- **Guard.** The gym interiors manifest re-pins the six files both changes touch: `charmap.txt`, `taichung_glyphs.h`, `taichung_maple_garden_gym.c`, `taichung_landmark_history.c`, `home_start.py` and `docs/taichung-gym-progress.md`. The layer still holds the same 34 edited and 153 added files. With `59e51d9`, `gym_interiors_guard.py --install` reproduces this manifest byte for byte on the merged tree.
- **Checks on the combined tree.** The gym layer self-test, save v12 (2,140 cases), `verify_gyms.py`, `home_start` and both `approved_art_guard` self-tests, the city, seam and minimap checks, and every native host test all pass. The quest-log audit was already failing before either change. Wanhe Temple, Taichung Park and the theater were walked headlessly on the combined cartridge: you arrive on the mat, both people talk, and the door leads out and back in.
