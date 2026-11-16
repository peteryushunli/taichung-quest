# Browser geometry adapter — independent frontend slice

Owner: Interface and controls. Checkout `.worktrees/horizontal-city`, baseline
PR18 `8bdc3b3`. Maps owns all actual native geometry and the exporter. No
provisional world dimensions or native map changes are included here.

The shipped contract remains unchanged for this first slice. Its exact
fingerprint `48fe4ba5…127e92a` alone permits the legacy eight outdoor sight
coordinates, four district-label anchors and home coordinate. For any other
fingerprint, only exported markers and presentation anchors can be displayed.
This prevents a new city layout from silently inheriting old catalog positions.
The minimap's N tab is removed. The City Guide describes game orientation and
retains official visitor links, with Google Maps links using real catalog GPS.

## Proposed presentation boundary for Maps' forthcoming export

`city-geometry.ts` is the single adaptation point. The current adapter accepts
an optional `presentation` object inside the existing geometry contract:

```json
{
  "presentation": {
    "geometryFingerprintSha256": "same exact 64-character geometry fingerprint",
    "homeWorld": [0, 0],
    "districtLabels": [{"label": "CITY 舊城", "world": [0, 0], "sign": false}],
    "streets": [{
      "id": "stable-road-id",
      "name": {"en": "Taiwan Boulevard", "zh": "臺灣大道"},
      "worldRects": [[0, 0, 1, 1]],
      "priority": 1
    }]
  }
}
```

Coordinates above illustrate types only, not actual street locations. Rects
are half-open world metatile regions `[x0,y0,x1Exclusive,y1Exclusive]` in the
same zero-based x-right/y-down space as navigation projection. A street can
have several rectangles across chunks. At overlapping junctions, the highest
explicit priority wins; tied roads hide rather than guessing. Invalid,
unbounded, duplicate or mismatched road data hides the label. Text is assigned
through textContent. Missing annotations also hide it.

If Maps exports different field names, adapt that actual schema here; do not
modify native exporters to satisfy a speculative UI draft. Road geometry and
names must be part of Maps' authoritative exported source/binding. A copied
fingerprint is not independent proof the road regions match the cartridge.

`markersById` must carry every actual placed catalog stop. The adapter checks
that each marker is inside its declared exterior chunk. Catalog entries can
remain available for visitor information without a fabricated game pin when
not yet placed. New home and district label anchors must also come from Maps.
No new unbuilt stops are inserted into the playable catalog in this slice.

## Street label behavior

The real DOM component is mounted lower-right in the existing game screen and
uses the same `canPlayGame()` and fresh read-only native navigation state as the
minimap. It stays on a named road while stationary or cycling, independently
of the minimap preference. It clears all cached text/identity off-road, on
unknown maps or dimensions, indoors, menus, dialogue, battles, pauses, options,
view changes, stale packets and unsupported ROMs. Native chat, A/B terms,
keyboard F/D, sound and input/no-selection implementations are unchanged.

The existing navigation metadata still requires exact ROM SHA256, byte count
and matching geometry fingerprint before any live navigation is attached.

## Validation and review boundary

Unit tests cover arbitrary dimensions/chunk keys, cross-chunk road continuation,
intersection priority, stationary/facing/bike changes, invalid contexts and
stale/malformed bindings. The real HUD browser fixture supplies an explicitly
simulated road region for layout checks; it is not a new native map and does not
prove new marker synchronization. Main must bind the actual Maps export, update
map render/radar art and catalog anchors, and run combined native acceptance.
Main alone integrates/exports/publishes. This slice does not publish or touch
native source, shared patches or old Claude worktrees.
