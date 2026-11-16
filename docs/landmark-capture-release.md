# Landmark captures on the released city map

This release connects rare-Pokémon captures at the ten existing non-gym landmarks. Each offers **Prepare team / Begin / Later**. Begin saves the spent attempt before battle and waits for a durable browser acknowledgement. The player receives up to three temporary Great Ball throws. Catching unlocks that Pokémon for an explicit later TEAM choice; running, losing, knocking it out or exhausting the balls spends the attempt without an unlock. Normal bag balls and existing parties remain intact.

The cartridge retains released geometry `48fe4ba5208d0a2b1285c1b6aa6f776377ef003d5501e5ae837ca45c6127e92a`, save version12, all ten gyms and existing approved art. Native product `331326300a91da112cadaabdb2180ae5d544d98a` plus strict guard-only `586b8a84089b338b6c3971cc90604daa57fadb76` builds ROM SHA256 `263574feea7a27f381277a32af72492f748224ad5ace98df0da2436b5256ce46`. The guard commit changes no runtime inputs; both commits produce identical cartridge bytes.

## Persistence and copy

The browser verifies the actual checksummed fourteen-sector native save, counter, trainer and capture masks before acknowledging BEGIN or RESULT. It records a cartridge-boot recovery intent, serializes storage flushes and removes only the matching cartridge’s browser snapshot. Capture phases block manual and automatic snapshots. Refreshing a battle resumes from the spent native checkpoint rather than restoring the battle attempt.

Native fixes expand field text into a separate output buffer, refresh the map-view/quest-log cache before automatic encounter saves and initialize virgin capture state only for authenticated unfinished guest-house startup contexts. Existing version12 Continue behavior, saved parties, future namespaces and unrelated saves retain their existing boundaries. Bilingual TEAM tutorials and browser guides explain the unlocks. The four unbound future encounter locations say they are not open yet. Existing saves and finished openings no longer receive misleading first-opening advice after an onboarding transport outage; startup and rejected-language fallback behavior remains covered.

| Existing landmark | Target | Level | Interaction |
| --- | --- | --- | --- |
| Maple Garden | Lapras | 65 | Sign |
| Wenchang Temple | Gyarados | 70 | Interior host |
| Botanical Garden | Exeggutor | 65 | Sign |
| Confucius Temple | Alakazam | 65 | Sign |
| Yizhong Street | Electabuzz | 60 | Sign |
| Prefectural Hall | Arcanine | 65 | Sign |
| Second Market | Snorlax | 60 | Sign |
| Cultural Heritage Park | Moltres | 75 | Sign |
| Fengle Sculpture Park | Onix | 65 | Sign |
| Wenxin Forest Park | Jynx | 60 | Sign |

## Verification

Native guards retain the immutable old map/art registrations and historical corruption probes. Current source checks pass 70,496 save cases, 32 actual locked-menu cases, 322 binding-flow cases and 145,484 engine/facing cases, plus all eight archived art suites. An independent review confirms no runtime/configuration/glyph/map input changed in the final guard commit. All 92 frontend tests, TypeScript and production build pass. The final frozen pair verifies the exact ELF-to-ROM bytes, four bridge symbols, 24 native geometry inputs, matching raw contracts and a portable patch that recreates the committed native tree.

Actual Chrome runtime uses genuine native version12 saves created and exported through ordinary game controls. No emulator RAM, native SRAM, masks, RNG or capture rates were edited. All nine new sign interactions show the correct identity, target and level; Later preserves the capture masks. Maple’s sign, offer and result are visually checked in Traditional Chinese.

An unsaved bike journey from Old City across the Nantun seam into Wenchang passes Prepare/Later, durable BEGIN, a real temporary throw, Save Spot refusal and refreshed native Continue into the correctly rendered hall with a spent attempt. All 600 party bytes, inventory, PC, badges and checkpoint are preserved. A real Gyarados capture reaches durable RESULT, survives a fresh cartridge start before TEAM selection and adds no automatic party member. Explicitly selecting Gyarados afterward produces a fourth level50 member, retained on fresh Continue. An outdoor Maple Begin/Run reaches a durable noncapture result, and the final client without diagnostic instrumentation restores its map/minimap, refuses a retry and retains the prior Gyarados unlock and four-member party.

Independent fourteen-sector save reviews validate trainer2897464883, version12 and each native counter. Party differences are decoded exactly: ordinary walking friendship/checksums, the observed Chansey battle HP/PP, then only the deliberate Gyarados addition. Bag balls, PC, badges, checkpoint and preferences remain unchanged except the chosen language/settings. Final client verification at 390×844 covers immersive controls, sound off/on/off and touch bike toggle; this is desktop simulation, not a new physical-phone claim.

Local evidence lives under `artifacts/coordination/2026-11-16-city-development/main/capture-only-release/`, including `frozen-final-586`, `independent-reviews.json`, `SIGN-RUNTIME-REVIEW.json` and runtime screenshots/native exports. These private test saves and generated ROM/ELF files are excluded from public source.

## Held work

PR19’s rejected horizontal map and its protected preview remain on hold. No new geometry, new location facade, neighborhood kit or v13 migration belongs to this release. The corrected world still needs visual review, and each of Tiger City, Luce/Tunghai, Rainbow Village, City Hall/Hub and Jingming needs explicit design approval before installation. This gameplay release does not change those approvals.

Final client checks without diagnostic instrumentation pass fresh English and Traditional Chinese New Game, guest-house stairs/greeting, all four starter choices displayed, Charmander granted in English and Squirtle in Chinese, the updated capture tutorial, old-map directions and full tutorial completion. Existing-save Continue, the truthful future Porygon notice, native Save9 with no misleading opening notice and sound/touch bike controls pass. All 600 party bytes and 256 variables in that final Save9 remain exact relative to Save8. The authenticated zero-party/virgin-schema Continue edge is covered by actual-C regression tests; no fabricated native fixture or manual memory edits are claimed.

Hosted-preview verification and production publication are separate remaining steps.
