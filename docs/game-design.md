# Taichung Quest — game decisions

## Current integration direction — 8 November 2026

PR8 combines Claude's authored Xitun, Nantun/temple and Old City map work with Codex's seven remaining gym implementations. Claude retains map and building ownership; Codex's resumed scope is gym activation and bug fixes. Main owns the combined native source, glyph codebook, one portable patch and matching release package. Source consolidation is authorized before every runtime check finishes; production publication still requires the combined release gates.

Keep ten permanent gym IDs and real-win badge bits. The two temple halls are visits, without extra badges. Reuse the accepted characters and bilingual drafts, original150 species, six-partner Team menu, level50 presets and challenge-time HP/status/PP recovery. Existing badges must survive party changes and Save/Continue.

The compact tutorial presentation has screenshot approval and is included, with native A/B hints and the released touch controls preserved. The shorter opening and configurable keyboard setup remain isolated review proposals. YouBike/taxi, player-art expansion and poster work are outside this release. Older priorities below are historical where they conflict with this section.

Source of truth for the game direction discussed on 7 November 2026. These decisions supersede the earlier assumption that the final world would be one literal West District neighborhood.

## World map

The preferred direction is a shrunken version of Taichung as a whole. Compress distances and omit most minor streets. Preserve the city's identity through prominent, recognizable landmarks and distinct urban, park, and natural areas.

The initial West District / Calligraphy Greenway prototype is the technical foundation. The current three-district blockout connects Old City, Greenway and Xitun. The ten included landmarks are approved below; final geographic scale and neighborhood coverage remain open.

Geography should support exploration: short connections between memorable destinations, a readable route structure, and a clear distinction between buildings, safe circulation space, and encounter areas. This is a design recommendation; exact topology is still to be chosen.

### Landmark scope update

After reviewing the real-location map, the user excluded **Gaomei Wetlands**, **Dajia Jenn Lann Temple**, **Luce Memorial Chapel**, and **Dakeng**. The latter pair was initially tentative, then explicitly removed. All four are out of the working roster.

The user explicitly added **Maple Garden / 秋紅谷**, then accepted the remaining suggested additions. The included urban roster is now ten places: the Theater, Greenway/Civic Square, Old Station, Taichung Park, Fengjia, Science Museum, Maple Garden, Miyahara, Shen Ji New Village, and the Fine Arts Museum. Their fictional leaders, teams, and detailed layouts remain open. The previously proposed coastal and hill districts are out. See `landmark-shortlist.md` for the roster and `world-map-plan.md` for the proposed tile-world structure.

The user accepted **Old Taichung Station plaza** as the starting location. Preserve the brief welcome, four-starter selection, immediate exploration, and menu cycling when migrating the existing Greenway prototype opening. See `starting-location.md` for the accepted sequence. Do not add a multi-start selection feature; the earlier Greenway and Maple Garden alternatives were discussion options.

## Player-facing city map and landmark guide

The game must provide an accessible city-map feature that helps players understand Taichung's landmarks. Promoting the real city is part of its purpose, so the map should do more than provide navigation or gym locations.

Recommended first implementation: a persistent **City Map** button in the browser player opens a companion map/guide. This is a proposal for implementation speed, not a requirement to replace the in-ROM map permanently. It can be developed independently of ROM gameplay and supports readable Traditional Chinese and English content.

The first guide should provide:

- A readable overview of the compressed game city, with labeled landmark markers and understandable connections.
- Selectable landmarks with their real names in English and Traditional Chinese, a recognizable illustration or thumbnail, and a short explanation of what the place is and why someone would visit.
- A link to the actual real-world location or official visitor information after the location and factual description are verified.
- A clear relationship between a landmark and its fictional gym; distinguish real visitor information from invented game lore.
- Visible access to landmark information from the beginning. Do not hide basic tourism information behind gym completion or exploration requirements.

The compressed game map is not an accurate real-world street-navigation map. External location links provide the bridge to real geography. Clearly identify areas that are planned but not yet playable; a marker must not imply that a working gym or game district already exists.

Live player location, visited markers, and badge/gym completion indicators are useful later additions. They require deliberate synchronization with ROM state and should not block the first map/guide. Do not simulate player tracking or infer progression from the player opening a card.

Use stable landmark IDs shared by the game map, gyms, and guide content. A small landmark catalog should hold display names, overview-map coordinates, game area references, visitor descriptions, source links, and real-world locations. The map/guide must be easy to open and close on both desktop and mobile without resetting the game.

