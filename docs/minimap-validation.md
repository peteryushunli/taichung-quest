# Minimap client checkpoint — 7 November 2026

The read-only protocol client, exact-build gate, map projection, top-left HUD, remembered preference and native-gated secondary labels now have actual client proof on Main's presentation candidates. The final Jun candidate passes Continue, correct Station facade, Station entry, indoor anchoring, Jun interaction and native battle hiding. Physical-phone and full cross-district route checks were not performed here.

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

Geometry originates in Mapper `42dd4a2`, covering 14 registered maps including Welcome 43:13. The bundled JSON is refreshed from Main's final canonical export; only four `sourceSha256` entries changed, with every map, marker, dimension, transform and the geometry fingerprint unchanged. Current full-file SHA-256 is `60a1ce4847fce4cec1fd26437f92acd00e2ada635eae2e6c80205ab3a5939133`. The original checkpoint's full-file hash was `0ad71e905890463d1023ff311ae20334b626c87f6c92eebb24151c191abc671c`. No feature-test symbol address is copied into production; Main derives the binding from each final ELF.

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

## Actual native-client acceptance

All ROMs below were copied from Main's immutable artifact pairs into this assigned web worktree only. They were verified by SHA-256 before build. The language and navigation symbol addresses come from their exact metadata: 33813640 and 33813676. No native build or canonical change ran here.

1. Bike/navigation `6feb294` / SHA-256 `56077299001da49d11245df4d1b05f2cb24d162537eee9802d63ae5d8c3110ff`: actual Continue, walking from local 30,66 to 30,67, cycling west to 28,67, mount/dismount labels, native Start-menu hiding and closing Back without mounting passed. Station room entry/return was subsequently checked on the combined map candidate.
2. Landmark candidate `26027b7` / SHA-256 `8312d98d550345a8ad45aa0316faa7c569f51e1dcc5b3f9fb86bf55742149fc6`: actual Station room shows the fixed world 112,112 anchor with an indoor label and Back; full exterior return reaches local 32,65 with Bike. Client QA found a genuine legacy Continue defect: an organic v1 quest replay restored the old facade. A full room warp restored the new facade. Both local HTTP ROM and build.json were checked against this exact pair, ruling out simple preview-file caching.
3. Main's targeted quest-replay fix `aff6442` / SHA-256 `d87d63196f6e563067ce03ce276a848482b0bc6bf7abb20260499003711af930`: fresh cartridge boot with the same original native v1 save replays and then shows the correct red-brick Station without a room warp. Native Save produces v3, counter 2, same local 30,66/map 43:0, party 1 / Charmander 5, wild 3 / sight 3, language 2, gyms 0, starter 4, tea 1. The entire party record is byte-identical, and all saved preferences/progress are preserved. The original v1 native file remains intact.
4. Final Jun `d7053fd115b3744b22a2ba3160b4240f5cc80355` / SHA-256 `5f73c133956c9c1d0013748d51d2fdfa2794adb7c1a574a45d58c4064fa3d765`: a second native Continue from the saved v3 checkpoint retains the correct facade at 30,66 and live HUD. Actual Station entry and walking inside retain the authored entrance anchor; F starts the installed Jun sprite's new dialogue. Both dialogue and the actual LEADER JUN battle intro hide/clear the HUD, with D labeled Back. Browser options also pause/hide it. No battle completion or badge award was used as a presentation prerequisite.

Additional live checks on the repaired client: Minimap Off persists after page reload and does not disable fresh native Bike/Get off labels; On is restored. Native menu, quest replay, browser options and full City Map all clear the dot. Back to introduction releases held inputs and pauses; Return resumes the same field coordinate with one canvas and no title/opening replay. The one-second frozen-allocation timeout and same-heap relocation remain covered by unit fixtures; no artificial native hang was injected.

Native save evidence (ignored):

- `artifacts/interface-qa/stale-facade-native-before-reload.sav`: original v1 / counter 1, SHA-256 `f9cfa7286fd0f22def6179028a6e342c941f2a6a480796fbe5d57a9deff30743`.
- `artifacts/interface-qa/questlog-repaired-native-v3.sav`: saved v3 / counter 2, SHA-256 `b6fc0a346cf107088786f8ce42fdfa902b2c370b78736896fb5f67686894f6a4`.
- `artifacts/interface-qa/questlog-v1-v3-preservation.json`: party bytes and preferences comparison.
- `artifacts/interface-qa/minimap-*-live-evidence.json`: DOM HUD/label observations per candidate.
- `artifacts/interface-qa/questlog-repaired-replay.jpg`, `minimap-final-station-indoors.jpg`, `minimap-final-station-after-warp.jpg`, `minimap-final-jun-dialogue.jpg`, `minimap-final-native-battle.jpg`.

## One-minute presenter preload

1. Open the current private release and Play before presenting.
2. Game options → Your saved adventures → Import save. Select Main's exported native presenter `.sav` and confirm. The ordinary cartridge restart returns to the Play gate.
3. Play, select native Continue and finish/skip quest replay before the timer starts. Verify the outdoor field and correct landmark art.
4. Set Minimap On. Leave Game options open to hold the already-loaded field paused.
5. At the start, Close options and click the canvas once to focus desktop F/D/arrows. Touch controls focus it automatically. Resume begins directly in the existing field. The verified alternative is Back to introduction for pause, followed by Return to game at the start.

No new demo mode, save injection API or intro redesign was added. For the minute, navigate the city and finish with F at Jun; a battle is optional. Main's native presenter save owns party, encounter preferences and progress.

## Limits and remaining checks

No physical phone retest, full cross-district loop, direct Welcome-room transition or complete battle/whiteout loop was run against the final Jun pair in this client session. Native owners separately tested those producer/gameplay paths. Existing full City Map remains the fallback if live navigation is unavailable. Only Main integrates native changes and publishes the combined release.
