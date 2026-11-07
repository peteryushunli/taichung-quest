# Next build integration — 7 November 2026

The Greenway release is published on both https://taichung-quest.vercel.app and the existing private Site. It adds Science Museum, Shen Ji and Fine Arts to the accepted Theater/Park build. Station and Park remain the two playable battles. Earlier presentation and Theater/Park deployments remain available as fallbacks.

## Integrated source

- Theater map `76832f0`: approved facade and enterable hall, stable entrance/return bindings, native walking/cycling, collision, Save/Continue and both Greenway crossings verified by Maps. No Theater battle is implemented.
- Save upgrade `ad9e683`: version 4 refreshes Xitun for v3 saves and repairs exactly 33 newly blocked positions. All 1,516 retained-safe positions remain unchanged. Earlier saves retain the existing OldCity migration chain. Host tests protect party, inventory, checkpoint, preferences, progress and native pending returns.
- Character slices `171151d`, `8aa5a94`, `102b575`, `f943b1d`: Lian, Peiqi, boy core poses and the seven other landmark hosts. Existing host positions and scripts remain unchanged. Portrait registration does not activate a battle. Boy auxiliary item/surf/fishing/VS Seeker art and the girl trainer are outside these slices.
- Supporting characters `ac0e069` + `a9587ae`: six support sprites and five optional hall NPCs, with short bilingual greetings. All five legacy-player overlap cases passed native Continue and movement checks; only the new NPC moves aside.
- Web `ad3951d` + `0ac4cef` + `9be219f`: City Map controls have at least 44-pixel touch targets; compact bilingual minimap names fit small screens and retain full accessible names. The actual production map remains square under shared button styling.

The original presentation tag, cartridge, presenter save and deployment archive are preserved. Native runtime migration tests use a separately frozen cartridge and copied saves. Synthetic position fixtures are explicitly labeled; original saves are never overwritten.

## Validation and publication

All four bounded Theater-v4 cases pass: organic v1 quest-log, synthetic invalid/safe Xitun positions, and organic post-install v3 Xitun Continue/Save. Protected data remains unchanged except the save version. Combined cast fresh opening and actual Jun portrait/boy back-pose battle intro also pass. Actual browser Theater door/guide/pause/second Continue and v3→v4 Save pass. Park's complete native acceptance passes on its isolated frozen cartridge, including genuine defeat, cross-hall notice lifetime, retry cancellation, authored moves/full PP, held-mail item/index retention, genuine victory preserving Jun, and original/fresh-Continue repeats without new awards or preparation. The combined source passes progress, party, save and character host tests. Final combined native runtime and client smoke pass. Both packaged Worker builds pass 51 asset-response checks and contain identical decoded assets. Publication succeeded. Post-deployment read-only checks confirm the full live cartridge and Wasm hashes and isolation headers match the reviewed artifact. No organic pre-Theater v3 Xitun fixture is available; the synthetic position cases and post-install organic fixture are labeled separately. Further gym work is included only when its independent and combined checks pass.

Checker-only commit `16625bd` permits just the two approved Xiaoyu graphics substitutions, retaining full type-sensitive map comparisons. All map/bank/seam and adversarial fault probes pass. Separate immutable graphics/NPC attestations preserve Theater’s exact 33/1,516 position semantics.

Main is the sole canonical integration and publication owner. Feature work continues in isolated checkouts; source, cartridge and evidence hashes identify each reviewed handoff.

## Earlier frozen Theater/Park cartridge

Native source `e65ee871fa62d10d9670e1c4e34602678f1a1d7d`; SHA-256 `e4d906ec91ca7d286aa2a8b4c7874ab23c8cc71ae6d5d7f11f506167db99ec96`; SHA-1 `1d65a78aae686eca5b41f00cbf90fd0591d9128a`; 16,777,216 bytes. Language bridge address 33813644, navigation bridge address 33813680; protocol versions remain 1. Geometry fingerprint remains `924380bc2dfe7176686fd81395a52b8489ff18ff6401442acdf06a5d41331722`. All 382 released glyph rows/codes remain exact, with 35 appended Park glyphs (417 total).

