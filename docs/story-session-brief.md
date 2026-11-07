# Story and characters — parallel authoring brief

The user explicitly requested a new visible chat to use GenAI authoring for custom English/Chinese scripts and fictional characters. The project is ready for this content stream: the ten landmarks, Old Station starting point, and shared landmark/gym identifiers are established. Mapping and engine work continue independently.

## Ownership

The story chat owns narrative direction, fictional cast, gym-leader concepts, bilingual dialogue, optional quest writing, and implementation-ready content data. It should carry this work through to reviewable authored files, rather than only sending ideas to Main session.

Write only inside `content/story/` and, if needed, a dedicated `assets/story/` directory. These are new, exclusive content namespaces. The chat runs locally in the existing project, not in another worker's Git worktree. It should not edit native game source, map geometry, menu/save/encounter logic, font/rendering code, browser source, or another stream's files. Main session owns integration, commits/merges into the release, native script compilation, and publication. Avoid Git checkout/stash/reset/add/commit/push operations from the shared local checkout.

Generated writing is authored content for review and integration. A live LLM dialogue service, new API backend, or paid external generation pipeline is not part of this task. Conceptual appearance briefs can be written now; final sprites and bitmap generation can be scoped after the user selects character designs.

## Read first

- `docs/game-design.md`: authoritative gameplay and scope decisions.
- `docs/landmark-shortlist.md`: ten accepted landmarks and excluded places.
- `docs/starting-location.md`: accepted station arrival and short opening.
- `docs/world-map-plan.md`: district structure.
- `docs/workstreams.md`: ownership and integration boundaries.
- `.worktrees/game-mapping/docs/taichung-city-contract.json`: current landmark IDs, map IDs, host symbols, entrances and districts. Read only.
- `.worktrees/game-world/include/constants/taichung_gyms.h`: gym identifiers and progression interface. Read only.
- `docs/landmark-sources.md` and the shortlist's official links: real-world references. Verify factual visitor claims against primary sources before adding new facts.

## Fixed direction

- A compressed Taichung with ten landmark gyms: Old Station, Taichung Park, Miyahara, Calligraphy Greenway/Civic Square, Science Museum, Shen Ji New Village, Fine Arts Museum, Fengjia Night Market, Maple Garden, and National Taichung Theater.
- Gaomei Wetlands, Dajia Temple, Luce Chapel, and Dakeng are excluded.
- Start at Old Taichung Station plaza. Keep the intro brief, offer Charmander/Bulbasaur/Squirtle/Pikachu, then let the player explore with immediate menu cycling and access to the visitor map.
- Each gym leader is a fictional character. Relate their personality and visual identity to the place, while distinguishing invented game lore from real visitor information.
- English and natural Taiwan Traditional Chinese are both required. Draft them together with consistent intent and character voice; do not rely on awkward literal translation.
- Off/Low/Normal controls for random wild encounters and automatic trainer challenges are approved. Story content must not bypass the player's choice by adding unwanted automatic street battles. Deliberately accepted gym challenges remain available.
- The user values speed and exploration. Optional conversations and side quests can add depth; compulsory exposition, mandatory errands, and a long tutorial should not gate movement.
- Gym teams, levels, exact themes/types, order/scaling and final badge names remain undecided. Proposals may be offered as proposals. Write order-independent scenes until gameplay defines progression conditions.

## Initial deliverables

1. Present two concise narrative directions and recommend one, without blocking on the map being finished.
2. Draft a coherent fictional cast and brief gym-leader concepts for all ten places: English/Chinese name, role, personality, motivation, speech style, appearance/sprite cues, landmark ID, and optional theme. Keep proposed choices clearly labeled for user review.
3. Produce a polished first bilingual slice: station welcome, starter handoff lines, a nearby optional NPC conversation, and the first gym leader's greeting/challenge/decline/win/loss/rematch variants. Preserve real battle outcomes rather than granting progress through dialogue alone.
4. Store reusable structured data in `content/story/`, such as `story-bible.md`, `characters.json`, `dialogue.en.json`, and `dialogue.zh-TW.json`. Use stable string IDs and landmark/character references, preserve runtime placeholders in both languages, and separate factual visitor descriptions from fiction.
5. Keep dialogue short enough for GBA text boxes. Inspect existing page/line conventions before proposing implementation-ready scripts. Provide short screen-sized pages and optional longer conversations; leave final glyph/encoding/wrapping validation to localization and integration.
6. Report the authored files, proposal decisions for the user, unresolved gameplay dependencies, and integration mapping. Main can consume the files without waiting for the whole cast to be finalized.

The new chat should begin useful authoring immediately, then involve the user in selecting tone, characters and story direction. It should not restart landmark selection or redesign the world map.
