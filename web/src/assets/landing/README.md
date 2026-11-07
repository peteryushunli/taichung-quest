# Landing page media

Real captures of the game, taken from the WebAssembly player's canvas at 240×160 and 60fps, on a development ROM (SHA-256 `933dbf12…`) older than the frozen CMP candidate. Nothing here is drawn or generated. These frames show Pokémon game content, so read the publication-rights note in the root README before publishing them.

| File | Contents |
| --- | --- |
| `hero-reel.mp4` | Partner screen, then a bike ride from the Station plaza past Miyahara, the Greenway sign and Shen Ji to the Greenway gym and Science Museum. H.264, 720×480 (3× nearest-neighbor), no audio. This ROM predates the partner-screen palette fix, so its palette-before-sprite frames on each switch (about 0.28s each) are cut. |
| `hero-poster.png` | Native-size still of the ride at Miyahara, shown until the reel starts and for reduced motion. |
| `bike-greenway.png` | Native-size still from the same ride for How it plays, Step 2. |

Everything else the design calls for (partner and starter sprites, team slots, rendered map) stays a labelled placeholder until art is set in `../../landing-assets.ts`.