## Landmark gyms

Each featured prominent landmark should become its own gym. Replace the original Kanto gym leaders with fictional characters created for this game; do not model leaders on real local people.

Open decisions:

- Detailed layouts and integration of the ten approved landmark gyms.
- Fictional leaders' names, personalities, appearances, and dialogue.
- Pokémon rosters, themes or types, levels, badges, battle order, and scaling.
- Whether every gym can be challenged immediately or some progression applies.

Landmarks shown in the first prototype may be provisional representations. A sign or reused building does not yet constitute an implemented gym battle.

## Wild encounters

Wild Pokémon should fit the environment in a believable way. Parks and green spaces are obvious encounter locations. Streets are also an option because this is a real city; urban wildlife need not be confined to classic tall grass.

Species, habitat allocations, encounter triggers, encounter rates, and level ranges are undecided. Do not silently turn every street into a random-encounter zone or lock in a final regional Pokédex.

Candidate habitat categories for later allocation are urban streets and service alleys, parks and gardens, waterways or wetlands, and wooded trails. These are planning categories, not finalized species tables.

## Encounter and automatic trainer-challenge settings

The user wants startup and in-game-menu controls for wild Pokémon and strangers initiating battles, each with **Off / Low / Normal** options. Implement these as two independent saved settings so a player can, for example, keep wild encounters while disabling unsolicited trainer challenges.

Implementation is explicitly approved. The gameplay workstream owns the native encounter/trainer behavior and settings; Main session coordinates shared startup/menu wiring and save-variable allocation, with localization providing bilingual text. Proceed in parallel with map production, using existing map/test fixtures where needed rather than waiting for the city maps to finish.

Recommended semantics:

| Setting | Off | Low | Normal |
| --- | --- | --- | --- |
| Wild encounters | Suppress automatic/random wild battles during exploration | Reduce the area's configured encounter probability; an initial tuning candidate is roughly one quarter of normal | Use the area's configured encounter behavior |
| Automatic trainer challenges | NPC trainers do not initiate battles on sight | Reduce trainer detection distance so they challenge only at close range | Use each trainer's configured detection behavior |

These controls target interruptions during exploration. Deliberately initiating a gym or trainer battle remains available. The wild setting must clearly describe its random-encounter scope; do not accidentally disable all explicit battle interactions or award gym completion without fighting.

Keep startup fast with one compact settings screen and sensible defaults. Provide later access through an **Exploration** or equivalent options submenu rather than crowding the main menu with separate entries. Settings persist in the native save and can be changed without restarting or losing party, map position, or progress. Changes affect subsequent encounters, not an already-running battle. Expose the controls and explanations in English and Traditional Chinese.

Recommended compatibility default is Normal for unset/older saves. Reserve named save variables without conflicting with language, starter, quest, gym-completion, or bridge fields. Specific numeric rates and close-range tuning are implementation defaults to verify, not finalized balance decisions.

Source inspection confirms appropriate native hooks: `StandardWildEncounter` / `DoWildEncounterRateTest` in `src/wild_encounter.c`, and `CheckForTrainersWantingBattle` / `GetTrainerApproachDistance` in `src/trainer_see.c`. There is already a temporary wild-disable check, but the requested preference must be saved and respected independently of scripts re-enabling encounters. Low trainer mode should use stable detection rules; a fresh random gate every frame could still trigger an unwanted battle almost immediately.

Validation should cover each mode, independent combinations, walking and cycling (plus surfing if exposed), unchanged voluntary gym challenges, switching modes in the field, bilingual menu layout, and save/reload persistence. Normal must preserve existing gameplay; Off must remain off after map transitions and script-controlled encounter resets.

## Fast opening

The required new-game sequence is:

1. A brief introduction to the Taichung adventure.
2. A choice of exactly one starter: Charmander, Bulbasaur, Squirtle, or Pikachu.
3. Immediate entry into the map to explore.

Skip the original extended introduction and early-game ramp. No compulsory delivery quest or lengthy tutorial should block free exploration. Any existing tea-shop errand should be optional.

The four choices must work inside the actual ROM. Do not seed a fixed starter and present a cosmetic web choice. Continuing an existing save should resume that save instead of rerunning starter selection.

Starting levels, supplies, player naming/customization, and the exact introductory dialogue are implementation defaults that can be revised. Keep them separate from the fixed four-species choice.

