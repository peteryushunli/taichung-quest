# Revision 3 — structural depth for Second Market and Heritage Park

**Superseded by revision 4:** the user wants the existing game's centered roof
perspective, rather than this diagonal view. Use `../revisions-v4/` for current art.

These are the current review assets for **17 and 18**, replacing revision 2.
Landmark 14 retains its simplified revision 2 design. No native game/map,
website, PR, branch history or deployment was changed.

The prior designs read as flat front elevations. These buildings are rebuilt
from explicit projected volumes: front faces, shaded right faces, receding roof
surfaces and overlapping roof levels. All depth runs toward the upper-right.
The source generates native integer pixels directly, with no raster skewing or
antialiasing.

| No. | Current canvas | Structural changes |
| --- | --- | --- |
| 17 | 160 × 144 | Broad sloping metal market roof; raised hall has a visible roof deck and side wall. Thick eaves and projecting awning cast structural shadows. No diagonal ground arms. |
| 18 | 256 × 208 | Two fully extruded pitched-roof halls; both slopes, ridges and side windows are visible. Connecting gallery has a large flat roof deck, parapet thickness and its own side elevation. Metal stack has an oval mouth and curved bands. |

`native.png` is the hardware-palette source. `review.png` is a tightly cropped
3× preview on neutral ground. `preview-4x.png` preserves the full native canvas.
The exports also contain palette, full canvas and deduplicated 4bpp graphics,
flip-aware reconstruction tile map and per-scene manifest. The exporter verifies
pixel-exact reconstruction. All artwork uses at most 15 opaque RGB555 colors
plus transparent index 0.

`object-mask.png` / `proposed-object-cells.json` distinguish architecture and
props from the courtyard and cast shadows. They are conservative placement
references, **not installed or verified navigation collision**.

Claude's current map branch needs to assign placement and tile/palette banks,
refresh all old landmark graphics and collision, retain real sign approaches,
and update the website crops after rebuilding. Do not scale these artworks into
the old flat facade or radial-layout masks. Shared bank capacity remains to be
verified; the unique tile count in a manifest is art cost, not free capacity.

Current exact export costs are 200 packed tiles for the market and 425 for the
brewery, including the empty tile. The brewery exceeds the current 376-tile
static secondary limit by itself. Integration therefore needs a verified split
between primary and secondary graphics, a suitable private bank allocation, or
further pattern reuse; it cannot simply append this art to the existing bank.

Official references remain in the parent `references/` pack and the revision 2
research-photo folder. The art is an original stylized interpretation.

```sh
python3 assets/landmark-rework-20261110/revisions-v3/generate.py
python3 assets/landmark-rework-20261110/review.py
```
