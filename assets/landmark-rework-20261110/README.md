# Approved landmark artwork

All ten approved landmarks are integrated into the cartridge, city map, minimap
and guide cards. See [release notes](../../docs/approved-landmark-release.md).
Claude’s expanded city remains the base: native2362263, frontend757e90c.
Earlier manifests and revision notes below this directory are art-review history;
the installed native integration report is authoritative for placement/collision.

Revision4 supplies the centered, straight-up roof perspective for Botanical
Garden, Prefectural Hall, Second Market and Heritage Park. Confucius uses revision2.
The original approved temple, street and park artwork supplies the remaining five.

`art-manifest.json` selects the reviewed source PNGs. `prepare-native.py` reproduces
all ten installed PNGs; no image is resized or quantized. Repeated façade bays/floors
are shortened in source for Prefectural Hall, Second Market and Yizhong. Heritage
Park loses only padding/paving columns. Fengle uses native terrain behind its
unchanged lake, bridge and sculpture pixels. These adaptations preserve streets,
canal edges and borrowed camera strips.

```sh
python3 assets/landmark-rework-20261110/prepare-native.py --game-source /path/to/pokefirered --check
```

The original art-review boards remain useful for the approved design. For final
placement, use the regenerated game/guide cards and actual emulator captures.
Reference photographs are not included in this curated source pack.

## Tile and collision limits

The native PNGs use index 0 for transparency, at most 15 opaque colors, and exact
RGB555 colors. The first draft dimensions matched the native landmark rectangles;
revision4 intentionally changes four building footprints. This is
necessary but **does not make them a drop-in ROM patch**. Packed tile IDs and
palette banks still need allocation against every consumer of each shared bank.
Some banks are already nearly full. Inspect the audit and per-scene metrics;
repack/reclaim the replaced graphics or use a private bank before installation.
Do not truncate a tileset or overwrite animated scratch slots to make art fit.

`visual-occupancy.json` in the park/street scenes records opaque pixel coverage,
including paving/grass. It is **not** a solid collision mask. Buildings, water
and sculpture objects need solid collision matching their new outlines; paths
and approaches need to remain walkable. The audit's original clear cells describe
old art placement, and are not by themselves all permanent reserved cells.
Temple/civic manifests describe their more conservative overlay constraints.

After integration, recapture cards from the rebuilt ROM/map renderer and test
walking/biking around the landmarks plus the two temple entrances and all signs.
The overview and context composites here are art reviews, not emulator evidence.

## Regenerate / validate

Run the scene generators within their own cohort folders, then:

```sh
python3 assets/landmark-rework-20261110/parks-street/generate.py
python3 assets/landmark-rework-20261110/revisions-v2/generate.py
python3 assets/landmark-rework-20261110/revisions-v3/generate.py
python3 assets/landmark-rework-20261110/revisions-v4/generate.py
python3 assets/landmark-rework-20261110/review.py
```

The park/street exporter verifies exact reconstruction from the deduplicated
4bpp tile map. The final review script verifies all ten indexed images against
their selected revision dimensions, transparency and hardware color limits,
and records which designs now need a placement update.
