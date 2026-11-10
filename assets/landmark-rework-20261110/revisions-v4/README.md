# Revision 4 — match the centered in-game camera

Current review art for **13 Botanical Garden, 16 Prefectural Hall, 17 Second
Market and 18 Cultural Heritage Park**. This supersedes all prior drafts for
these four. Landmark 14 still uses its simplified revision 2 artwork.

The user pointed to the existing National Taichung Theater as the camera
reference. `references/theater-native-4x.png` is a read-only source-map crop of
that building, rendered from the native source pointer already recorded in the
parent folder. It is an art-camera reference, not a live emulator screenshot.

## Camera rule

Front walls remain level and frontal. Roof depth extends **straight upward**;
left and right roof edges inset evenly about each building volume's own center.
Pitched roofs keep both ridge endpoints on that centerline. Mansard and flat
roofs reveal centered top planes and balanced end caps. There is no sideways
depth offset, exposed rotated right wall, side window elevation or diagonal
ground platform. Light and shadow still distinguish roof surfaces.

| No. | Native canvas | Revision |
| --- | --- | --- |
| 13 | 208 × 144 | Centered curved glass roof, paired masts and front mullions. Butterfly and pond remain foreground identifiers. |
| 16 | 192 × 160 | Level pale pavilion and long brick wing, each with a centered mansard roof/top plane. |
| 17 | 160 × 144 | Market roof and raised hall share their centerline; rear roof edges inset equally. |
| 18 | 256 × 208 | Both pitched factory roofs recede upward centrally; connecting gallery has a centered flat roof. |

Each folder includes indexed `native.png`, neutral-ground `review.png`, full
canvas `preview-4x.png`, palette, 4bpp tile packs, exact reconstruction tilemap,
per-scene manifest and proposed object masks. All graphics are constructed as
native integer pixels, not skewed raster facades. The exporter checks exact tile
reconstruction, and the source asserts equal rear-edge inset/roof centerlines.

## Integration boundary

**Artwork review only, not installed or deployed.** Original native dimensions
and map coordinates are history, not a placement instruction for these new
canvases. Claude's current native branch owns tile/palette allocation, placement,
sign approaches, collision, card crops and rebuilding the portable patch. Do not
clip the art against older masks or reconcile an older Codex map branch.
Prefectural Hall's taller facade needs its sign placed in the new forecourt,
rather than punching the old sign location through the wall.

Object masks distinguish buildings, water/sculpture objects and props from
walkable steps, paving and shadows. They are conservative artwork references,
not verified native collision. Unique tile counts are art costs; available bank
capacity and animated scratch reservations still require integration checks.

```sh
python3 assets/landmark-rework-20261110/revisions-v4/generate.py
python3 assets/landmark-rework-20261110/review.py
```
