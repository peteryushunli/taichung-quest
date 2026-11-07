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
