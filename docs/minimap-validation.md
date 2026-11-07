# Minimap client checkpoint — 7 November 2026

Ready independently: the read-only native protocol client, exact-build gate, map projection, compact top-left HUD, remembered game-options preference, bilingual context and native-gated secondary labels. This checkpoint does not claim live client movement against Main's final navigation-enabled ROM or physical-phone verification.

## Compatibility contract

Main confirmed this metadata shape in the ongoing release coordination:

```json
{
  "sha256": "<SHA-256 of loaded ROM>",
  "bytes": 16777216,
  "navigationBridge": {
    "version": 1,
    "size": 48,
    "address": "<numeric exact EWRAM symbol address from this build>",
    "magicA": 1095648084,
    "magicB": 825241686
  },
  "minimap": {
    "schemaVersion": 1,
    "geometryFingerprintSha256": "924380bc2dfe7176686fd81395a52b8489ff18ff6401442acdf06a5d41331722"
  }
}
```

Magic hex values are `414E4354`/`31303056` (`TCNAV001`). Metadata cannot establish a heap offset: the reader scans bounded chunks for matching identity and attaches only to one advancing allocation. Every copy brackets all twelve atomic word loads with the same nonzero even sequence. Unsupported flags, headers and reserved values reject the copy. Busy contexts remain observable for frame liveness but never provide a displayed position.

The mapper data is byte-identical to `42dd4a2:data/taichung/minimap-contract.json`; full-file SHA-256 is `0ad71e905890463d1023ff311ae20334b626c87f6c92eebb24151c191abc671c`. It covers 14 registered maps including Welcome 43:13. Main must validate the native geometry/fingerprint in the exact combined build. Gameplay producer 34540f6 and bike 99e607b are upstream feature checkpoints; no test symbol address is copied into production.

No native source, canonical ROM, central patch, hosting or frozen submission fallback was changed. The browser does not write navigation memory or change emulator speed. F/A and D/B bindings remain identical. D labels and canvas accessibility hints are Bike/Get off only for fresh mapped outdoor state with `CAN_TOGGLE_BIKE`; otherwise Back.

## Validation performed

- `npm test`: 26 passing. New coverage includes exact ROM/geometry metadata, seqlock overlap, invalid/reserved packet values, sole advancing versus static/ambiguous copies, one-second staleness, frame/sequence wrap/reset, immediate browser pause, heap replacement, same-heap EWRAM relocation, positive native eligibility and storage failure.
- Geometry tests project all 8,320 exterior tiles, check all 11 indoor parent mappings including opposite room corners, and reject unknown maps, wrong dimensions/scopes, invalid facing, fractional/out-of-bounds coordinates and unknown context bits.
- Production TypeScript/Vite build passes. Optional browser fixtures build separately and are removed by the final normal build.
- Minimap development fixture: 9/9 browser UI checks pass. Default On, Off persistence for a reconstructed HUD, On restore, mapped tile center, all ten markers, current district, indoor anchor/label, invalid-state cache removal, hidden stale/unsupported state, Chinese context and one full-guide action are covered. This fixture uses explicitly labeled simulated packets, no emulator.
- Existing control/view fixture: 13/13 pass, including F/D/arrow mapping, independent pointer/key holds, drag/cancel, modal isolation, canvas identity, synchronous fullscreen request, options and exit/resume. Pointer capture/core callbacks remain stubbed in that fixture.
- Real old local cartridge: startup reaches `OUT EXPLORING` with exactly one canvas. Missing navigation metadata keeps the HUD hidden and secondary label Back. Game options shows the fallback explanation and the working On/Off selector. Off survives an actual page reload; restored On afterward. City Map opens/pauses, closes, and Back returns to the intro with one canvas and Return to game.
- At 390×844, the development HUD is 77×92px inside a 358×241px synthetic field viewport. At 320×568, real game-options dialog is 282×540px with a 100×44px Minimap selector and no page overflow.

Review artifacts (ignored):

- `artifacts/interface-qa/minimap-development-fixture.jpg` — explicitly simulated data.
- `artifacts/interface-qa/minimap-options-unavailable.jpg` — real app/old ROM fallback.

## Remaining acceptance

Main supplies its tested combined navigation-enabled ROM and exact `build.json`. Then check this actual client while walking/cycling, crossing districts, entering/leaving a gym, changing between Welcome and plaza, opening/closing dialogue, menus, selectors and battles, toggling Bike/Get off, pausing/options/guide, reloading and Continue. Confirm actual player and landmark positions against the native packet, plus no stale Back press mounts the bike. Recheck narrow portrait overlay coverage against real field content and physical phone behavior. Only Main integrates native changes and publishes the combined release.
