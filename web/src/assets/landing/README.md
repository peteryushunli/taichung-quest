# Landing page media

The video and stills are real captures of the game, taken from the WebAssembly player's canvas at 240×160 and 60fps, on a development ROM (SHA-256 `933dbf12…`) older than the frozen CMP candidate. The city map is rendered from the game's source tiles. Nothing here is drawn by hand. These files show Pokémon game content, so read the publication-rights note in the root README before publishing them.

| File | Contents |
| --- | --- |
| `hero-reel.mp4` | Partner screen, then a bike ride from the Station plaza past Miyahara, the Greenway sign and Shen Ji to the Greenway gym and Science Museum. H.264, 720×480 (3× nearest-neighbor), no audio. This ROM predates the partner-screen palette fix, so its palette-before-sprite frames on each switch (about 0.28s each) are cut. |
| `hero-poster.png` | Native-size still of the ride at Miyahara, shown until the reel starts and for reduced motion. |
| `bike-greenway.png` | Native-size still from the same ride for How it plays, Step 2. |

| `city-map.png` | The three exterior districts rendered from the game's own metatiles at native commit `a72bd0e` (the published cartridge source), placed at their City Map world origins from `../../data/minimap-contract.json`. 1920×1920 (16px per tile), 161-colour indexed PNG; outside the districts is transparent, and sprites and object events are not drawn. Regenerate with `python3 web/scripts/render-landing-map.py --source vendor/pokefirered`. SHA-256 `d26f3d246beec978ca78ae7f8f7503ad54916841059b65ca085433ee4f8b37e4`. |

The Pokémon sprites live in `../pokemon/`.
