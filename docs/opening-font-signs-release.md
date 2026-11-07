# Opening, Chinese font and signs — 7 November 2026

Published at https://taichung-quest.vercel.app. Production deployment `dpl_5koQvQ1Ayk1E1C6kPM9zqofKsptp` is Ready; immutable URL: https://taichung-quest-3zqiu2ugj-peteryushunli-6635s-projects.vercel.app.

This release adds the bilingual opening and four guided control cards, an authored 12px Traditional Chinese native font, and ten short bilingual landmark signs. It preserves save version 6, all 476 character encodings, the default-off sound icon, minimap and existing controls. Miyahara's battle and the final Fengjia/Maple facades are excluded; Station and Park remain the two playable battles.

## Exact release

| Input | Identity |
| --- | --- |
| Frontend | `d9df75a61a1d1c45ad19fb4f31165fd7c02a2207` |
| Native ROM source | `856cb930fdad99bde1d15316f28ac0ebc7817620` |
| Checker-only native follow-up | `e13dbad0191b6e7830e694a7d809813d49901c60` |
| ROM SHA-256 | `134285d8f3181f5cf108beadc0ef0f90eec5cfb36ef63a8d231d07b620f161b0` |
| Metadata SHA-256 | `1fe3169518b615b7b2fc72e413de9fd0a8075400409be68b92ba932eddcea970` |
| Portable patch SHA-256 | `2a5c60e0014aab7901473194701e3b9e1adfcd38518d61b83023a2a5d49060b2` |
| Accepted preview | `dpl_2kEZxog9t6VKdonaHbCYheJL1gAa` |

The portable patch reproduces all 820 changed native files exactly when applied to pinned upstream `ce6406d8c2eaf46d543c8a2606de0c3cb1951982`. The checker follow-up changes no compiled game source and did not require another ROM build. All four font notices ship with the web artifact, and the footer links to the combined native-font notice.

## Acceptance

Actual English and Chinese Charmander flows reached one level-50 starter, all four web cards, native farewell and ordinary exploration. The English run began on the earlier client and resumed a supported same-ROM snapshot at Map after the input fix; the Chinese run was fresh on the corrected client. Rapid and delayed second taps no longer open City Map beneath the guide. Native Interact remains available for printed pages, Continue later preserves the current card, and Bike/Team/minimap/City Map work after completion.

Both genuine existing saves restored their saved language against the opposite web preference, their positions and their parties, without replaying the new opening. Presenter input/output SHA-256 is `8f62bd2f5df0806d41ac958cf5d7dbaaf68b8d28f68e85c07bf31fc1714dc9ea`; two-badge input/output is `072519111dc3b34753eb0947e1cc50cc87e30c22bb071dee9978b28f48b3d06d`. Each export matches all 131,088 original bytes including RTC. These were Continue/export checks, not native Save rewrites; the presenter uses the already-accepted v3→v6 in-memory migration. The earned save visibly retained 2/10 gyms and one level-50 Mewtwo at 119/181 HP.

Chinese menu/dialogue and Station sign rendering pass. The longest Greenway sign passes in Chinese and English; a language request made while the sign is open applies safely after it closes. At 320×568, Chinese cards and the English Bike card fit with full-size actions. Longer English cards scroll vertically and keyboard focus reveals their actions. Desktop responsive checks also cover 390×844.

Evidence: `.worktrees/web-guide/artifacts/onboarding-acceptance/FINAL-STATUS.json` and `artifacts/interface-qa/`; deployment evidence is under `artifacts/opening-font-signs/`. Runtime client `aad2574` differs from the released client only in the footer font-license link; gameplay and styles are identical. Static/host checks retain the existing map/save guards, the fixed glyph codebook and the context-bound onboarding protocol.

Limits: only the English/Chinese Charmander cases were exercised end to end; the other six starter/language combinations and physical iPhone/Android testing are not claimed. Existing quest-log recaps were dismissed normally and are distinct from new onboarding. No raw live-RAM/context sampling was used.

Public post-deployment verification passes: HTML, JS, CSS, matching metadata, the full 16 MiB cartridge and font notice match the frozen prebuilt hashes; COOP/COEP headers are present. The initial ROM download timed out partway through, resumed successfully, and the completed file matches the expected SHA-256. Receipt: `artifacts/opening-font-signs/vercel-production.json`.
