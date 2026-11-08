# Location banner position

Entering a district displayed the native location banner beneath the top-left minimap. The banner now starts at native x80, toward the centre-right. Its existing vertical slide, display duration, text and dismissal behavior are unchanged. The wider floor and rooftop variants clamp to the screen's right border.

Native source `c8e1495c9cbbd06b71f0b680f3da72e1e78bf9f0` changes only `src/map_name_popup.c` relative to live `a72bd0ea92d3ce41c0b67b1b470066a3b0cfe2d0`. All other 10,712 native Git blobs are identical, including map, save, font and onboarding content. No save migration or new assets are needed.

The frozen cartridge SHA-256 is `822183ac3e62b0ff3f9f9d896223eb6b5f70436ae2c0a8ec7de010c3af9555b1`. Its matching metadata retains the current language, navigation and onboarding bridge addresses and minimap geometry fingerprint.

Validation completed:

- Native build, production frontend build, TypeScript and matched cartridge/geometry checks pass.
- Applying the full exported portable patch to the pinned native baseline produces the exact candidate Git tree `07618c01944d6ad05be03d860683b9324f52de4f`.
- All current English and Chinese district names fit the existing 112px text width. Default outer bounds are x80–208; wider floor/rooftop variants remain within the 240px screen.
- Actual painted-canvas measurements include minimap padding, border, caption and object-fit letterboxing. At 320×568, 390×844 and desktop1606×999, a conservative minimap shadow envelope ends before native x70, leaving at least 10px before the new banner.

Focused normal-entry before/after captures in both languages remain pending. No publication or new physical-iPhone verification is claimed here. Existing broader gameplay and migration matrices are not repeated for a one-file position change.

Evidence: ignored `artifacts/location-popup/build-review/`, `artifacts/location-popup/source-audit.json` and `artifacts/location-popup-hud-qa/measurements.json`. Main owns integration and publication. The unapproved tutorial/settings/copy proposals and Claude map/placement work are excluded.
