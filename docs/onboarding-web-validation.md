# Readable onboarding — isolated web implementation

The new user direction supersedes the old minimal-opening scope. The first English/Traditional Chinese choice is readable HTML outside the pixelated canvas. New players receive mandatory outdoor teaching after the real native starter grant and transition. Existing saved adventures keep native language, party and progression.

## Implemented web flow

- A first-time language dialog uses bilingual headings and two large semantic radio cards. Keyboard, touch, remembered locale and later language switches use the existing locale preference. It opens after exact cartridge/capability validation and before runtime creation. Cancel returns without booting or writing native state. Existing/demo/import Continue paths bypass a repeated first-time choice.
- Optional native metadata activates a separate 48-byte `TCINTRO1` adapter. Missing capability leaves the legacy opening intact. The existing field-language packet and its safe-field rules remain unchanged.
- The client applies the chosen startup language only during initialized phase 1 with READY/ACCEPTS. A delayed native hint does not block that command. Native ACK follows application before the welcome text; phase 10 is an explicit standalone fallback, never a browser success claim.
- Four readable cards mirror native Bike, minimap/City Map, free Team selection and nearby-landmark topics. They appear only at explicit phase 5–8 command waits after text printing. The game pauses, inputs release, and illustrations are labeled paused; no live marker or enabled Bike/Team interaction is manufactured while native scripts remain locked.
- Next closes the card, resumes, waits for fresh frames and revalidates the same phase/context before ACK. Only actual native state opens the next topic. Continue later preserves the native stage; Escape cannot mark a mandatory card as read. Native phase 9 farewell is advanced normally in-game.
- No party grant, Pokémon selection, position change or save-variable mutation is implemented in the web layer. Native owns those effects and all persistent stage markers.

## Protocol binding

Client follows the `include/taichung_onboarding.h` ABI introduced at `a845640` and retained by final native source `a3dfc56`: magic `TCINTRO1`, version 1, size 48, exact metadata EWRAM address, even/nonzero publication counter and nonzero stable context. All twelve words are bracketed; static, ambiguous, stale and replaced allocations fail closed. Browser writes only request context (offset 36), command/language bytes (40/41), and request sequence (28) last. One outstanding request is observed across snapshots.

The startup metadata is fetched alongside the cartridge before boot, avoiding another network round trip while the native startup gate waits. Deployment validation accepts old cartridges without this optional capability and rejects malformed optional metadata.

## Current verification and remaining gates

TypeScript/build and 36 unit tests pass, including exact metadata, coherent publication, ten-byte write boundary, payload-before-sequence ordering, correct phase/context, hint-vs-tutorial busy policy, pause/resume freshness, frozen allocation rediscovery, ambiguity and heap replacement. Existing language/navigation/input tests remain intact.

The isolated `/control-tests/onboarding-browser.html` preview clearly labels simulated native stages. Its five presentation checks and simulated adapter check passed in the IAB at 320×568. The adapter simulation exercises the startup request, four exact-context card acknowledgements, pause/fresh-resume gating, Continue later without progression, and native-owned phase 9 farewell. Keyboard Tab/Right changes the selected radio to Traditional Chinese, then Tab/Enter confirms and closes the dialog. Focus starts on the readable heading and returns to the triggering button on cancel.

Screenshots under `artifacts/interface-qa/` show the bilingual language choice and English Bike card at 390×844, plus the Chinese Map card at 320×568. The smallest Map dialog is 282×540, has no horizontal overflow, and both action buttons are 48px tall. Preview tab 29 was closed, viewport reset, and its port 5176 server stopped after the bounded lease. No other QA tab was changed. Production builds remove these test-only pages.

The frozen native pair was copied only to assigned QA input and passed `verifyCartridge`: source `a3dfc56e7a19cc60a77128f3326de5dba595a0a2`, ROM SHA-256 `a54b039ed0ca33b174befa1c380cfd35b7bfbb59171fb926833bbe5143776849` (16,777,216 bytes), metadata-file SHA-256 `d34e6690e2d2f8c7d8e9b86a3e3f2b9796ffaa3f095572048c334dcbf6bd18d4`. Its optional descriptor is version 1, size 48, EWRAM 33813728, magicA 1313424212/magicB 827282004. Existing language/navigation descriptors and geometry binding also pass.

Real new-game EN/ZH startup, mandatory cards, native farewell/released controls, Continue exemptions and party/stage preservation remain pending an authorized actual-cartridge UI slot. Simulation proves presentation and coordination only. This implementation is not a production release or physical-phone acceptance.
