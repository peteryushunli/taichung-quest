# Parallel work plan

## Current shared-PR contract — 8 November 2026

Use isolated branches/worktrees and deliver exact commit IDs with checks and limitations. Main is the sole PR8 integration writer: preserve Claude's authored map changes, combine native code at source level, export one matching patch, and reconcile any remote advancement before a non-force push. Do not replace the city patch with the older standalone gym export.

Native and public-root repositories are separate. Feature workers do not regenerate the central patch or publish. Main binds ROM, metadata and minimap contract, records source/build evidence separately from actual runtime evidence, and publishes only a verified combined release. The screenshot-approved compact tutorial and restored native encounter setup are included; unrelated opening/keyboard-setting proposals remain excluded.

User-approved process for the time-constrained first release. The game decisions in `game-design.md` remain authoritative. The original build chat owns integration and a working build; the design fork should not edit game or web source concurrently.

The user has explicitly directed the main build chat to checkpoint current work and set up separate worktrees for localization, world/gameplay, and web/guide. The main chat should carry out this transition at the next safe checkpoint, preserve all in-progress changes, and record the actual checkpoint commits, worktree paths, branch ownership, and build status. Setup is not complete until those exist and are verified.

## Current foundation

The reconstructed FireRed source compiles locally. The unmodified build matched the original FireRed SHA-1, and a modified game image has been produced. Browser boot, the fast four-starter opening, and playability are still being verified. There is no remaining general-purpose ROM-to-source conversion step.

## Next dependency: landmark selection

The user is selecting landmarks in a separate session and wants that choice settled before downstream content is committed. Do not repeat the landmark discussion in this design/process chat or assume a researched shortlist is approved.

The next content milestone is an approved landmark roster with first-release scope. Its lightweight handoff should identify each chosen place, a stable ID, English/Traditional Chinese display names, approximate placement or district, a visual reference, and whether it belongs in the first release or later. Missing optional details should remain explicit rather than being invented as final decisions.

Use one approved landmark catalog shared by world mapping, gyms, art, scripts, localization, and the visitor guide. Avoid independent lists that drift. Once the roster and first-release scope are approved, map placement, art briefs, and landmark-specific writing/translation can proceed in parallel against those IDs. Gym teams, final dialogue, and polished art need not all be resolved before that handoff.

While selection is pending:

- **Integration:** maintain the working ROM/browser baseline, merge bounded infrastructure fixes, and keep source/build isolation reliable.
- **World/gameplay:** continue reusable gym, encounter, movement, and map-generation mechanisms; preserve the existing prototype. Defer final city topology, bespoke landmark interiors, and landmark-specific art commitments.
- **Localization:** continue fonts, text rendering, language switching, common menus, and translation tooling. Defer bulk translation of unapproved landmark names, biographies, and story scripts.
- **Web/guide:** continue the map/guide component, catalog schema, cards, controls, saves, and deployment. Existing example markers must remain provisional; defer finalized landmark positions, images, and visitor copy.

Execution sequence: **approved roster and first-release scope → shared landmark catalog → parallel map/art/content/localization work → integrated playable release**. This is a content dependency, not a request to pause the main session or generic systems work.

## Map transformation ownership

The user wants the existing **Landmarks** chat to carry its decisions and visualization through to actual map implementation. It now owns the compressed-city map transformation end to end, with a dedicated native-game worktree at `.worktrees/game-mapping` on `feature/city-map`, created from integrated game commit `ee75ad0`.

Landmarks owns district layouts and connections, landmark placement and blockout graphics, paths, collision, doors/warps, safe arrival points, station starting-area geometry, and the mapping contract consumed by gameplay and the visitor guide. First deliver a traversable station area and a tested district connection, then expand against the approved city plan. Completion requires committed playable game-map changes and validation, not only a visualization or design brief.

The main session continues to own integration and the canonical working build. Its world/gameplay worker should focus on gym/trainer battles, encounter behavior, progression, and transport/gameplay mechanics; it must not concurrently author the map layouts assigned to Landmarks. Localization and web/guide remain independent feature streams. Main owns shared startup/menu integration and resolves identifiers across branches.

Use the existing `TAICHUNG_GAME_SOURCE` build interface for the mapping worktree and keep all generated outputs isolated. Map work must not overwrite the canonical ROM, edit other workers' worktrees, export the central release patch, or publish a release. Handoffs include commit IDs, a map/door/landmark ID contract, source-map renders, build results, and traversal validation. Main reviews and integrates the commits.

