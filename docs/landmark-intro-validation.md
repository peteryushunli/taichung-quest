# Landmark introduction — 7 November 2026

User request: bring the existing landmark game artwork into the top-of-page introduction.

Added four lightly tinted pixel postcards inside the introductory section, below the existing Play action: Old Station, National Taichung Theater, Miyahara and Taichung Park. Names and the gallery heading switch between English and Traditional Chinese. Captions identify the images without redundant screen-reader descriptions. Source provenance and current native status are in `web/src/assets/landmarks/README.md`.

The PNG copies add 21,606 bytes and use Vite's content-hashed same-origin asset URLs. No external images, dependency changes, gameplay/save/input edits or landscape mode were added.

## Verification

- `npm run build`: TypeScript and production Vite build pass. All four separate PNGs appear in `dist/assets/`.
- Browser at 1280×720: four equal columns, all images loaded, document width equals viewport width.
- Browser at 390×844: two columns, all images loaded, document width390. Play is48px high at y341–389, above the gallery and visible without scrolling.
- Traditional Chinese at320×568: all four captions translated; images remain present; two135px columns; document width320; Play remains48px high at y310–358.
- Real local mGBA boot after the intro change: status reaches `OUT EXPLORING`, exactly one game canvas, intro/gallery hidden in the immersive player. Back pauses to `TAKING A BREATHER`, restores all four loaded images and changes the original landing action to Return to game.
- Existing portrait Game Boy view and controls remain untouched. No physical-phone test was performed for this change.

Review screenshots (ignored local artifacts):

- `artifacts/interface-qa/landmark-intro-portrait-en.jpg`
- `artifacts/interface-qa/landmark-intro-desktop-en.jpg`

Main owns integration and publication to the existing private phone-preview Site. This checkpoint is independent of the queued minimap/native-navigation work.
