# Next build integration — 7 November 2026

This is an integration record, not a deployment receipt. The private Site continues to serve the tagged presentation build until the combined candidate passes release checks.

## Integrated source

- Theater map `76832f0`: approved facade and enterable hall, stable entrance/return bindings, native walking/cycling, collision, Save/Continue and both Greenway crossings verified by Maps. No Theater battle is implemented.
- Save upgrade `ad9e683`: version 4 refreshes Xitun for v3 saves and repairs exactly 33 newly blocked positions. All 1,516 retained-safe positions remain unchanged. Earlier saves retain the existing OldCity migration chain. Host tests protect party, inventory, checkpoint, preferences, progress and native pending returns.
- Character slices `171151d`, `8aa5a94`, `102b575`, `f943b1d`: Lian, Peiqi, boy core poses and the seven other landmark hosts. Existing host positions and scripts remain unchanged. Portrait registration does not activate a battle. Boy auxiliary item/surf/fishing/VS Seeker art and the girl trainer are outside these slices.
- Supporting characters `ac0e069` + `a9587ae`: six support sprites and five optional hall NPCs, with short bilingual greetings. All five legacy-player overlap cases passed native Continue and movement checks; only the new NPC moves aside.
- Web `ad3951d` + `0ac4cef` + `9be219f`: City Map controls have at least 44-pixel touch targets; compact bilingual minimap names fit small screens and retain full accessible names. The actual production map remains square under shared button styling.

The original presentation tag, cartridge, presenter save and deployment archive are preserved. Native runtime migration tests use a separately frozen cartridge and copied saves. Synthetic position fixtures are explicitly labeled; original saves are never overwritten.

## Validation and publication

All four bounded Theater-v4 cases pass: organic v1 quest-log, synthetic invalid/safe Xitun positions, and organic post-install v3 Xitun Continue/Save. Protected data remains unchanged except the save version. Combined cast fresh opening and actual Jun portrait/boy back-pose battle intro also pass. Actual browser Theater door/guide/pause/second Continue and v3→v4 Save pass. Park's complete native acceptance passes on its isolated frozen cartridge, including genuine defeat, cross-hall notice lifetime, retry cancellation, authored moves/full PP, held-mail item/index retention, genuine victory preserving Jun, and original/fresh-Continue repeats without new awards or preparation. The combined source passes progress, party, save and character host tests. Final combined runtime, production asset checks and deployment remain pending. No organic pre-Theater v3 Xitun fixture is available; the synthetic position cases and post-install organic fixture are labeled separately. Further gym work is included only when its independent and combined checks pass.

Checker-only commit `16625bd` permits just the two approved Xiaoyu graphics substitutions, retaining full type-sensitive map comparisons. All map/bank/seam and adversarial fault probes pass. Separate immutable graphics/NPC attestations preserve Theater’s exact 33/1,516 position semantics.

Main is the sole canonical integration and publication owner. Feature work continues in isolated checkouts; source, cartridge and evidence hashes identify each reviewed handoff.

## Frozen combined cartridge

Native source `e65ee871fa62d10d9670e1c4e34602678f1a1d7d`; SHA-256 `e4d906ec91ca7d286aa2a8b4c7874ab23c8cc71ae6d5d7f11f506167db99ec96`; SHA-1 `1d65a78aae686eca5b41f00cbf90fd0591d9128a`; 16,777,216 bytes. Language bridge address 33813644, navigation bridge address 33813680; protocol versions remain 1. Geometry fingerprint remains `924380bc2dfe7176686fd81395a52b8489ff18ff6401442acdf06a5d41331722`. All 382 released glyph rows/codes remain exact, with 35 appended Park glyphs (417 total).

Park integration commits: `a751821`, `c8e5da1`, `14eed79`, `3b3ca4a`, `7360766`; acceptance documentation `698b2a6`; final map provenance `e65ee87`. The v4/reset conflict was resolved by retaining the complete v4 tests and adding the separately reviewed transient-reset hooks and tests.

Further Greenway facades, Miyahara battle activation and the girl trainer remain outside this frozen release. The existing presentation fallback stays available. Vercel migration follows publication and verification of this build, using the complete prebuilt artifact and native save export/import across origins.
