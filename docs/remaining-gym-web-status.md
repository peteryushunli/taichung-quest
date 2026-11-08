# Ten-gym web status patch — pending native runtime acceptance

Prepared on frontend base `6202b96d210c9ddf2c3a0f10f2a9b1f2aa788cb3`.
This isolated branch is a release candidate, not an acceptance or publication
receipt. Main must accept native runtime proof before integrating or publishing
the seven new playable claims. Until then, the shipped three-gym status remains
authoritative.

The candidate native source is `b7b027d443f213def7d31aa76d2d0aa3cd478b76`,
with ROM SHA-256
`88efa224c2e95fda382e26d79d14ad3964ff1c20407bb7eee46b92e321ba9385`.
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

The existing landing summary, gym cards, map pins and passport stamps derive
their status from this catalog. The visitor guide likewise selects its existing
playable battle note from `gymStatus`. No page or layout changes are needed.

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

No browser testing or native runtime acceptance is performed by this patch.
Gameplay retains its exclusive UI lease. Main owns proof acceptance, integration
with the matching native pair, and publication. If only a subset is accepted,
Main must retain pending status for every unaccepted gym rather than applying
this all-ten candidate unchanged.
