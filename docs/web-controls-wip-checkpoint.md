# Interface and controls WIP checkpoint

Frozen at the user's explicit ownership handoff to the visible **Interface and controls** chat (`01a1b46a-2f1d-7573-b44f-f85bc6b67219`). This is an unfinished source checkpoint, not a release candidate. Work is in `.worktrees/web-guide`, branch `feature/web-guide`, fast-forwarded from integrated Main `006b58a`. Main's City Pass copy correction (stamp awarded by winning, not visiting) is retained.

## Implemented source, not yet browser-verified

- User-selected keyboard mapping: **F → native A / Interact or Confirm**, **D → native B / Back**. D no longer maps Right; Right uses ArrowRight. Arrows are the advertised movement controls. Z/X remain action aliases, M/Enter open the game menu, E remains the R shoulder button. Existing W/S/A movement aliases remain undocumented. Space/Escape canvas aliases were omitted; Escape remains available to dialogs/browser behavior.
- Updated main-page touch action labels, English/Traditional Chinese accessible names, canvas instructions and visible F/D/M help. The misleading “Z or A” interaction sentence was replaced with “press F, or tap Interact / Confirm.” Native A/B are smaller secondary hints.
- Added `input-state.ts` with per-key/per-pointer hold ownership and reference counting, so one released finger/key does not release another owner of the same native button. Supports directional transfer, center/outside dead zones and visual-only clearing for the existing safe cartridge reboot.
- Added `game-controls.ts` with pointer capture, directional dragging, pointer-up/cancel/lost-capture release, keyboard controls, assistive activation, focus-loss/orientation cleanup and runtime/modal gating. Momentary pressed feedback is reflected in the DOM; `data-held-inputs` contains only current UI holds for verification.
- Added `controls.css` with intended 48px D-pad/system targets, larger readable action buttons, compact portrait framing during play and landscape controls beside the complete game frame. A separate touch City Map control opens the browser guide; it sends no GBA key.
- Main delegates input to the new module. Emulator engine, native language packet, save format and fresh-runtime restart/import strategy were preserved; the new input integration still requires runtime regression checks.

## Checks actually run

- `npm run check` passed on the current WIP.
- `npm test` passed **12 tests**: four new input-state/key-binding tests plus the existing eight native-language bridge tests.
- New tests cover F/D and preserved mappings, simultaneous hold ownership, releasing/canceling one source, directional transfer/dead zones, and reboot clearing without native release calls.
- No failures were observed in those checks. There has been **no Vite production build or browser QA after these control changes**, and no actual phone test. The unit tests do not establish that DOM pointer capture/cancellation or real multitouch feels correct.

## Unfinished work for the new owner

1. Review the WIP wiring and responsive CSS, run a production build, and verify desktop F/D/menu/arrows, D never moving Right, pointer drag/cancel/release, focus and modal isolation. Check portrait/landscape/fullscreen, native dialogue visibility, language changes, saves, ordinary reload, Restart and import. Supported CUA exposes single-pointer UI interaction; genuine multi-finger/device checks may need a real phone.
2. Update browser documentation: `web/README.md` still advertises the old WASD/Z/X primary controls. Clean unused legacy translation fragments if useful. Do not restore the old City Pass visit-awards-stamp claim.
3. Vercel readiness remains **unimplemented**. No `vercel.json`, artifact handoff script, Vercel ignore rule, account action, project creation or deployment was added. Keep this in a separate hosting commit from the UX work.
4. Research already consulted official Vercel docs: [Vite](https://vercel.com/docs/frameworks/frontend/vite), [configuration/headers](https://vercel.com/docs/project-configuration/vercel-json#headers), [Build Output API configuration](https://vercel.com/docs/build-output-api/configuration), and [prebuilt deployment](https://vercel.com/docs/cli/deploy#prebuilt). The expected approach is repository-root configuration, explicit COOP/COEP headers, and an authenticated-owner prebuilt static handoff containing the ignored ROM plus matching metadata. A public Git import alone cannot supply the cartridge; `scripts/build-site.sh` currently requires it first. `.vercel/` is not yet in this checkout's ignore list.

No root handoff document, native gameplay source, Sites manifest, current hosted preview or external repository was changed by this WIP task. No preview server or browser tab was opened for the new control work. All tracked and untracked source changes are included in this checkpoint; generated/ignored local artifacts remain ignored. Parent owns the ready gate and release integration.
