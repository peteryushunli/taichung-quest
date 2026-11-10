# Revisions to landmarks 14, 17 and 18

**17 and 18 are superseded by revision 3.** Their current assets and structural
perspective handoff are in `../revisions-v3/`. Revision 2 remains current for 14.

These replace the first review designs for these three landmarks. Artwork only;
not installed in the game or deployed. The other seven landmarks are unchanged.

| No. | Landmark | Revision | Canvas |
| --- | --- | --- | --- |
| 14 | Confucius Temple | Retain main hall; replace the lower precinct with a low terrace and plain forecourt. No second gate, pool, bridge, enclosing walls or foreground rails. | 160 × 144 |
| 17 | Second Market | New compact market frontage: raised brick core, shaped plaster parapet and low entry bays. Remove the diagonal arms and long rear roof entirely. | 128 × 128 |
| 18 | Cultural Heritage Park | New connected brewery composition: plaster hall, brick gable, silver chimney and continuous factory-window gallery, with a shallow courtyard. No scattered warehouse rows or floating barrel props. | 224 × 192 |

The user explicitly freed Second Market from the original shape and requested
Heritage Park be redesigned from scratch. **Do not force these two back into the
old 112 × 144 and 176 × 288 masks**, or clip them to the old clear-cell stencils.
Their new map placement, footprints, frontend crops and collision need updating
on Claude's current map branch when these designs are integrated. No old native
branch reconciliation, PR/main edits or native source changes are included here.

Each folder includes indexed `native.png`, `preview-4x.png`, palette, raw and
flip-deduplicated 4bpp tiles, reconstruction tile map, per-scene manifest and an
`object-mask.png`. Object masks distinguish architecture and props from walkable
steps/courtyard, and are proposals rather than installed game collision.
Confucius Temple's existing sign cell (4,8) stays transparent; its remaining old
lower precinct graphics and collision must be removed on installation.

Original pixel construction uses official photo references already recorded in
the parent `references/` pack. The two photos in this revision's `references/`
folder are research inputs, not pixels embedded in the shipped art.

```sh
python3 assets/landmark-rework-20261110/revisions-v2/generate.py
python3 assets/landmark-rework-20261110/review.py
```

Tile reconstruction and hardware palette checks run during export. Tile-bank
capacity and in-game navigation still need verification during integration.
