# Landmark introduction — 7 November 2026

Latest user request: move the landmark images below the player to reduce the intro's height, and add a link in the intro text.

The four pixel postcards now sit inside the player column, after the player feedback and before the field notes: Old Station, National Taichung Theater, Miyahara and Taichung Park. The intro's inline “Preview the landmark art.” link uses a native `#landmark-art` anchor. Its target is a labeled section with a level-two heading and programmatic focus. Names, heading and link switch between English and Traditional Chinese. Captions identify the images without redundant screen-reader descriptions. Source provenance and current native status are in `web/src/assets/landmarks/README.md`.

The unchanged PNG copies total 21,606 bytes and use Vite's content-hashed same-origin asset URLs. They now load lazily below the player. The gallery hides in the immersive game view. No external images, dependency changes, gameplay/save/input edits or landscape mode were added.

## Verification

- `npm run build`: TypeScript and production Vite build pass. All four separate PNGs appear in `dist/assets/`.
- Browser at 1280×720: four equal 196.5px columns, all images loaded, document width 1280. Gallery follows the player and feedback. Clicking the intro link focuses the gallery and brings it into view.
- Browser at 390×844: two columns, all images loaded, document width 390. The player starts at y413; the gallery begins at y1013, after the player's bottom at y947. No gallery remains inside the intro. Clicking the intro link sets the hash, focuses the gallery and positions it 24px from the top.
- Traditional Chinese at 320×568: inline link and all four captions translated; images remain present; two 141px columns; document width 320.
- Intro anchor navigation leaves game status `READY WHEN YOU ARE`; it does not boot or alter the runtime.
- Existing portrait Game Boy view and controls remain untouched. The earlier gallery checkpoint passed a real local mGBA boot/Back check; this relocation does not change runtime behavior. No physical-phone test was performed for this change.

Review screenshots (ignored local artifacts):

- `artifacts/interface-qa/landmarks-below-player-intro.jpg`
- `artifacts/interface-qa/landmarks-below-player-gallery.jpg`
- `artifacts/interface-qa/landmarks-below-player-desktop.jpg`

Main owns integration and publication to the existing private phone-preview Site. This checkpoint is independent of the queued minimap/native-navigation work.
