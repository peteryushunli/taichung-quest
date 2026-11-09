# Approved artwork handoff

Approval recorded 2026-11-09 (Asia/Taipei).

- The user accepted the five clarity revisions with “ok keep these” and requested
  a theater edit. City Pass numbering was explicitly confirmed as 1–10.
- The user then approved the theater stage/curtain revision with “looks good”.
- The approved complete set is `assets/badges/review-v3/` at artwork source
  commit `02a8a39`. This approval-record commit changes documentation only.
- Branch: `codex/landmark-badge-art-review`, from tested PR9 baseline `9c32da1`.

Use v3's entire set: 16×16 collection and 32×32 award PNG/SVG icons, shared
4bpp sheets/tile payloads and RGB555 palette. v3 contains the accepted v2 icons
for City Pass slots 1–9 and the approved new stage icon for slot 10. The
standalone v1/v2 directories preserve review history and are not the final set.

`badge-assets.json` maps exact stable landmark IDs, gymIndex/completionBit 0–9,
and separate displayNumber 1–10. Native palette index 0 remains transparent.
`README.md` and `../review-v1/README.md` document tile layout and mockup positions.

Validation passed: 20 indexed icons, 10 unique silhouettes, shared palette,
RGB555 roundtrip, raw tile decode roundtrips, three 240×160 mockups, and exact
byte equality for the nine retained v2 icons and both palette exports.

Main coordinates build/PR/release; Gameplay owns native integration. This
artwork branch does not change game code, save state, earned mask, game memory,
battle results, payouts or reward writing. Award and City Pass images are
presentation mockups; the native implementation and final integration checks
remain with Gameplay/Main. No publication was performed from this branch.
