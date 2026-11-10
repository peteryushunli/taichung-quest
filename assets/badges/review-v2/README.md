# Badge clarity revision — review v2

The user liked the palette but found City Pass numbers 3,4,5,8,9 confusing.
They explicitly confirmed City Pass display numbering1–10, rather than the old
board's internal labels00–09. They liked #5's appearance but could not identify
it. This revision retains the exact shared palette and changes those five motifs:

| City Pass | Stable gym index | Landmark | Revised motif |
| --- | --- | --- | --- |
| 3 | 2 | Miyahara | One ice-cream scoop in a tapered waffle cone |
| 4 | 3 | Science Museum | Blue ringed planet; removes the fossil/orbit combination |
| 5 | 4 | Greenway | Long calligraphy brush, separate ink nib and green leaf |
| 8 | 7 | Fengjia | Three grilled pieces on a diagonal wooden skewer |
| 9 | 8 | Maple Garden | Single clean blue water drop; removes overlapping leaf |

City Pass numbers1,2,6,7,10 have byte-identical PNG/SVG artwork to v1.
Both16px and32px exports are updated for the five revised icons. Stable IDs,
gymIndex/completionBit0–9, transparent palette index0, tile order, and palette
entries are unchanged. `displayNumber` makes the1–10 presentation explicit.
The board now uses that display numbering consistently; filenames retain stable
internal0–9 indices for Gameplay. All names/art remain proposals awaiting review.

`clarity-before-after.png` is the focused before/after board. `badge-board.png`
contains the full revised set with native-size samples. The award/City Pass
mockups now use the revised icons; progress remains a static illustration.

Technical contract and screen coordinates are inherited from
`../review-v1/README.md`. This directory is self-contained for Gameplay asset
consumption: indexed PNG/SVG icons, sheets,4bpp tiles andRGB555 palette. Source
`generate.py` needs v1's32px PNGs only to build the before/after comparison.
Run `generate.py`, then `validate.py` with Pillow to rebuild/check. Validation
also proves the five unchanged icons and all palette files are byte-identical
to v1. No game code, save, memory, progress writer, publication or live UI changed.