Park integration commits: `a751821`, `c8e5da1`, `14eed79`, `3b3ca4a`, `7360766`; acceptance documentation `698b2a6`; final map provenance `e65ee87`. The v4/reset conflict was resolved by retaining the complete v4 tests and adding the separately reviewed transient-reset hooks and tests.

Further Greenway facades, Miyahara battle activation and the girl trainer remain outside this frozen release. The existing presentation fallback stays available. Vercel migration uses the complete prebuilt artifact and native save export/import across origins; its completed publication is recorded below.

## Earlier Theater/Park publication receipt

Published source: `f0d2ffab29b395aa2d55c757447b4b0d755c5f9f`. Deployment: `appgdep_6aeee8f21fd48191a7332029df3c42ae`, terminal status `succeeded`. Saved version: `appgprj_6aee9376a188819190041febf7d7190d~appgver_59179032fc2c8191b3795f751330c28b`. Existing owner-private audience preserved.

URL: https://taichung-quest-hackday.helpfulwren.chatgpt.site

Final earned Park-save migration preserves both stamps, party, inventory and checkpoint; Lian repeat adds no reward or healing. A fresh English/Squirtle opening and native save pass. Evidence: `artifacts/game-build-runtime/final-park-v4/README.md`. Final client Continue reaches Theater, with square live HUD, correct guide status for all ten gyms, pause/resume and one focused canvas; evidence: `.worktrees/web-guide/artifacts/interface-qa/final-e65-client-smoke.json`. Theater remains enterable with its battle pending. Vercel deployment is ready at https://taichung-quest.vercel.app (`dpl_EPmEr3XxvBY42tLiQUhR9xud2PC2`). Its first deployment was automatically assigned production by the CLI. All five live edge asset/hash/header checks pass; actual browser play/save acceptance subsequently passed, as recorded below. The GPT Site remains live. Native save files must be exported/imported when changing origins.

## Greenway release — published

Accepted Maps checkpoint `e9a854b` is integrated as `a4e5720` onto the live Theater/Park source. Science Museum, Shen Ji, Fine Arts and the sculpture have native door, collision, layering, Save/Continue and all four directed seam evidence at `artifacts/worktrees/c291d4842985/greenway-native/acceptance-handoff-e9a854b.json`. That post-install save is not proof of old-cache migration.

Save migration `1ae34ef` adds version 5: v4 refreshes Greenway only; v3 refreshes Xitun and Greenway; earlier saves retain their existing cumulative chain. Host tests cover all 29 repairs and all 1,995 valid Greenway positions, preserved old tables, pending native returns, checkpoint, party, inventory, preferences and progress. Park transient cancellation remains before all Continue early returns. Checker `d5ace79` accepts only exact reviewed C/header pairs and binds the v5 map/delta; unknown pairs and mutations fail. Canonical old-core self-tests pass.

Frozen candidate source `d5ace797accf288ba82914a9310cf1b6b008cab1`; ROM SHA-256 `933dbf12088e104f28dc7525a2d6d20fbd5a6137989f5de197e0453ed5cb7c31`. Navigation/language addresses and geometry fingerprint remain unchanged. Portable patch `bd72b545f3c1114c2c2560257488b0c23df5ca368a5cff36c3cfec44d559c6b0` reproduces all 652 changed Git blobs. Actual old-v4 Greenway cache migration now passes both organic safe and labeled synthetic invalid-position cases, including natural quest-log replay. Both saves retain all six raw party records, inventory, checkpoint and all 256 variables except the intended 4→5 version change. Both new saved map caches match each other and differ from the real old cache. Evidence: `artifacts/game-build-runtime/greenway-v5/README.md`. Final client acceptance passes: native Continue, exact Greenway position, live HUD, bilingual bridge, guide pause/resume and a single focused canvas. Evidence: `artifacts/browser-game-runtime/greenway-v5-client-a86af9d/client-smoke-report.json`. CMP/Fengjia/Maple installs and Miyahara battle remain separate pending increments.

