# Prefectural Hall — native scene art review draft

Original code-authored pixel art, researched from primary official photos.
No photo pixels are converted or copied into the asset. This is map-intended
building artwork, not a website card replacement. The user approved badge style
is the visual reference: crisp contour, deliberate material clusters and small
highlights. This new landmark artwork remains pending review.

## Visual design

Pale corner entrance with columned loggia and balustrade; dark slate mansard and round dormers; long red-brick wing with arched upper windows and pale storey bands. The corner is compressed to the existing left-hand entrance mass; no clock is invented.

## Exact native binding

- Audited native source: `2362263510dfa38987c36b6cc40dca8d9372fc3c`.
- Read-only source: `/Users/peter/devday_hackathon/.claude/worktrees/native-gym-text-fixes-a79571/.worktrees/game-gym-text`.
- Map: `MAP_TAICHUNG_OLD_CITY`, local origin `[13, 36]`; footprint `[10, 10]`16px cells.
- Native export: `160×160` pixels.
- World rectangle is half-open: `[93, 84, 103, 94]`.
- Current map byte hash: `db927471580e13be8d3a990cb61556af5e8c5500c5d4cc6b2c7645d98314234f`.

Existing building remains in the top five16px rows. The current lower forecourt, lawn and riverside sign are retained. Visual doorway anchor24,72 is not a new native warp.

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

13 used opaque colors plus transparent index0; all palette
RGB channels are multiples of8 and losslessly fit RGB555. Footprint contains
4008×8 cells, of which 168 contain artwork.
81 unique exact8×8 tiles including the
transparent tile; 81 unique under H/V
flips. Packed exact atlas: 2592bytes. Asset pixel occupancy:
39.5%.

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

- [Official page](https://travel.taichung.gov.tw/en/attractions/intro/1367) · [Inspected official photo](https://www.taichung.gov.tw/media/468752/台中州廳.jpg) — pale corner portico; slate mansard; columned loggia; red brick wings.
- [Official page](https://english.taichung.gov.tw/3390771/post) · [Inspected official photo](https://english.taichung.gov.tw/media/1477198/由南翼俯視臺中州廳建築_0.jpg) — repeated arched wing windows; horizontal pale bands; round-headed dormers.
