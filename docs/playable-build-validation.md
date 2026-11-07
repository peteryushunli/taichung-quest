# Playable city build

Gameplay code checkpoint: `a1ff057980cf3480b5552ffbbc6ea4a3beaac9c6`.
Later QA-documentation-only integrations retain the exact ROM bytes; the
artifact's `build.json` records the final source checkpoint used for packaging.
The 16 MiB ROM has SHA-1 `ae0ada352b1cd0b0d281c09fdde42a95446c9b4f`
and SHA-256 `629bcd40965e7e5af51c3e1ffbb6fa436f76fe454fbb9f21aa7015e3dd6a2185`.
Its build metadata identifies the exact native language-bridge symbol. The
combined subset contains 360 Chinese glyphs and 54 pointer translations, plus
the directly bilingual City Pass, Station battle and exploration modules.

## Native and source checks

- The consolidated patch applies to a fresh archive of pinned upstream
  `ce6406d8c2eaf46d543c8a2606de0c3cb1951982`. All 127 changed files match
  the integrated source byte for byte after application.
- Static geometry validation passes all three districts, ten paired halls and
  24 directed seam cells. The mapper played the full cycling loop and Station
  and Theater doors; native Save/Continue retained map, position and party.
- Gym tests cover all ten independent bits, actual-start/matching-trainer/win
  guards, loss/retry, duplicate rewards and writes confined to `40FA`.
- Exploration tests cover all nine independent combinations, old-save Normal
  defaults, quarter-rate Low, sight caps and temporary wild-disable resets.
  Habitat validation confines the new table to 89 existing Old City grass
  cells and proves that all landmark approaches avoid that grass if desired.
- Migration tests cover four starter species, the original fixed-Bulbasaur
  prototype, thirteen city locations, one-time relocation and preservation of
  party/bag/progress. Vanilla and future-version saves remain unchanged.

## Runtime evidence

The integrator continued an actual older Pikachu save into the Station. An
exported, checksum-valid native save confirms map `43,0`, position `(30,66)`,
party count one, chosen species 25, version one, unchanged tea state and
zero stamps. No starter or supplies were duplicated.

The Station's real native trainer battle was played to victory against
Rattata level five and Pidgey level six. Pikachu reached level six; the engine
paid its normal reward and City Pass showed only Old Station completed,
`1/10`. A second host interaction recognized completion. A native Save and
fresh-runtime restart retained `1/10`; Continue on the combined ROM restored
the same hall and party. The exported save independently contains `40FA=1`.

Changing the browser language on that combined ROM produced the native Chinese
Start menu and all ten City Pass names, preserving the earned stamp. Earlier
production bridge checks cover both directions, busy/paused queues, native
choice precedence, snapshot restoration and unsupported/ambiguous heap refusal.
The browser's eight adversarial bridge tests and production build also pass.

The gameplay worker tested startup's one-action Normal defaults, the later
English/Chinese Exploration panel, and return from original Game Options.
Wild Off / trainer-sight Low survived native Save, reset and Continue. It then
selected Normal / Off independently, encountered a real level-four Pidgey in
the Station garden and caught it with the first gift ball after one Tackle.
The exported save has two party members, language two, `40F8=3`, `40F9=1`,
zero stamps and Old City position `(23,62)`. These checks used gameplay ROM
`4ca4606dba95807cb3a317a5056216007511a755`; the combined release adds the city
translation/font union without changing those encounter/preferences mechanisms.

The read-only inspector checks relevant sector checksums and variables; native
Continue is the end-to-end acceptance. Evidence is under ignored
`artifacts/qa-exploration-*`.

Loss/recovery was played on the exact combined `ae0ada35` ROM. A clearly marked
test fixture came from the real pre-gym save, changing only Pikachu's current
HP to one and updating the native sector checksum. After two Growls, an actual
Rattata Tackle caused defeat and whiteout. Native recovery returned to Old City
`(30,66)` with the same level-five Pikachu at `19/19` HP, no status condition
and zero stamps. A subsequent native Save advanced the counter from two to
three, and the exported file validates the Station checkpoint plus unchanged
starter, language and preferences. No battle result or stamp was injected.

Ignored local evidence includes `artifacts/qa-station-gym-pass-earned.jpg`,
`qa-station-save-continue-count.jpg`, `qa-station-victory.sav`, the mapper's
isolated evidence namespace, and the browser validation screenshots referenced
in their dedicated notes. Save files and ROMs are intentionally outside public
source control.

## Current boundaries

Only the Station challenge is implemented. The other nine halls are explorable
placeholders. Facades, room art, teams and city scale are provisional; broader
neighborhoods and bespoke landmark art are separate mapping work. The guide
does not claim live position, visits or synchronized earned stamps. Original
FireRed story/detail screens and most battle narration remain English.

The native build uses 261,096 of 262,144 EWRAM bytes and 29,824 of 32,768 IWRAM
bytes. Keep new static state small; existing heap-backed screens and ROM data
avoid consuming the remaining static-memory margin.

Desktop/mobile control improvements are preserved separately at `6f42ebc` and
owned by the visible Interface and controls chat. That unfinished WIP is not
part of this release. Vercel configuration/artifact preparation and physical
phone testing remain with that workstream; no Vercel publication is claimed.
