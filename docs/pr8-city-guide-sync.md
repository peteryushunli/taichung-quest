# PR8 frontend map/catalog sync — validation

Prepared in `codex/pr8-city-guide-sync` from Main's combined frontend source
`f1f6f8fb088bffacd7a515c4bd2f15bbb9008852`. The earlier isolated gym branch
`codex/gym-status-updates` remains preserved at `8507bcf`.

This is a bounded frontend review fix for draft consolidation. It does not
accept native gym outcomes, temple visits, navigation or the combined ROM.
Main owns PR8 integration and publication; Gameplay retains its UI lease.

## Source facts

- The provided minimap contract is 120×176, with five exterior world rectangles:
  Old City `[80,48,120,120]`, Greenway `[40,32,80,104]`, Xitun `[0,0,40,64]`,
  Nantun North `[0,64,40,104]`, and Nantun Wanhe `[0,104,64,176]`.
- Nantun North and Wanhe are two exterior areas in the same Nantun district.
  The catalog therefore has four districts, twelve stops and ten gyms.
- Wanhe Temple / 萬和宮 and Wenchang Temple / 文昌公廟 are native visit stops,
  not gyms. The supplied contract places their doors at local `(26,33)` and
  `(16,33)`, world `(26,137)` and `(16,137)` respectively.
- Names, hall/host behavior and non-gym classification were checked against
  `data/taichung/nantun/temples-plan.json` and `data/scripts/taichung_city.inc`
  in the read-only `.worktrees/game-pr8-combined` source at `9070c6f`.
  No new history, address, official URL, artwork or badge was invented.

The contract file is unchanged, SHA-256
`9b4159cbb1e850ee834910a711e447bf14298af545d73e4b0220d0b8b012cfca`.

## Behavior

The full City Map now draws its five shapes from the contract world rectangles,
uses its world aspect ratio at every viewport, and projects all twelve markers
at entrance tile centers. Bilingual area labels follow those shapes. The guide
and landing headline derive their four-district/twelve-place counts from the
catalog.

Temple cards say Visit and offer hall/host information. They omit gym leaders,
teams, stamps, official links and real-world addresses. The guide does not draw
invented temple sketches. The landing uses its existing neutral card treatment.
Gym summaries and passport stamps include only the ten gyms. Pending and unknown
gym statuses continue to hide leader identities.

The first ten catalog entries, all native portrait/team bindings, every existing
asset, map art, minimap runtime, controls, main entry point and onboarding source
are unchanged from the combined base. No native or contract source was edited.

## Validation

`npm test` passed 50/50 tests, including five exact map shapes, the twelve-stop /
ten-gym split, both temple anchors, optional secure links, pending/unknown leader
suppression, all-open-gym art bindings and the existing native team order fixture.
`npm run build` passed TypeScript and production bundling with existing local
dependencies; no package or lockfile changed. A base comparison verified the
preserved catalog entries, contract, assets, bindings and runtime/control files.

No browser action, screenshot, native UI test, push, PR mutation or deployment was
performed. Responsive appearance and combined native runtime remain unverified
by this patch and must not be inferred from source/unit/build checks.

Matched-client followup: frontend36d627e with native6366 / ROM9550aaff passed
the five-shape120×176 guide, twelve stops, ten stamps and both Visit cards at
desktop and390px. Native combined migration and facing acceptance is recorded
separately in `city-batch-release.md`; the original source-only scope above is
retained as preparation provenance.
