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

Runtime acceptance and final build identifiers are recorded when publishing.
