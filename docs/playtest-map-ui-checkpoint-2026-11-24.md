# Playable map and UI review checkpoint

This protected PR25 checkpoint combines 55 resident patrol improvements, Museumbrary's single encounter sign, the visible Lin Hotel sign, the Theater lawn and aisle fixes, matching Greenway flower animation, the compact pause screen, native badge awards, crisp foreground leaders and lifted loading artwork. It retains 75 outdoor people and ten active gyms. Original bilingual leader introductions and expanded Tiger City history are included. Encounter saving retains the full durable native save while temporarily accelerating only the save window.

The three optional trainers retain their previously qualified movement. Their newer paused modes, stronger gym rosters, leader-win dispatch and subsequent TEAM changes remain separate acceptance work. The original leader-win text module is compiled but the new loss dispatch is not claimed by this checkpoint. No capture species or stable bits change here.

## Reproducible source and pairing

- Native source: `28d8b416307facec811d73359d54a52b661468de`, isolated `game-map-ui-checkpoint-2026-11-24` worktree.
- Cartridge SHA256: `408bb4da7dededc297945266b8f7e32cbc6fe433f13a0b734d8b993481dc03de`.
- ELF SHA256: `7140c8c34d1a68247012d90d53b901cd392b587e037761ef7b5be25819c13d55`.
- Active map fingerprint: `9264b2c250859f1606d58f0800bc6d84a2de93cb094766819f2d856b0454b7c4`.
- Native historical minimap source contract remains unchanged. The frozen native release-pair verifier checks it separately from the current Boulevard display binding; the browser cartridge verifier checks the active geometry.
- HD export compares all76 reference maps with the prior verified cartridge. Exactly37 exterior cells and28 Theater interior cells change pixels. All approved pictures and nine tower masks remain exact. The final render uses byte-identical background resources from the full integration build; the source difference is limited to the three retained trainer movement modes and authoring metadata.
- The overview is retained outside those37 exterior cells. Radar uses the compiled current collision report. The Lin marker resolves to the visible post; its explicitly registered original guide remains playable without creating a second marker.

## Verification

Full native build, all340 regenerated outputs and all54 outdoor sections pass:40,165 walkable tiles and186 directed connections. Existing native suites pass:58 actor/cache bindings and protected save bytes,2,206 Theater cache cases,29,814 exact-cell Continue cases, and actual compiled bilingual leader strings. All146 web tests and TypeScript pass after the final map export.

Focused native acceptance on this exact ROM/ELF is recorded in `artifacts/qa/2026-11-24-map-checkpoint-final/FINAL-ACCEPTANCE.json` in the shared project. Unchanged ordinary old saves retain party, progress, language and facing. The old Theater save clears the stale seat cache and traverses the new center/side aisles to Ling, Boxun and the exit. The old Lin post-cell save relocates to its exact safe approach and escapes. Both reported resident cases pause, turn on both axes, speak and resume. The Theater bike test explicitly records raw flags111 before and after each of four outward and return seams; native bit32 is asserted, rather than inferred from a test label.

Assembly evidence is retained under `artifacts/playtest-followup-2026-11-24/`: `MAP-CHECKPOINT-SOURCE.json`, `MAP-CHECKPOINT-SCOPE.json`, `MAP-CHECKPOINT-HD.json`, `MAP-CHECKPOINT-OVERVIEW.json`, `map-frozen-native-pair/`, and the exact protected prebuilt package. Browser and hosted acceptance are recorded alongside the final package.

Production remains unchanged at deployment `dpl_6866rzQ7m2ts1fKLwKUESWSrp4VE`. PR25 remains draft. A protected preview is authorized; production promotion requires separate user direction.
