# Approved ten-landmark guide

Implemented in the isolated `feature/web-guide` checkout, following the approved roster and the mapper's native city contract. The canonical integration fixture was copied read-only from root: ROM SHA-1 `1ee115af94a2ef77122a970a5a8c9acea60b5d2c`, matching SHA-256/build metadata, source `5724337`.

## Content and source checks

- Exactly ten entries, ordered as the native City Pass: Old Station, Park, Miyahara, Science Museum, Greenway/Civic Square, Shen Ji, Fine Arts, Fengjia, Maple Garden, Theater. CMP is folded into Greenway copy.
- All ten exterior/hall references and twenty schematic coordinate values match `docs/taichung-city-contract.json`. Native entrance coordinates and real geographic coordinates remain separate fields.
- Each entry has English/Traditional Chinese names, visitor descriptions, addresses, an individual official visitor URL and an original SVG sketch. Primary-source evidence and coordinate provenance are in `landmark-sources.md`.
- Integrated districts/halls are explorable with provisional native artwork. Parent independently verified the Station prototype victory/City Pass result in canonical `1ee115af`; the guide marks its challenge playable with a provisional leader/team. Other nine challenges remain unimplemented. No live player/visited/badge/progression values are simulated.
- Landing copy in both languages now identifies the Station arrival and citywide three-district adventure. The inaccessible legacy tea errand is no longer featured.

## Actual Chrome guide checks

Used a dedicated built Vite preview at `http://127.0.0.1:5174`. The emulator was never started during this bounded guide pass; existing gameplay persistence checks are documented separately.

1. City Map opened before Play and initially selected Old Taichung Station.
2. Clicked all ten actual map buttons in Traditional Chinese and again in English. All twenty cards contained the correct bilingual title, nonempty localized visitor copy/address, secure official link and readiness note. Ten distinct SVG payloads were rendered. The final Station challenge wording was separately rechecked in both languages after parent victory verification.
3. At 390×844, the guide's scroll/client widths both measured 370 pixels. All ten map targets measured 26 pixels, with zero overlapping hit rectangles. Floating labels were hidden; all ten bilingual indexed buttons remained available with full map-marker accessibility names.
4. Selecting Miyahara from the mobile list scrolled the full card into view: bounds approximately 92–816 pixels within the 844-pixel viewport. The Chinese official link, address, original brick/arch illustration and unimplemented-gym note were visible.
5. Escape returned focus to City Map and retained the unstarted Play gate. English preference persisted through a normal reload; English mobile body width stayed 390 pixels. The Station landing page was also inspected at the normal desktop viewport.
6. Viewport override was reset; the healthy guide QA tab was closed and UI ownership released.

Ignored local evidence in root `artifacts/`: `qa-ten-guide-desktop-en.jpg`, `qa-ten-guide-mobile-map-zh.jpg`, `qa-ten-guide-mobile-list-zh.jpg`, `qa-ten-guide-mobile-card-zh.jpg`, `qa-ten-guide-station-challenge-zh.jpg`, `qa-station-landing-en.jpg`. The twenty-card DOM result is `qa-ten-landmark-cards.json`; its first Station note predates the final parent victory update, which has separate screenshot/DOM confirmation.

`npm run build`, TypeScript checks, catalog/contract assertions and `git diff --check` passed. Actual native city traversal, gym win/loss and cartridge-save persistence are owned and verified by the native/integration agents; this guide pass does not substitute for them.
