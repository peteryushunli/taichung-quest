# Presentation candidate — 7 November 2026

The original submission remains frozen at `submission-2026-11-07`. This increment adds recognizable Old Station, Miyahara and Taichung Park facades and working entrances; a native two-times-speed city bike with safe B-toggle; a read-only live minimap; and Jun-only field/battle art with short English/Traditional Chinese dialogue. Station remains the only active gym challenge. Other leader battles and full authored conversation hubs are not included.

## Exact candidate

- Native source: `d7053fd115b3744b22a2ba3160b4240f5cc80355`.
- Cartridge: 16,777,216 bytes.
- SHA-1: `1d366bfbfa778b25c05e0eda46fbc69b2b1363af`.
- SHA-256: `5f73c133956c9c1d0013748d51d2fdfa2794adb7c1a574a45d58c4064fa3d765`.
- Portable patch SHA-256: `c7ed9aa1dd23ee5728eac53aa57f6e9e0a1db05008793631c39c4d1d3f842c06`.
- Existing 32-byte language bridge and separate 48-byte navigation bridge retain their protocol versions. Addresses are derived from the exact ELF for every build.

## Verification

The native bike measured three frames per tile against the original six, with zero drift and passing collision, door, indoor-B, dismount, held-key and menu-return checks. The first merged opening+bike cartridge also passed actual new-game starter choice and Station entry/return.

The landmark checker passes shared-bank compatibility, 1,530 borrowed border cells, 5,448 unchanged neighboring district cells, protected graphics/animation slots, all door bindings and Main's opening scripts. Geometry export verifies 8,320 exterior tile projections and all 11 interior mappings. The final combined Jun source passes the same checker.

Save-v3 host tests cover all 528 newly invalid cells, all 1,268 retained-safe positions, three-district reloads and protected save data. Actual native Continue and Save confirm both ordinary v2 migration and a synthetic blocked-position v2 fixture. A real older v1 save exposed a separate quest-log Continue path; the fixed path now replays into the correct facade and saves as v3, preserving party, inventory, checkpoint and other variables. The final Jun build retains this fix and adds a guarded same-position refresh for stale Jun object templates.

The minimap client passed 26 unit tests and its browser fixtures. Actual native movement, bike labels, indoor parent projection, hidden menu/replay states, options pause and Return-to-game behavior were checked separately. Final Jun rendering and presenter-save import checks are recorded with the release artifacts before publication; no physical-iPhone retest of this increment is claimed.

The source patch was applied to a fresh pinned upstream archive and all 437 changed files matched the canonical source; 70 palette files differ only by Git-declared CRLF normalization. The production Worker passes 51 complete asset-response checks plus HEAD, routing and errors. The private Site audience remains unchanged.

## One-minute presentation

Use the exported native presenter save and rehearse the route before showing the screen. Back up any existing save first. Import through Game options → Your saved adventures, then Play and Continue offstage. Finish any replay, set Minimap On, and leave Game options open to hold the field paused. Close it at the start of the minute; desktop players should click the canvas to focus F/A, D/B and arrows.

The presentation starts outside Station, tours Miyahara and Park on the bike, and ends by entering Station and talking to Jun. A full battle or victory is not required. The ordinary new-game introduction remains available and unchanged. The presenter save and exact route are separate local release artifacts, not committed cartridges or player data.
