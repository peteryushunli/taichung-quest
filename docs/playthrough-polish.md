# Playthrough polish

This release builds on PR9/main `9c32da1` and native `2c48f28`.

The native City Pass replaces text-only completion markers with the ten approved landmark badge icons. Locked badges keep a muted silhouette. A new registered challenge victory shows the matching badge and fanfare once; existing legitimate saved wins populate the collection without replaying awards. The ten saved completion bits retain their existing IDs. Registered gym victories skip the stock trainer cash award/message; ordinary trainer rewards and Pay Day remain unchanged.

Local player presentation uses grammatical English second person or Traditional Chinese 你 in battle messages, field prompts, Continue/Save stats and the local trainer card. Saved trainer identity, party and original-trainer records are preserved.

Twelve signs introduce the ten gyms and two existing temples with source-backed facts. Optional leader/temple conversations retain25 core history pages per language. Ten gym helpers offer11 additional pages in their own voices; their personal feelings and props are fictional. Five existing custom helpers are reused and five leader-only halls receive one stationary helper using existing native art. Challenge remains the first direct menu choice, and facts remain available after a win. The compiled source snapshots retain primary-source URLs and claim boundaries.

Peiqi uses the revised full-body portrait after inspection in an actual Miyahara battle introduction. The web portrait is a byte-identical copy of the native64×64 indexed PNG. Generation prompt, format checks and stage-review provenance are in `assets/portraits/peiqi-v5/`. The earlier waist-up draft is superseded.

New staff cache handling preserves the player’s saved position and facing. If an old player save occupies the new helper square, only the qualified helper moves to the reviewed adjacent fallback. No save structure/version change or map expansion is introduced. Existing Chinese glyph mappings and bitmap rows stay fixed; Main appends only missing final-copy glyphs.

## Validation

The combined native source is `0a24efb7cb194e6faed14c363c586410a772bbaf`; the 16 MiB cartridge SHA-256 is `f8c5e84cbbdbc8a65f6f8f6b7a0c7eb535acc807af489de490aaa28285f68f65`. Its frozen ELF independently reproduces the cartridge, and the exported patch recreates the exact native source tree from the pinned upstream commit.

Actual cartridge testing covers a registered Miyahara victory and its badge popup, unchanged ¥12600 balance, full-body portrait, completed-challenge menu, and Save/Reset/Continue without a duplicate award. A genuine released-v9 save at Miyahara (3,9), facing left, retains its position and facing while only the new helper moves aside. A genuine old ten-win save displays every approved badge. Protected-state comparisons preserve all six party slots, bag, money, identity, options, flags and all 256 variables for the old-save checks. English and Traditional Chinese Save/Continue recap text uses You / 你.

Source and actual-C suites cover all ten award IDs and old completion masks, both locales, sprite image copying, scene input/resource cleanup, 3,232 money-path cases, optional history routes, 204 facing cases and all five added staff placements. Existing map/collision guards and their corruption probes pass. Original Chinese glyph IDs and bitmap rows are preserved; the final font contains 757 glyphs. No map geometry or save version changes.

All 50 web tests, TypeScript and the production build pass. The final cartridge launches through the website into the native tutorial in fullscreen, with the sound switch beside Game options working in both directions. This is desktop Chrome verification; physical iPhone testing is not claimed for this batch. Hosted preview asset hashes and isolation headers are verified separately before publication.

Detailed local receipts and screenshots are under `artifacts/playthrough-polish/`, including `native-final/runtime-acceptance.json`, `portable-patch-proof-final.json`, `client-final/` and `release-final/`.
