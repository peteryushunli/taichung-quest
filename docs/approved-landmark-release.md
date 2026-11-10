# Approved landmark art release

The ten reviewed replacements (places11–20) are installed over Claude’s latest
expanded city: native baseline `2362263510dfa38987c36b6cc40dca8d9372fc3c`,
frontend baseline `757e90c55551ddbf74e260f181e5a085a9b97920`.
This change does not reconcile or update an older map PR.

The cartridge, landing city map, minimap and ten guide-card crops use the same
art. Native map dimensions, world origins, connections, temple portal coordinates,
object-event templates, streets, sidewalks and canal are retained. Five exterior
maps receive private tileset banks; Xitun is unchanged. The city geometry
fingerprint remains `5ec62740019ae38fcd04d01db282dc9cbef5b9d98374c3f3d3c6a40dfbc6d561`.

## Artwork and placement

- Wanhe and Wenchang temples: original approved temple overlays; entrances retained.
- Botanical Garden, Prefectural Hall, Second Market, Heritage Park: approved
  revision4 centered camera and upward roof depth.
- Confucius Temple: approved revision2 simplified courtyard.
- Yizhong Street, Fengle Sculpture Park, Wenxin Forest Park: approved street/park art.

`assets/landmark-rework-20261110/prepare-native.py` reproduces the installed PNGs.
Repeated facade bays/floors are shortened in source for three tight plots, extra
courtyard margins are removed for Heritage Park, and Fengle uses existing city
terrain behind the exact park features. Nothing is raster-scaled or color-fitted.
Native `data/taichung/approved-landmarks/integration-report.json` records every
placement, sign, collision delta, graphics budget and output checksum. New signs
use actual wooden signposts with the existing landmark scripts.

The installer preserves6,497 borrowed camera-strip cells, door scratch graphics
and flower animation destinations. Claude’s identical still-water frames are
baked without a visual change; the private bank callback animates only flowers,
so reclaimed water/sand graphics cannot overwrite the new buildings.

## Saves and source

Native save version11 refreshes cached map graphics and safely relocates old
saves on newly solid art. The248 repair origins have nearest safe destinations;
party, badges, preferences, items and heal checkpoints are retained. Historical
coordinate migrations run before the new repair. Pending native warps retain
priority.

The public repository carries source assets and `patches/taichung.patch`, not a
ROM or player saves. Build/bootstrap uses the existing pinned FireRed source
workflow. Approved-art strict validation uses a bundled hash-checked baseline;
archived historical suites additionally require their original private Git
history. Live geometry checks always read the actual new maps.

## Validation

- Native cartridge builds with graphics inside hardware limits.
- Live geometry: all six exterior maps, twelve paired rooms and340 directed seam
  cells pass; unchanged geometry fingerprint round-trips.
- Native v11 compatibility:73,301 focused C cases plus102 actual-map historical
  chains,145,526 native warp/facing cases, historical save regressions.
- Exact regeneration of all ten native-fit PNGs; strict art/bank/sign/collision
  guard and fail-closed corruption probes.
- Frontend:51 tests and TypeScript checks; renderer’s lossless PNG and private
  flower-only animation tests.

## Published receipt

Live: https://taichung-quest.vercel.app. [Machine-readable receipt](releases/2026-11-10-approved-landmarks.json).
PR: https://github.com/peteryushunli/taichung-quest/pull/12.

Native source `09534a8786360f3bf1f9013e11ea41d13e8646d8`; frontend artifact
`7623ee172bb318a1f627616d24ddf046ec278243`. Production deployment
`dpl_9TsnUKUqKahUj12L52WLdZqtZbFH` is READY. The cartridge downloaded from
both preview and the public URL matches SHA-256
`400e3237b5640a72d211687c06ec4cb0ca4e4b82af57a232577c0918ff1fee21`.

All ten scenes pass native emulator sign, walking and bike-collision checks;
both temple door round trips pass. A blocked v10 position repairs from17,45
to17,46, then saves as v11 and resets/Continues correctly. All six party slots,
badges/preferences, decoded money/inventory and heal checkpoint remain intact.
These use explicitly synthetic location fixtures derived from genuine SRAM,
normal native buttons and read-only navigation; they are bounded runtime checks,
not a complete city playthrough. Final local evidence is in
`artifacts/downloads/approved-art-runtime/final-acceptance.json`.

The portable patch recreates11,216 source files from pinned upstream, with only
palette line-ending normalization. Strict portable checks and live city geometry
also pass from that replay without private Git history. Eight archived suites
pass with92 reported corruption probes plus OldCity self-tests. Production
mobile/desktop guide smoke passes, with twenty places, no horizontal overflow,
no broken images and no page errors. Preview isolation headers and Wasm MIME pass.
