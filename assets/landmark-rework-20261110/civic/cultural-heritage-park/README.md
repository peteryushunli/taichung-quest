# Cultural Heritage Park — native scene art review draft

Original code-authored pixel art, researched from primary official photos.
No photo pixels are converted or copied into the asset. This is map-intended
building artwork, not a website card replacement. The user approved badge style
is the visual reference: crisp contour, deliberate material clusters and small
highlights. This new landmark artwork remains pending review.

## Visual design

Pale plaster gable, brick brewhouse, tall metal chimney, large green factory window grids, sawtooth daylighting roof, industrial annex, loading shed and painted storage vessels. This is a compressed composition of the former brewery, not a measured building plan.

## Exact native binding

- Audited native source: `2362263510dfa38987c36b6cc40dca8d9372fc3c`.
- Read-only source: `/Users/peter/devday_hackathon/.claude/worktrees/native-gym-text-fixes-a79571/.worktrees/game-gym-text`.
- Map: `MAP_TAICHUNG_NANTUN_WANHE`, local origin `[65, 17]`; footprint `[11, 18]`16px cells.
- Native export: `176×288` pixels.
- World rectangle is half-open: `[60, 121, 71, 139]`.
- Current map byte hash: `b325c857db699047132d568a131521e4f8fe6f105c6dc8a8359b45d308de9ff3`.

Architecture stays within the four existing warehouse envelopes and four vessel cells. The east spine, cross-aisles and southern sign stay clear/visible. Existing drawn door anchors88,72;56,152;136,152;56,248 remain visual entrances, not new native warps.

`constraints.json` contains the exact audit record, hard event reservations and
bank caveats. This draft conservatively leaves *every* currently clear native
cell transparent. The updated audit says these are reference geometry, not all
hard reservations; this handoff proposes no collision changes. Native door,
approach and arrival are null for this outdoor visit scene. Event scripts and
metatile behavior are not rewritten. Scene sign interactions and layer priority
still need Claude's eventual native integration check.

## Delivered files

- `native.png`: indexed4bpp artwork on transparent index0; the actual asset.
- `preview-4x.png`: integer enlarged artwork on a plain review background.
- `context-native.png`, `context-preview-4x.png`: illustration over ground from
  the exact audited native map; these RGB context images are not tileset assets.
- `current-native-reference.png`: read-only crop rendered from that native source.
- `comparison.png`: honest current-source vs redraw at3× nearest-neighbor scale.
- `tiles.png`, `tiles.4bpp`, `tilemap-u16.bin`: deduplicated local8×8 tiles,
  packed low-nibble-left4bpp bytes and little-endian local tile indices.
- `palette-rgb555.bin`:16 exact little-endian GBA palette entries; index0 transparent.
- `occupancy-mask.png`: asset alpha mask; not a replacement native collision mask.
- `metrics.json`, `validation.json`: dimensions, occupied pixels/cells, tile
  counts, audit binding and SHA256 checksums.
- `generate.py`, `finish.py`: self-contained code source/reproduction checks.

## Tile and palette budget

15 used opaque colors plus transparent index0; all palette
RGB channels are multiples of8 and losslessly fit RGB555. Footprint contains
7928×8 cells, of which 347 contain artwork.
203 unique exact8×8 tiles including the
transparent tile; 193 unique under H/V
flips. Packed exact atlas: 6496bytes. Asset pixel occupancy:
39.4%.

These are artwork pattern counts, not incremental bank allocation or spare-slot
claims. Existing banks are heavily occupied and shared. No palette slot, VRAM
range, retained-definition replacement, donated strip, runtime behavior or save
migration is allocated. Claude owns reconciliation and native integration.

## Verification and reproduction

With Python3 and Pillow, run `generate.py`, then `finish.py` from any cwd.
The finish script reads the source named in `constraints.json`; it rejects map
bytes changed since the audit. It validates indexed4bpp dimensions, ≤15opaque
colors, transparent0, zero opaque pixels in retained clear cells, pixel-exact
raw-tile/tilemap decode and unchanged sign crops. All checks pass.

Only this asset directory is written. No map, native source, shared patch,
Claude checkout, Git branch/PR or publication was changed. Context renders are
static evidence; no runtime or physical-device acceptance is claimed.

## Official research

- [Official page](https://travel.taichung.gov.tw/en/Attractions/Intro/1053) · [Inspected official photo](https://taichung.travel/content/images/attractions/3718/1024x768_Filedata635186402486052109.jpg) — factory gables, red brick base, green window ribbons and tall metal chimney.
- [Official page](https://travel.taichung.gov.tw/en/Attractions/Intro/1053) · [Inspected official photo](https://taichung.travel/content/images/attractions/50403/1024x768_image637714406033891192.jpg) — industrial yard context; historic brewery complex.