## Independent workstreams

| Stream | Deliverable | Dependency / boundary |
| --- | --- | --- |
| Build and integration | Reproducible game build, working baseline, verified combined releases | One integrator owns the assembled game and release artifact. |
| Map transformation — Landmarks chat | Compressed city topology, landmark locations, connected maps, doors, collision, habitat regions, playable native map commits | Owns `.worktrees/game-mapping`; uses existing tiles and placeholder buildings, coordinates IDs/entry points with gameplay and guide owners. |
| World/gameplay | Gym/trainer battles, Off/Low/Normal encounter and automatic-challenge preferences, progression, transport mechanics | Consumes the map/landmark contract; does not concurrently edit the Landmarks-owned layouts. Encounter settings can proceed independently of final map geometry. |
| City map and visitor guide | Selectable city overview, bilingual landmark cards, verified visitor descriptions and location links | Can be built in the browser independently of ROM scripts; consumes shared landmark IDs and map layout. Live ROM-state tracking is a separate integration. |
| Art and character design | Landmark graphics, fictional leader concepts and sprites, signs and visual identity | Starts with references and concepts. Final asset production follows the existing FireRed dimensions, palettes, and animation formats. |
| Game scripting and data | Brief intro, four-starter choice, menu cycling, reusable gym battle flow, badges, dialogue, encounter tables | Uses placeholder art and interiors. Final teams and encounter allocations remain undecided until selected. |
| ROM localization | Startup language choice, saved/menu-switchable English and Traditional Chinese, fonts, text lookup and layout | Prove a Chinese dialogue/menu early. Existing English FireRed fonts/language flags do not provide this automatically; keep ownership separate from concurrent gameplay edits. |
| Browser and release | Real emulator player, input, saves, audio, mobile layout, public source repository, deployed web application | Can be developed against the baseline ROM while game content changes. Repository visibility and web deployment are separate deliverables. |

Build/integration is a role, not necessarily a separate full-time worker. Several bounded agents can help, but every writable file needs a single owner. Use isolated source checkouts when two workers would otherwise touch the same game files. Binary map files are especially poor candidates for simultaneous edits.

## Git and worktree recommendation

The user is comfortable using GitHub more extensively and using worktrees to increase safe parallel development. The recommended next step is a coordinated checkpoint and isolated feature branches, performed by the original build chat at a safe boundary between edits.

At the inspection for this discussion, the parent project had a configured GitHub remote but no initial commit. The FireRed source was a separate nested Git repository in ignored `vendor/pokefirered/`, with local edits and newly added source files. There were no additional worktrees in either repository. This is a time-sensitive snapshot, not a durable status report.

Parent-project worktrees alone do not track or isolate the ignored game source. The game repository needs its own checkpoint, feature branches, and worktrees. Separate workers must not point their worktrees at the same writable vendor checkout or generated build directory.

Recommended transition:

1. Let current file writes reach a safe checkpoint. Record the latest known working ROM and browser validation state.
2. Commit the project-owned source, scripts, documentation, and release patch in the parent repository. Include new game source files in the game checkpoint, not only tracked-file diffs.
3. Record the modified game as a local development branch in its existing Git repository. Keep the original upstream baseline identifiable. Public source publication should continue to exclude wholesale vendor assets and generated ROM/save files. Publishing the entire reconstructed game is not implied by adding worktrees.
4. Adapt bootstrap/build/export helpers for game development commits and a selectable game-source directory. Current exact-HEAD baseline guards cannot simply be reused after committing custom game changes. Preserve baseline verification while allowing intentional development branches.
5. Create isolated feature worktrees, with one writable source/build directory per worker. A compiled toolchain may be reused read-only where safe.
6. Merge or cherry-pick small, verified commits through the integration owner. Export the consolidated public game patch from the integrated game source, rather than making every worker concurrently regenerate the same patch file.

Suggested active allocation is one integration owner plus three implementation branches: `feature/zh-tw` for ROM fonts/localization, `feature/world-gyms` for maps/encounters/gym content, and `feature/web-guide` for browser/visitor-guide/release work. The integration owner can finish fast-start and menu cycling while those branches progress. Art concepts and landmark research can proceed alongside the world branch; split an additional implementation branch only when file ownership and worker capacity allow.

