# Portrait-first controls review

This is a reviewable interface pass on `feature/web-guide`, continuing preserved checkpoint `6f42ebc`. The user selected portrait first, with landscape supported. Layout feedback is pending in the visible Interface and controls chat; this is not a production publication.

## Changes

- Primary desktop controls are arrows, F = Interact/Confirm, D = Back and M/Enter = Menu. D has no movement binding. Non-conflicting legacy aliases and E = R remain.
- Portrait keeps the full game above a 144px D-pad, two large semantic actions and separate Menu/City Map controls. Mobile hints show small native A/B labels; physical F/D instructions remain in desktop help and accessible names.
- Short landscape puts the controls beside the full game, including dialogue. Fixed a duplicate mobile guide row, landscape overflow and a Play transition that could leave the game above the current scroll position.
- Focus leaving the play surface clears held inputs. Key repeats cannot reacquire inputs after a modal, focus loss or rotation. Focused game buttons support F/D and independent Enter/Space holds. Native pointer capture and per-source reference counting from the WIP remain intact.
- Fullscreen styling retains touch controls and a visible exit action. Unsupported requests produce the existing bilingual inline explanation, including when the API itself is missing.
- No native source, map geometry, story, save format or language protocol was changed. Main owns integration and publication.

## Checks performed

- TypeScript and Vite production build passed. Input-state plus language-bridge suite: 12 tests passed.
- Browser fixture: **9/9 synthetic DOM checks passed**, covering F/D and arrows, simultaneous sources, drag transfer, center/outside dead zones, cancellation/lost capture, editable/guide controls, modal repeat suppression, focused button activation, blur/rotation/fullscreen cleanup, assistive pulses and safe reboot forgetting. Synthetic pointers use an explicitly stubbed OS-capture boundary; native emulator callbacks are stubbed too.
- Desktop layout checks at 320×568, 390×844, 568×320, 844×390 and 1280×900. No horizontal document overflow remained. At 320px, D-pad/system targets were 48px tall, with action targets 106×58px. The smallest landscape gives a roughly 208×139 game frame; native text is correspondingly smaller.
- Actual desktop in-app emulator: F confirms the native opening, arrows move, D cancels the native menu without moving right, M and the touch Menu control open the native menu, and a real pointer drag releases with no held UI inputs.
- City Map releases controls, pauses a running game, isolates F, and returns focus to its opener after Escape. Opening/closing it while already paused preserves the paused state. Resume restores input.
- Browser language selection reached a real Traditional Chinese native menu while preserving the live canvas. Continuing the native save eventually republished its saved Chinese language to the browser after the title/load transition.
- Save spot persisted and a normal reload resumed the snapshot. A real cartridge save exported as **131088 bytes**. Restart promptly returned to `?cartridge-boot=1`; importing that unchanged backup returned to `?cartridge-boot=import`. Both new runtimes exposed the same real CONTINUE entry (WALKER, 0:03, Pokédex 1, 0/10 stamps). Continue returned to the saved Station position and Chinese language.
- Runtime used a read-only copy of Main's frozen release pair: ROM SHA-256 `629bcd40965e7e5af51c3e1ffbb6fa436f76fe454fbb9f21aa7015e3dd6a2185` (SHA-1 `ae0ada352b1cd0b0d281c09fdde42a95446c9b4f`), 16777216 bytes, native source `1599d801a6d29dc6c4a33e7ad2a034a14e9d070f`. Exact metadata stayed paired with the ROM.

## Limits and review artifacts

All browser work was on this Mac using the desktop in-app browser and a separate Chrome tab on loopback port 5174. **No physical iPhone Safari or Android Chrome test was performed.** Real multi-finger feel, browser chrome/safe-area behavior, touch performance and device storage behavior remain open.

Fullscreen briefly displayed the controls and exit action in the in-app browser, but its automation/viewport state did not sustain a reliable fullscreen session. Chrome rejected the Fullscreen API request; the fallback remained usable. Sustained fullscreen, City Map within fullscreen and physical-device fullscreen need direct verification. No claim of complete fullscreen QA is made.

Local screenshots and the test-only exported save are ignored under `artifacts/interface-qa/`. Review images are `portrait-zh.jpg` and `landscape-zh.jpg`; the initial fullscreen capture is diagnostic only. A normal build excludes the optional control-test fixture from release output.

The feature's local preview is independent of Main's preview. Main should integrate the interface commit separately from Vercel preparation and rerun affected release checks against its final combined source.
