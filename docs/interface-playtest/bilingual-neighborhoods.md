# Nine shared bilingual neighborhoods

Ready slice on top of storefront 25a4003 and encounter markers 768c968. No map geometry, positions, native ROM, generated JSON, raster art or HD pack changed here. Current production geometry remains 625e4fb0f31227fe9dcbdd314fd4a79e1c19f2a6d3300127e8781183f58fd822.

The common source is cityGeometry.world.neighborhoods. Landing and in-game City Map now use those nine anchors, as does the minimap. Both languages remain visible at once: Fengjia 逢甲; Shuinan 水湳; Beitun 北屯; North District 北區; Xitun 西屯; Dadun 大墩; West District 西區; Old City 舊城; Nantun 南屯. Legacy paired geometry still abbreviates North/West; a presentation helper expands those names without changing the paired artifact. The bottom-right district readout is bilingual and expanded; the road continues following the chosen language. Map/hero counts now use the nine neighborhoods instead of catalog district IDs.

Responsive label placement moves text around its source anchor, avoiding marker bounds and other labels, and clamps it inside the existing map. Citywide minimap fits all nine names around the player. Nearby/district views show names whose anchors fall within the crop and omit a label if that crop has no safe space. Native coordinates, player/capture/gym marker positions and map-container sizes are untouched. On narrow landing pages the redundant IN-GAME MAP chip is hidden to give North District safe space. The N compass behavior is unchanged (northUp=false for the active Boulevard map).

## Main: retain these labels when rebuilding map artifacts

1. Cherry-pick this slice, including web/scripts/prepare-boulevard-preview.py, before the final export.
2. Run that exporter with Main’s final native checkout, compiled fill/report, plan and frozen ROM directory, using its existing argument order:
   python3 web/scripts/prepare-boulevard-preview.py NATIVE FILL PLAN ROM_DIR ARM_NM --candidate CANDIDATE
3. Keep all nine NEIGHBORHOODS entries and their existing anchors. The exporter now spells out North District and West District for world.neighborhoods, mapsByNativeKey.districtName and districtBefore. It no longer writes the obsolete seven-entry world.districtLabels list. Do not restore that list or substitute Greenway for a neighborhood.
4. Let the exporter write the generated geometry fingerprint AND roms/build.json.minimap together. World display metadata contributes to the fingerprint, so the next full export will intentionally produce a new fingerprint even if physical map dimensions/seams remain unchanged. Do not manually rebind the old legacy 48fe4ba5 contract or overwrite active 625e4fb0 metadata with it.
5. Preserve every marker captureBit from the native encounter catalog. Follow Main’s usual final-ROM/HD-pack regeneration and pairing process; this UI change does not replace that freeze.
6. Build with VITE_BOULEVARD_PREVIEW=1 and run verify-cartridge.mjs against the same artifact set.

## Verification

120/120 web tests, TypeScript, Boulevard production build, browser-fixture build and exporter Python syntax pass. New tests compare both maps’ nine labels/anchors, ensure the paired JSON is not mutated, exercise citywide placement at all 28 landmarks and nine neighborhood positions, and check crowded local crops do not move markers or expand bounds. Actual native opening/free exploration was checked on a phone viewport: all nine names in the in-game City Map and citywide radar; the bottom-right readout shows Old City 舊城 in both language modes while Nanjing Rd changes to 南京路. Desktop and mobile landing maps each show all nine labels with zero measured marker/title/edge collisions and no horizontal page overflow. The real production-component browser fixture passes 11 outcome/label assertions at 390px, including nine visible labels, player/marker clearance, container width and bilingual status text. Screenshots at artifacts/qa/2026-11-23-interface-playtest/neighborhood-*.jpg cover the actual landing map plus the clearly labeled production-component City Map/minimap fixture. No publication performed; Main owns combined-ROM smoke and preview.
