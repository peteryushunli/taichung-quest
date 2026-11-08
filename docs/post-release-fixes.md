# Starter portraits, native tutorials and landmark collision

This batch follows PR8 (`0ffa9c9`) and uses native source
`2c48f28b998b67413baf058557752723ea121500`. Its matching 16 MiB cartridge has
SHA-256 `89d22931e497f796c8dcd72f275c0808ff1a135b9368ce87b2d2a9b8553fbd60`.
The portable patch applies to pinned upstream `ce6406d8` and reproduces native
tree `33fa8536283fceb6727d8b2dde26b55460a1720a` exactly.

## Player-visible changes

- Opening starter portraits publish their new palette only after replacement
  portrait/OAM data is ready. This removes the briefly green Charmander and
  other mixed-color transitions while preserving selection and grant behavior.
- Tutorials retain the actual cartridge dialogue pixels, frame and font. A
  transparent A/tap target and original native advance arrow replace the second
  web message box. The final bilingual desktop/phone style was approved by the
  user on 2026-11-08.
- The nearby-landmark speech is one two-line message in both languages:
  “Miyahara NW. Park north.” / “South, then west. Use minimap.” Chinese:
  “宮原在西北、公園在北。” / “先往南再往西，看小地圖。”
- Forty-four painted Maple Garden tiles now block walking and cycling. The
  other nine gym structures, Fine Arts sculpture and two temple facades were
  already solid. Doorways, transparent gaps and public routes remain open.
- Version-9 migration repairs older saves standing on those newly solid tiles
  to the qualified safe point `(12,35)`. Normal Maple gym exit remains `(12,33)`.
  Existing pending-warps, party, bag, currency, badges and preferences survive.

The 611-glyph font, map artwork, trainer parties, gym logic and minimap geometry
contract are byte-identical to the released PR8 native source. The existing
sound toggle beside Game options and input/language/ACK coordination remain.

## Validation and provenance

- Web: 50 unit tests and TypeScript/production build pass. English/Chinese
  presentation checks and approved screenshots cover desktop and 390px layouts.
- Starter: controlled selector-only ROM `c2de9841…` used the exact integrated
  starter source `6b74a1c`. Six ordinary directional transitions produced zero
  recolored or intermediate portraits in 288 displayed RAF samples, compared
  with 68 recolored samples in the released baseline. A/B confirmation and one
  level-50 Pikachu grant passed. These are displayed samples, not every VBlank.
- Final combined client: fresh English startup, partner confirmation and native
  tutorial flow pass. The nearby message is one two-line box at desktop and
  390×844, both tap and F acknowledge, and Sound off/on/off updates correctly.
- Collision/save: the final combined `89d22931…` ROM continued a genuine native
  v8 save standing at `(11,33)`, repaired it to `(12,35)`, saved v9, then survived
  Reset/Continue without repeated relocation. All 13 protected-state comparisons
  passed. Actual foot/bike tests blocked both art edges, allowed clear movement,
  and entered/exited the Maple gym normally without healing or party changes.
- Source guards: all-landmark audit, 155 compiled migration cases, 53 street
  probes, CMP/Old Core/Greenway checks and 38 onboarding-profile probes pass.
  Historical validation profiles remain preserved alongside exact new profiles.
- Build: matching ELF independently reproduces the ROM; EWRAM has 896 bytes free.
  Patch application, source-component hashes and minimap contract agree exactly.

Local evidence is retained under `artifacts/post-release-fixes/`,
`artifacts/landmark-collision/combined-2c48-runtime/`,
`artifacts/native-dialogue-style-review/`, and
`artifacts/worktrees/3c6cc7b4e276/selector-clean-render/` in Main's workspace.
Browser coverage uses desktop Chrome and phone-sized layouts; it does not claim
a physical iPhone/WebKit or multitouch run. The combined-ROM manual collision
run covers Maple; all thirteen objects are covered by the source audit.
