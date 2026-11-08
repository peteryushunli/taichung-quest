# Touch release hotfix — independently releasable

Source base: `015747b45b238e6d0f1b331a988e08639ce1dbf0` (current main, including the merged landing page). Branch: `codex/touch-release-hotfix`. The unapproved compact tutorial/settings revision is excluded. Native source, ROM, save format and keyboard assignments are unchanged.

The user reported continued Right movement after lifting their finger on Chrome/iPhone; the screenshot also showed Right pressed. The existing controls only observed terminal pointer events on their root element. A focused browser regression reproduced a missed off-root terminal event leaving both the Right native-callback owner and its visual pressed state held. This establishes a concrete release-delivery gap; no device event trace establishes the exact iPhone event sequence.

The hotfix handles pointer movement and terminal events in the window capture phase, before a target can stop propagation. Pointerup, pointercancel and lost capture release only their matching owner. A transfer of implicit child capture to the controls root does not terminate a valid hold. No-contact movement, focus/visibility/fullscreen/orientation changes and pagehide/pageshow clear stale ownership as appropriate. Capture API races cannot interrupt cleanup.

When a touchend/touchcancel reports zero remaining touches, only touch-pointer owners are released. A terminal event with another finger still down does not trigger blanket cleanup; keyboard/mouse/pen ownership is preserved. No hold watchdog or arbitrary release timeout is added. The existing bounded assistive-click pulse is unchanged.

This follows the browser’s [pointer capture/implicit release model](https://www.w3.org/TR/pointerevents3/#implicit-release-of-pointer-capture) and the [TouchEvent active-touch list](https://www.w3.org/TR/touch-events/#widl-TouchEvent-touches).

## Verification

- Current-main unit suite: **44/44 pass**. TypeScript and production Vite build pass.
- Chrome browser fixture before the fix: **13/18 pass**, with five new failures. The off-root pointerup left Right held and omitted its native release callback.
- Final Chrome browser fixture: **18/18 pass**, with explicit native press/release callback and pressed-class assertions. Covers stopped-bubbling off-root termination, cancellation/disabled target, capture loss/transfer, last-touch recovery, a continuous 1.2-second hold, simultaneous movement/action, keyboard/mouse ownership, no-contact movement, and page lifecycle cleanup.
- Browser fixture dispatches real DOM PointerEvent/TouchEvent objects into the production controls listeners with stub native callbacks and capture bookkeeping. It does not test a physical iPhone, OS touch delivery, or a Wasm cartridge. Physical-device retest remains necessary after Main publishes the concrete fix.

Evidence: ignored `artifacts/touch-release-hotfix/{before.txt,before.jpg,after-final.txt,after-final.jpg}` and `manifest.json`. The final suite extends the same five new case groups with explicit mouse/capture-transfer assertions. No game acceptance sweep or native build was run.

Only `web/src/game-controls.ts`, its existing browser fixture and this evidence note belong to this hotfix. Main owns integration/publication from the current-main base and exact frozen cartridge pair. The scoped QA tab is closed; no user/private or other-session tab was touched.