This allocation has now been extended by the user's map-ownership direction: the existing Landmarks chat owns `feature/city-map` in its dedicated worktree. `feature/world-gyms` focuses on gameplay rather than map-layout authoring. This uses an existing user-owned chat as an implementation stream; it does not require another new chat or duplicate map worker.

Worktrees prevent accidental edits to the same working files, but do not prevent logical conflicts. Shared menus, map/gym IDs, flags, and the landmark catalog need an assigned owner or agreed interface. For example, localization and transport should not independently redesign the start menu.

Use short branches and frequent integration. GitHub provides checkpoint sharing and optional PR review; worktrees provide local isolation. Both help, but extra publication alone does not make shared-folder edits safe.

Reference: [Git worktree documentation](https://git-scm.com/docs/git-worktree).

## Agreements to make early

Keep these lightweight; a small table is sufficient.

1. **World/content IDs:** each landmark's map and gym identifiers, door entry/exit coordinates, leader/trainer ID, completion flag, and linked habitat table. The mapping and scripting owners agree before implementing independently. The player-facing city map/visitor guide uses the same landmark IDs and a shared catalog of names, overview positions, descriptions, factual sources, and real-world locations.
2. **Asset specifications:** sprite and landmark sizes, palette limits, animation requirements, file names, and collision footprint. Placeholder and finished graphics should fit the same space where practical.
3. **Game-to-browser handoff:** the build emits `web/public/roms/taichung-firered.gba` plus `build.json`. The player loads that artifact without needing to know the source-map structure. Version releases explicitly and consider save compatibility when changing map or progression data.
4. **Language preference:** define where the preference is stored and how startup, ROM menus, browser controls, and visitor-guide text honor it. Agree translated string IDs and font/encoding requirements before parallel translation work; report actual coverage.
5. **Transport anchors:** landmark catalog entries should reserve safe game-map drop-off coordinates for later fast travel. Station visuals, bike state, and boarding/arrival scripts need named owners. Do not couple immediate menu cycling to completion of the station or vehicle-animation systems.
6. **Encounter preferences:** gameplay owns two independent saved Off/Low/Normal modes for random wild encounters and automatic trainer challenges. Agree variable IDs and menu/startup wiring with integration/localization before editing shared files. This feature does not require the mapper to finish the city; test its native hooks in an existing area or an isolated fixture while geometry work continues.

## Integration cadence

First complete one vertical slice: new game, brief intro, any of the four starter choices, exploration, one wild encounter/catch, one landmark gym battle, badge, save, and resume. Expand content after this loop works.

In parallel, verify a visitor-guide slice: open City Map, select a landmark, read what the real place is, then return to the game without losing progress. Use a static, honest guide first; live location and badge synchronization should not delay it.

Menu cycling is a near-term improvement that should reuse the existing game engine. Prove ROM Traditional Chinese rendering and a saved language switch early because this is a larger technical dependency. Browser/guide translations can proceed separately. YouBike stations come later; animated ride-hailing is explicitly a nice-to-have. These priorities do not downgrade the requested bilingual game to a bilingual browser shell.

Integrate small changes approximately every 20–30 minutes while multiple streams are active. Use temporary art, simple dialogue, and provisional balance values to verify behavior early. Do not wait for all artwork before testing map traversal or battle scripts.

The slowest dependency should be the playable loop, not final visual polish. Replicate a working gym pattern rather than designing every gym as a separate technical system.

## Source repository and hosting

The user wants a public GitHub repository and a web application. These are separate release tasks and can be prepared before the final city content exists.

The public repository should contain the web player, original additions, documentation, pinned dependency references, and build/patch workflow. Keep vendor checkouts, private credentials, generated ROMs, save files, and local artifacts out of accidental source publication. Patch distribution does not itself establish permission for every included change; public game-content distribution remains the previously identified rights constraint.

Browser release verification includes actual game boot, keyboard and touch input, audio activation, save persistence across reloads, same-origin emulator assets, required COOP/COEP response headers, and cache behavior after a ROM update.

## Highest-value design work for the user

- A shortlist of gym landmarks and their approximate relative positions.
- A one-sentence concept for each fictional leader; Pokémon teams can follow later.
- Habitat categories and desired Pokémon species or families.
- A decision on open gym order versus a guided progression when the first gym pattern works.

The first two items unblock map structure and narrative in parallel without requiring finished pixel art.
