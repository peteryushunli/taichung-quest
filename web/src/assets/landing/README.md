# Landing page media

The video and stills are real captures of the game. The city map is rendered from the game's source tiles. Nothing here is drawn by hand. These files show Pokémon game content, so read the publication-rights note in the root README before publishing them.

| File | Contents |
| --- | --- |
| `hero-reel.mp4` | 49s loop. The title card, then one unbroken walk from the Botanical Garden greenhouse down the Greenway to the National Museum of Natural Science sign. The player goes in, meets Leader Yicheng in the museum's new gym room, accepts the challenge, opens the battle with Pikachu's super-effective Brick Break and gets the Discovery Badge. The last frames blend back into the title card so the loop has no visible jump. H.264 High, 720×480 (3× nearest-neighbor), 60fps, BT.709, CRF 27, no audio. SHA-256 `f4d655a0dbf04b7f6dd41c4fc8ddeaafcdbfc947f187453a914e03e898af70f0`. |
| `hero-poster.png` | The title card, 720×480: the reel's first frame. Shown until the reel starts and for reduced motion. |
| `bike-greenway.png` | Native-size bike still for How it plays, Step 2. It comes from an older development ROM (SHA-256 `933dbf12…`) and shows the old map. |
| `city-map.png` | The three exterior districts rendered from the game's own metatiles at native commit `a72bd0e` (the published cartridge source), placed at their City Map world origins from `../../data/minimap-contract.json`. 1920×1920 (16px per tile), 161-colour indexed PNG; outside the districts is transparent, and sprites and object events are not drawn. Regenerate with `python3 web/scripts/render-landing-map.py --source vendor/pokefirered`. SHA-256 `d26f3d246beec978ca78ae7f8f7503ad54916841059b65ca085433ee4f8b37e4`. |

## How the reel was made

- **Game footage.** Played on foot (no bike) on the gym interiors cartridge, SHA-256 `1f1b4c364bf52d34e664fa602b6e48265383c7e3ddbc77c5e78ec9bbacc7c540` (PR 15). The game was a new save with encounters set to Off. Every frame was captured at 240×160 with mGBA's own `screenshot()` from its frame-end callback, so no frames are dropped or repeated. The outside walk was driven frame by frame, so each turn happens on a tile boundary with no pause. Pikachu leads the battle; Nidoking, Venusaur and Dragonite were added with the TEAM menu and finish it off camera.
- **Title card.** The web title screen (`#start-screen`) rendered at 720×480 with its animations stepped 100ms per frame, held for 2.5s.
- **Editing.** Waits for menus and text, the leader's history lines and the rest of the battle were cut. Every cut lands on a still screen or on the game's own next change. Outdoor cuts remove whole 80-frame flower cycles, so the flowers never jump. Frames were scaled 3× nearest-neighbor before encoding.

The Pokémon sprites live in `../pokemon/`.
