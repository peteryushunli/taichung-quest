# Landmark badge artwork — review v1

Isolated artwork branch `codex/landmark-badge-art-review`, from tested PR9
`9c32da1`. Names and motifs are proposals from Story's `content/story/badges.json`;
these files do not approve those names, grant progress, or implement a native UI.
Gameplay owns the eventual native implementation. Main owns integration/release.
No save, completion mask, game memory, game source or production asset is changed.

## Review images

- `badge-board.png`: all ten labelled motifs, 16×16 and32×32 native-size samples,
  and integer enlarged award variants.
- `award-and-city-pass-board.png`: 3× nearest-neighbor presentation of two
  native-style240×160 mockups. These are illustrations, not game screenshots.
- `award-mockup-240x160.png`: example Old Station award.
- `city-pass-partial-240x160.png`: sample mask0x055 (gym indices0,2,4,6), selected0.
- `city-pass-all-earned-240x160.png`: all ten earned, sample mask0x3ff.

Original pixel artwork is deterministically drawn in `generate.py` using integer
coordinates. No AI raster generation, outside illustration or native screenshot
is used. The5×7 lettering is an authored review font, not a replacement for the
native game's existing EN/ZH renderer. Board labels use macOS Menlo for review
only. Gameplay should render bilingual strings using its native font pipeline.

## Art direction

A single dark one-pixel contour, upper-left enamel highlights, and restricted
warm/cool fills match the existing game's small pixel-art vocabulary. Each
landmark has a distinct silhouette so identity does not depend on color alone.
At16px: clock/rails, pavilion/water, dessert/crystal, fossil/orbit, brush/leaf,
stitched patches, palette, bowl/steam, waterdrop/leaf, and stage/masks.
The32px versions keep that silhouette and add a one-pixel enamel glint.

Use16px in the collection,32px on the award screen. Upscale only by integer
nearest-neighbor factors; for web reuse set `image-rendering: pixelated`.
SVG files are exact per-pixel vector equivalents, without filters or smoothing.

## Native asset contract

`badge-assets.json` maps exact stable landmark IDs and gym indices0–9. Collection
slot labels1–10 are display numbering only, never new bit positions. For indexi,
earned means the existing recorded native mask has bit `(1 << i)` set. Do not
infer an award from navigation, viewing a card, rematch selection, loss, decline,
or party replacement. Do not allocate another progress writer or schema.

Each individual PNG and horizontal sheet is indexed4bpp with16 shared palette
entries:0 transparent,1–15 opaque. All RGB channels are multiples of8 and are
representable by GBA RGB555. The native PNG palette and raw assets use the same
indices. Do not independently requantize an icon or remap transparent index0.

- `landmark-badges-16-sheet.png`:160×16, indexi at x=i*16.
- `landmark-badges-32-sheet.png`:320×32, indexi at x=i*32.
- `landmark-badges-16.4bpp`:128bytes/icon,1280bytes total.
- `landmark-badges-32.4bpp`:512bytes/icon,5120bytes total.
- `palette-rgb555.bin`:16 little-endian halfwords,32bytes total.
- `landmark-badges.pal`:JASC palette for conventional asset tools.

Raw tiles are grouped by gym index, then8×8 tile rows, then tile columns. Pixels
within a tile scan row-major; the left pixel is the low nibble, next pixel high.
This is a1D sprite tile arrangement; adapt native OAM/tile allocation deliberately.
No native palette bank, OBJ slot, VRAM address, animation slot or sound is assumed.

## Screen layout proposal

Award canvas240×160: title band y0–22; award stage x8–231,y27–111;
32px icon x104,y45; native dialogue area x5–234,y116–156. Keep existing native
message-advance/input and battle-result ACK lifecycle. Show the matching badge
only after a matching real win has been recorded. A repeat win must not grant
another badge; its dialogue can acknowledge an already-earned badge separately.
No invented payout amount is included; independent payout fixes can ship alone.

City Pass: five columns × two rows in fixed gym-index order.16px icons inside
36×33px slots. Active slot uses a gold border; earned badges use full color,
unearned use embossed silhouettes. This is a structural distinction, not only a
hue shift. Detail frame x5–234,y111–155 holds the selected badge/landmark and
existing native A/B instructions. Native code should preserve its current menu
input, cancellation, save lifecycle, locale and progress contracts.

## Reproduction and checks

Requires Python3 and Pillow. On the current workstation:

```
/Users/peter/.pyenv/versions/3.11.15/bin/python3 assets/badges/review-v1/generate.py
/Users/peter/.pyenv/versions/3.11.15/bin/python3 assets/badges/review-v1/validate.py
```

Validation checks IDs, dimensions, shared palettes,4bpp transparency, unique
silhouettes, exact raw-tile decode roundtrips and RGB555 palette roundtrip.
There is no native gameplay or physical-device acceptance claim for these assets.
