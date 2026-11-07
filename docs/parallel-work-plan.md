# Parallel work plan

User-approved process for the time-constrained first release. The game decisions in `game-design.md` remain authoritative. The original build chat owns integration and a working build; the design fork should not edit game or web source concurrently.

The user has explicitly directed the main build chat to checkpoint current work and set up separate worktrees for localization, world/gameplay, and web/guide. The main chat should carry out this transition at the next safe checkpoint, preserve all in-progress changes, and record the actual checkpoint commits, worktree paths, branch ownership, and build status. Setup is not complete until those exist and are verified.

## Current foundation

The reconstructed FireRed source compiles locally. The unmodified build matched the original FireRed SHA-1, and a modified game image has been produced. Browser boot, the fast four-starter opening, and playability are still being verified. There is no remaining general-purpose ROM-to-source conversion step.

## Independent workstreams

| Stream | Deliverable | Dependency / boundary |
| --- | --- | --- |
| Build and integration | Reproducible game build, working baseline, verified combined releases | One integrator owns the assembled game and release artifact. |
| World mapping | Compressed city topology, landmark locations, connected maps, doors, collision, habitat regions | Can use existing tiles and placeholder buildings. Coordinate identifiers and entry points with scripting. |
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
