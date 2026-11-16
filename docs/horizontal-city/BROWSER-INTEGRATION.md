# Horizontal city browser integration

Source-only integration based on frontend `295eed1`. Native Maps source is frozen
at `ed7808c774bcee0692b7ce10d754206e2c46d9ff` in
`vendor/pokefirered/.worktrees/game-horizontal-city`. This slice contains no ROM,
native source, bridge, capture persistence, shared patch or build metadata change.
It does not publish or claim native capture/runtime acceptance.

The raw `web/src/data/minimap-contract.json` is a byte-exact copy of that native
export: SHA256 `e85324df545afae24bf3cec44c61789fc216b41e06e2ab8d7402db993660abe3`;
geometry fingerprint `61734270b5b95656fff77fea5feb864c401c247fe658040c841d670a3ddc3e37`.
No presentation annotations or copied/fabricated fingerprint were inserted into it.

`city-geometry.ts` consumes actual `roads[].regions[].rect`, bilingual names and
priority, `residence.door/nativeKey/localDoor`, and `placesById` source anchors.
The twenty approved source places participate in pins and nearest-place selection;
the twelve `markersById` entries still mean actual hall entrances. Source ownership
and bounds are checked. `reserved-no-facade` and reserved-interaction entries stay
out of the twenty-place catalog, pins and nearest selection. Invalid source data
cannot fall back to old world coordinates. Guest-house floors explicitly project
to residence door [312,114], never a gym marker or indoor XY; radar hides indoors.
The prior district-local nearest policy remains, with city-wide fallback only in
chunks without placed landmarks. Native `realPlace.coordinates` are used as
longitude/latitude for real-world visitor links, independent of game orientation.

Both catalogs now carry exact source `world` and `artRect` values for the existing
twenty places. Existing landmark native area/layout/local-anchor references were
refreshed from the same source. Some outdoor anchors lie just beyond their facade
envelope; their crops remain the source `origin/size`, without invented padding.
The four reservations have no new art, catalog entry, game status or encounter claim.
The source exports no district label anchor, so old freeway labels do not carry
into the new city. There is no north-up compass.

English and Traditional Chinese copy explains west/Tunghai left, Station right,
the guest-house opening and rare capture unlocks in TEAM. The previous all 150-free
and inside-Station-starter claims were replaced. Existing A/B F/D controls, sound,
native chat, input, selection, language and persistence behavior are preserved;
`main.ts` changes only the new-adventure status sentence. The existing hero reel
and bike screenshot still depict the previous released map; this slice records no
replacement native gameplay footage.

## Source rendering and verification

With Python3/Pillow, run from the frontend repository root, substituting the actual
immutable Maps source path as `--source`:

```sh
python3 -B web/scripts/render-landing-map.py --source /path/to/game-horizontal-city
python3 -B web/scripts/derive-city-art.py
python3 -B web/scripts/check-city-art.py --source /path/to/game-horizontal-city --output docs/horizontal-city/art-provenance.json
python3 -B web/scripts/test-render-landing-map.py
```

Do not run the native city compiler `--install` over Main's integration checkout.
The browser renderer checks export bytes and exported native source hashes before
rendering. It respects each registered bank callback: the approved callback only
owns the flower slots, `NULL` changes no slot, and unknown callbacks fail. Lossless
PNG output retains all facade colors. The full render is 5632×3456; radar 356×220;
all twenty map-view crops derive from exact source facade rectangles. Original
standalone landmark illustrations are unchanged.

`check-city-art.py` reads current native banks independently of the browser
renderer, compares all 76,032 native world cells, then reads the portable frozen
baseline pieces (without building/installing the city) and compares all 2,020
original facade cells. Old signpost removal is Maps' recorded source operation.
It also verifies twenty exact crops, four-color radar dimensions and export
identity. The receipt records native source inputs and output PNG hashes in
`art-provenance.json`. A second render/derive reproduces the same output hashes.

`verify-cartridge.mjs` preserves the original six-field fingerprint for the
released geometry and explicitly supports `horizontal-v1`'s additional fields:
`geometryVersion`, `roads`, `placesById`, `residence`, `exteriorSourceSha256`.
Unknown versions, missing required fields, altered road/place/residence/native
hash payloads and mismatched metadata fail. Source-provenance-only refreshes remain
allowed, matching native exporter behavior. Main owns independent native file,
ELF and ROM pairing checks; this browser verifier is not native-byte acceptance.

Validation: 103 unit tests, TypeScript, direct Vite production asset compilation,
6 renderer tests, native/browser byte identity,76032 projected exterior cells,
2,704 seam edge pairs across 34 directed connections / 12 exteriors, 20 exact anchors,
all 15 interior projections, 19 roads including junction priority and tie hiding,
invalid contexts, residence consistency and four reserved-stop exclusion. The
released 48fe full geometry/sights fixtures retain old compatibility checks.
Unit cartridge bytes are synthetic fixtures, never runtime evidence. Direct Vite
compilation intentionally skips cartridge packaging; Main must supply the matching
integrated ROM/emulator assets. No browser, physical iPhone or native game test was
performed by this slice. Main should verify map labels/crowding at phone width,
new-bank runtime animation/scrolling, doors, Continue, opening and capture flows
on the exact paired integrated cartridge before release.
