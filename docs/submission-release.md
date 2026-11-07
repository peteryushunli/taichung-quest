# Hackday submission release — 7 November 2026

Public source: https://github.com/peteryushunli/taichung-quest

The submission is a native Pokémon FireRed modification running in the browser through mGBA/Wasm. The private preview requires its owner's ChatGPT sign-in; the GitHub repository is public. Generated ROMs and native saves are excluded from Git.

## Frozen build

- Native source: `21c08cbda8e1787b4504eb3a1131d628fc77222f`.
- Upstream: `ce6406d8c2eaf46d543c8a2606de0c3cb1951982`.
- Cartridge: 16,777,216 bytes; SHA-1 `ea482a326672ac9fec2595e235ab669f9db0dd10`.
- SHA-256: `0bc5501ae8b6c64bec9ea8d3db4f3a9b2a1bf3d8b269b18b67f06df1baf97d16`.
- Language packet remains version 1, 32 bytes, symbol address `33813632`; exact metadata is generated alongside the ROM.
- Native Save version 2 refreshes the older cached Station viewport and preserves valid positions and player data.
- `patches/taichung.patch` contains the complete portable source changes; bootstrap/build instructions are in the README.

## Playable scope

Choose English or Traditional Chinese, encounter preferences and one of four animated starter previews inside the Station welcome hall. Confirm one real level-50 partner and fade directly to the plaza. The native TEAM menu supports free species 001–150 selection, direct evolved forms, six slots and useful level-50 presets. It preserves held items on replacement.

Three connected districts and ten enterable landmark halls are present. Station has a custom facade and the one playable leader challenge. Accepted challenges restore HP/status/PP; city battles skip training gates. Actual victory adds the Station stamp to the ten-landmark City Pass. Loss heals and returns to the nearby plaza for a retry. The other nine halls remain placeholders. Native menu cycling works.

Browser controls: arrows move, F confirms, D cancels, M/Enter opens Menu; portrait touch controls provide the same inputs. Play enters the Game Boy view with CSS fullscreen fallback. The bilingual City Map describes the ten real landmarks. Its location is not live.

## Verification

- Integrated native build, 380-glyph generation, map reachability, Station format/budget checks, and host suites for all 150 Team presets, ten progress bits, encounter settings, exactly-once starter grants and save migration pass.
- All four actual integrated starter paths reach the plaza and native Save records exactly one chosen level-50 partner. Charmander, Bulbasaur and Pikachu native Continue does not replay onboarding; Bulbasaur and Pikachu were re-saved with count one. English and Traditional Chinese welcome/selector/confirmation/departure/save text render correctly. Squirtle’s Chinese native save independently validates species 7, level 50, language 2, map 43:0 at (30,66).
- Six-member Team add/replace/cancel, an organically attached Potion surviving replacement, and fresh-runtime native Continue passed on the identical merged gameplay slice. Mail-specific runtime remains untested.
- Gameplay's level-50 Station checkpoint passed a real Mewtwo win against both opponents, one badge, repeat recognition and native Save. Organic Magikarp loss, zero badges, healed plaza return and retry offer also passed. The victory save independently validates mask 1, level-50 Mewtwo, unchanged EXP 156250 and all six EVs zero. Battle proof is on the isolated common-level checkpoint; combined source retains those exact gameplay changes.
- A real old canonical pre-Station save was loaded through actual Continue on the integrated build. Its new native Save retains identical party, position `(30,66)`, language, preferences and progress; version advances 1→2 and counter 2→3. The new facade renders correctly.
- Production Worker validates 51 complete asset responses including full ROM/Wasm hashes, MIME and explicit COOP/COEP. The earlier published startup fix was confirmed on the user's iPhone Chrome; new native content has desktop-emulator acceptance, not a new physical-phone claim.

## Deferred

Live minimap, faster/contextual bike shortcut, expanded city geometry, the other nine real leader battles, further landmark facades, bespoke character sprites and final balance are not included. The existing eight Kanto badges are separate from the ten-landmark City Pass. Custom Taichung content is bilingual; many original FireRed names/detail screens remain English. Authored future trainer moves require review of the current common preset policy.

Use native Save and export a backup before changing cartridge revisions. Browser snapshots are isolated by ROM digest. A normal Save cannot be invoked during the locked opening; grant host tests cover duplicates and existing partners, while interruption/transition edge cases beyond the tested Continue paths remain bounded verification limits.

## Published release verification

Private Site version 9 deployed at 14:46 Taipei from public source `e6dbee134ffe375ebc41be8010a66bbc8664cc6f` (deployment `appgdep_6aeec9213cf48191bc625e4ad1f07b8a`). The full live cartridge and Wasm hashes match the release; both return HTTP200 with the required cross-origin isolation headers and correct MIME. Anonymous Git access verified the exact public source commit. Later documentation-only commits do not change this cartridge.

A fresh application of the portable patch matches all 238 changed native source files (16 palettes use Git-declared CRLF normalization; all remaining files match byte for byte). Patch SHA-256: `4725e58985c50fe8b3d421c171fb5bc29ea8e8315068972fbb01b47c75efc4fc`.

Late character-art work remains outside the frozen submission and has not been discarded. Rebuilds should use the published patch or the frozen native commit; the active local native checkout may contain that preserved later work.
