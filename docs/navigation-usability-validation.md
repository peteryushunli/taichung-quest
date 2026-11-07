# Navigation usability follow-ups — 7 November 2026

These changes are staged only in the assigned web-guide checkout. The released presentation source/native pair, presenter save/route and hosting are unchanged.

## City Map close targets

Observed in the released portrait guide: close × was 27×27px; Back to adventure was 41px high. Both were smaller than the player's existing 44px minimum controls.

The bounded CSS fix sets close × to 44×44px and Return to at least 44px, using `touch-action: manipulation` for these two actions. Map geometry, marker/card selection, dialog flow, Escape behavior and native/input code are unchanged.

Verification:

- Production TypeScript/Vite build passes; no additional implementation-mirroring unit tests added for this CSS-only change.
- At 390×844 in Traditional Chinese, close is 44×44 at x321–365; heading ends at311, leaving 10px separation. Document width equals 390.
- At 320×568 in English, close is 44×44 at x251–295; heading ends at241, leaving 10px separation. Title wraps without overflow; document width equals 320.
- Selected Miyahara card and ten landmark choices remain available; Return measures 44px high.
- Actual browser clicks on × and Back to adventure close the guide. Escape also closes it.
- Before changing CSS, the unchanged released runtime was checked: opening the guide pauses; selecting a card and closing resumes the same player position with one canvas and game-canvas keyboard focus. Desktop 1280×720 shows all ten labeled markers after one short overview scroll. Portrait 390×844 shows all ten numbered markers and ten 53px-high bilingual list choices.
- These are browser viewport/click checks, not physical-phone multi-touch evidence.

Before/after review artifacts (ignored):

- Before: `artifacts/interface-qa/released-city-map-portrait.jpg`.
- After: `artifacts/interface-qa/city-map-close-44-390.jpg` and `city-map-close-44-320.jpg`.
- Existing full map demo: `released-city-map-desktop.jpg` and `released-city-map-card-portrait.jpg`.

Existing demo actions: click/tap the live minimap or the separate City Map button. On desktop, select a marker and Escape returns to play. On mobile, select a named landmark and use Back to adventure below its card; × closes the overview directly. The next-cycle target-size fix is not required for or installed in the current live demo.

## Compact landmark names

The live HUD's full landmark names clipped at its smallest width. The footer now uses ten distinct compact English and Traditional Chinese names from the shared landmark catalog. For example, National Taichung Theater appears as “Theater” and the National Museum of Natural Science as “Science.” Official full names remain in the tooltip and accessible button name; the full City Map keeps its existing names.

Indoor status moves to a separate badge inside the existing HUD, leaving the footer available for the place name. Native indoor anchoring, location freshness, guide action, Off/On preference and geometry/build checks are unchanged. The badge and cached landmark identity clear when native location becomes unavailable.

Verification:

- TypeScript/Vite production build passes and all 26 unit checks pass.
- The isolated browser fixture passes 11/11 checks at 320×568 and 390×844. These include all ten labels in both languages at the minimum 64px HUD width / 56px footer, unique names, and retention of every official full accessible name.
- At the minimum width, switching from field to indoors keeps the HUD at 64×78.4px. At 390px, the fixture HUD stays 77.4×91.8px before and after the badge appears.
- This is presentation verification with explicitly simulated navigation. Acceptance against the next frozen Theater/Park ROM and its exact metadata remains separate.
- The final normal build removes the development fixtures from the production output.

Review images (ignored): `artifacts/interface-qa/minimap-name-after-en-320.jpg`, `minimap-indoor-after-en-320.jpg` and `minimap-indoor-after-en-390.jpg`.

## Shared button-icon sizing regression

Actual Theater client verification found a CSS integration defect absent from the earlier isolated fixture: the shared `button svg { height: 18px }` rule constrained the minimap drawing to 66.4×18px in the 390px game view. Its own width and aspect ratio did not override that explicit height.

The minimap SVG now explicitly uses `height: auto`, restoring its intended square drawing at the existing width. The browser fixture imports the real shared stylesheet and checks that the map stays square, rather than testing the HUD in isolation from the app's button rules.

- Real native Theater field at 390×844: drawing 66.4×66.4px; outer HUD 74.4×88.8px. Previously the outer HUD was only 40.4px high because the drawing was constrained.
- Real native Theater field and hall at 320×568: drawing 56×56px, outer HUD 64×78.4px, footer fits its 56px content width, and no horizontal page overflow. The indoor marker remains at the authored Theater entrance and the Chinese indoor badge is visible.
- All 12 browser fixture checks pass at both portrait sizes with the shared stylesheet, including ten distinct names in both languages and unchanged footprint when entering a hall. Production TypeScript/Vite build passes.
- Native location parsing, ROM binding, controls and readiness statuses are unchanged. A final normal build removes the fixtures.

Actual-game review images: `artifacts/interface-qa/theater-cast-square-hud.jpg` and `theater-cast-square-hud-indoor-320.jpg`. These are desktop browser viewport checks, not physical-phone tests.