The clean candidate is packaged at `/private/tmp/taichung-greenway-v5-933dbf12-release.tar.gz` from parent `a86af9dae3756f7143ab295e08c9fddbf5d2532a`. The protected Vercel preview is https://taichung-quest-pglf03i2x-peteryushunli-6635s-projects.vercel.app (`dpl_6XtsqWxmZmkyjXvr4JFaFd9SBYPu`). Five authenticated read-only edge checks pass, with exact game asset hashes and isolation/cache/MIME headers. Vercel injects one feedback script into preview HTML; removing exactly that script gives the original artifact HTML. The preview was subsequently promoted after acceptance; see the final receipt below.

During QA, local-client Play entered the actual player, but copied-save import/Greenway HUD/guide verification initially stopped at a locked Mac. CUA explicitly reported that automatic unlock failed and manual unlock is required; no approval-denial reason was returned. After the user confirmed manual unlock, the preserved test completed successfully and owned tab/server were closed. The earlier interruption is recorded in `artifacts/browser-game-runtime/greenway-v5-client-a86af9d/runtime-status.json`; the final smoke report supersedes its pending checks.

## Build-only follow-up after the frozen candidate

Native `64247733f8580a154d6cd5876d57533f35461bea` adds map/border binary prerequisites to `maps.o`; no map or game logic changes. Dry runs prove map-only and border-only edits reassemble the map object; all 740 referenced inputs across 370 active layouts are covered. A forced rebuild under the original root build locale reproduces frozen ROM `933dbf12…` exactly. Direct embedded-byte checks also confirm all three district maps match source in the frozen candidate.

An initial rebuild from the native directory used `C.UTF-8` instead of the root build's `en_US.UTF-8`, changing custom-section link ordering and the ROM digest without changing map bytes. The same-locale repeat resolves that diagnostic discrepancy; the frozen candidate and its runtime evidence remain valid. Evidence: `artifacts/map-build-dependency-fix/verification.json`. Keep recording the locale when comparing rebuilt ROM hashes. The frozen publication package remains parent `a86af9d` / native `d5ace79`; this dependency fix is a separate future-source checkpoint.

## Final Greenway publication receipt

- Deployed parent `a86af9dae3756f7143ab295e08c9fddbf5d2532a`, native `d5ace797accf288ba82914a9310cf1b6b008cab1`, ROM SHA-256 `933dbf12088e104f28dc7525a2d6d20fbd5a6137989f5de197e0453ed5cb7c31`.
- Original private Site: deployment `appgdep_6aef0b6fb00c819190168ee3d606aa64`, saved version `appgprj_6aee9376a188819190041febf7d7190d~appgver_84096309bd1c8191bebbfe188d82e4f8`, terminal `succeeded`. Live cartridge/Wasm hashes and isolation headers pass.
- Vercel production: `dpl_xpxYCuqyfnb45r5KQWKPbR1qyhin`, Ready, at https://taichung-quest.vercel.app; immutable URL https://taichung-quest-r7mp2shhq-peteryushunli-6635s-projects.vercel.app. All five final public edge checks pass, including exact HTML and full cartridge/Wasm bytes. Evidence: `artifacts/greenway-v5-candidate/vercel-production-edge.json`.

Actual Vercel-origin testing on the immediately preceding e65 cartridge proved threaded startup, copied-save import, native Continue at Theater, language/navigation acknowledgements, byte-identical export of the entire 128 KiB flash plus 16-byte RTC trailer, and a fresh cartridge reload/Continue. The final Greenway cartridge separately passed native migration and exact production-client local Chrome smoke; promotion then passed final-origin byte/header checks. This is not a physical-phone test or a repeated final-cartridge Vercel browser playthrough. Vercel proof: `.worktrees/web-guide/artifacts/interface-qa/vercel-origin-qa.json` and `vercel-save-roundtrip.json`.

To move progress between origins, use the native in-game Save, then **Download save** on the old site and **Import save** on Vercel. Browser snapshots do not transfer between origins. Both sites remain available; no original user save was overwritten. CMP/Fengjia/Maple installations, the Miyahara battle and the focused street-layout increment continue separately behind their native acceptance gates.