The startup also exposes the requested encounter/trainer options without adding a prolonged tutorial. A compact initial preferences step can combine these choices with the language flow.

## Faster movement and transport

### Immediate cycling

Players should be able to mount a bike directly from the game menu at the start of the adventure, and dismount through the menu. No bike purchase, voucher, or lengthy unlock quest should be required for this first version.

Reuse FireRed's existing bicycle movement, animation, and field-eligibility checks where appropriate. The local source already contains the bike item and mount/dismount behavior. Make the action discoverable as **Bike / Get off bike** rather than relying only on knowledge of the original game's item-registration shortcut. Retain valid collision, door transitions, and safe handling of areas where riding is not permitted.

### Later YouBike stations

Scatter recognizable YouBike-inspired stations around the city, especially near landmarks and district connections. Players can obtain a bike from a station. They can dismount or return it anywhere; the game should not require them to find a docking station to stop riding.

The interaction distinction is that dismounting stops riding, while returning ends the rental. Exact rental rules, costs, and the relationship between stations and the initial always-available menu bike remain open. Do not remove convenient menu cycling as an unstated consequence of adding stations.

### Nice-to-have ride-hailing / fast travel

An in-game ride-hailing option, provisionally described by the user as calling an Uber, should be available from the menu. Each featured landmark has a designated drop-off point.

Desired sequence:

1. Choose a landmark destination from the menu.
2. A car, or a simpler reusable vehicle visual, arrives near the player.
3. The player boards and disappears into the vehicle.
4. A brief transition loads the destination map.
5. The player exits at the landmark's safe drop-off point.

This is a lower-priority enhancement. A simple boarding/transition/arrival sequence is acceptable before polished car animation. Destination drop-offs should use the shared landmark IDs and explicit game-map coordinates; only implemented destinations can be offered. Fares and destination-unlock rules have not been decided.

## English and Chinese language selection

The user requires English and Chinese selection on initial startup and the ability to change language later from the menu. Use Traditional Chinese for the Taichung setting as the current working assumption.

The intended scope includes the actual in-ROM game experience as well as browser controls and the city guide. Translating only the browser wrapper does not fulfill the in-game requirement. Cover the player-facing menus, custom dialogue, landmark information, and gameplay text that the release exposes; record any untranslated coverage explicitly.

Place the initial language choice before the brief introductory text and starter selection. Save the preference, honor it when continuing, and allow later changes without resetting the adventure or losing the selected starter, location, badges, or other progress. Keep browser/guide and ROM language choices consistent through an explicit integration.

Implementation constraint: the current English FireRed reconstruction uses encoded text and Latin/Japanese font assets. Its existing language constants do not provide Traditional Chinese. Full ROM support therefore needs glyph/font work, encoding or lookup changes, translated strings, and layout verification. Treat localization as its own workstream, not a label-only menu toggle.

An early technical checkpoint should render a real Traditional Chinese dialogue and a menu in the emulator, verify readable glyphs and line wrapping, and demonstrate a language switch without lost progress. Browser and guide translation can proceed independently while the ROM font work is validated.

## First playable acceptance

- The modified FireRed ROM runs in the browser emulator.
- A new player reaches starter selection quickly, receives the selected species once, and can explore immediately.
- All four starter paths are valid; cancelling cannot leave the player without a Pokémon.
- The map contains actual layout changes, valid collision, working doors, and reachable NPCs.
- Players can open a city map, identify the featured landmarks, and read what those places are. The guide distinguishes the compressed game geography and fictional gyms from real visitor information.
- Menu cycling is available immediately, and mounting/dismounting preserves valid map movement and transitions.
- Players can choose and later change independent Off/Low/Normal settings for random wild encounters and automatic trainer challenges; preferences persist, and voluntary gym challenges remain available.
- The current build's implemented areas and provisional landmark/gym content are described honestly.

Language selection is an additional required feature, not a completed capability of the current prototype. Before claiming bilingual support, verify actual in-game Traditional Chinese rendering, startup selection, saved preference, and later menu switching. YouBike stations and ride-hailing remain later-stage enhancements.

## Useful next design contributions

The most useful next user decisions are the landmark shortlist and approximate arrangement, fictional gym-leader concepts, and a habitat-to-species allocation. These can be developed while the playable foundation is built.

Reference for later landmark selection: [Taichung Tourism and Travel Bureau attractions](https://travel.taichung.gov.tw/en/attractions/listbyclassification). No final landmark roster has been selected from this list.
