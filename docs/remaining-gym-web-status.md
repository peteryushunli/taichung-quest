# Ten-gym web status — combined PR8 draft

Originally prepared on frontend base `6202b96d210c9ddf2c3a0f10f2a9b1f2aa788cb3`,
then consolidated onto PR8's `edb2744` at the user's explicit request to combine
finished Codex code before all runtime checks finish. These are draft source
claims, not a production acceptance receipt. The shipped three-gym release
remains authoritative until the combined candidate passes its release gates.

The current combined native source is `6366b9e5c037647ce4d2a007efa3d3dfbedcdb48`,
with ROM SHA-256
`9550aaff12089132384e82f244c3359b7c09a3fe57a43696610821f8e0c0a020`.
Its gym code and party definitions are exact to the original `b7b027d` candidate;
Claude's map/save-v8 work and 120×176 contract are retained.
Main's source review matches the installed dialogue to the current Story handoffs;
source/build/host checks alone do not establish native playability.

## Prepared changes

The shared landmark catalog sets the remaining seven gyms to `playable` and
records their bilingual leader names from the source-reviewed Story handoffs:

| Landmark ID | English leader | Chinese leader |
| --- | --- | --- |
| natural-science-museum | Yicheng | 以澄 |
| calligraphy-greenway | Xingan | 行安 |
| shen-ji-new-village | Axiu | 阿修 |
| fine-arts-museum | Caining | 采寧 |
| fengjia-night-market | Jiahe | 嘉禾 |
| maple-garden | Muqing | 沐晴 |
| taichung-theater | Ling | 聆 |

The landing summary, gym cards and passport stamps derive their status from the
ten-gym catalog. The PR8 followup adds two visit-only temple stops and makes the
full City Map follow all five exterior shapes across four districts. Its twelve
stops still produce only ten gym stamps; temples do not name leaders or teams.

The original three leaders and their art remain unchanged. The follow-up asset
bindings copy the seven accepted native portraits and 17 additional native party
icon PNGs without conversion. All 21 new team slots follow the exact native
`b7b027d` trainer party order; Snorlax reuses its existing byte-identical icon.
The portrait and Pokémon asset READMEs record source paths and SHA-256 hashes.
Landmark area availability, coordinates, minimap contract, controls, native
source and ROMs are unchanged. No art was generated or redesigned.

## Validation and release gate

Initial status-only validation: `npm test` passed 45/45 tests; `npm run build`
passed TypeScript checking and the Vite production build. Existing local frontend
dependencies were reused without package or lockfile changes. A catalog audit
against the base confirmed exactly seven changed landmarks, with changes limited
to `gymStatus`, `gymLeaderEn` and `gymLeaderZh`.

The landing tests cover all ten bilingual names, the all-open summary, the previous
three-open summary, and suppression of leaders for non-playable states. The
follow-up restores the portrait/team invariant for every open gym and adds the
seven native party orders as a regression fixture.

Follow-up asset validation: `npm test` passed 46/46 tests and `npm run build`
passed TypeScript and production bundling. A read-only audit compared all seven
portraits and all 21 team icon slots directly against Git blobs at `b7b027d`,
including party order and PNG dimensions. Every previously tracked PNG and the
original three leader/team bindings remain byte-for-byte unchanged.

No browser testing or native runtime acceptance is established by this web patch.
Gameplay retains its exclusive UI lease. Main owns proof acceptance and the
matching native pair. Keep the combined PR in draft and complete its runtime
gates before publishing the all-ten catalog. The source-level Nantun and
visit-only temple guide fix is included; its responsive/native runtime checks
remain separate from the ten stable gym IDs.
