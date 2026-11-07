# Desktop/mobile interface and Vercel readiness

The user wants the browser game to feel usable on both desktop and mobile. Directional movement feels intuitive, while learning A/B actions feels awkward. Vercel is the user's likely preferred hosting target; this is a feasibility/preparation direction, not a request to create an account or publish a new production deployment immediately.

## Ownership

The user has explicitly requested a separate visible **Interface and controls** chat for desktop/mobile iteration. It will take over the existing web/interface workstream in `.worktrees/web-guide`, with Main session reviewing and integrating changes and owning releases. Preserve the current worker's in-progress changes and complete the ownership handoff in `docs/interface-session-handoff.md` before the new chat edits code. Mapping, native gameplay, localization, and story authoring continue independently.

## Proposed control improvements

- Retain the directional pad. Give action buttons clear primary labels: **Interact / Confirm** and **Back**, with small A/B hints to connect them to the game's original prompts.
- Give **Menu** and **City Map** clear, separate controls. City Map opens the browser guide; do not send an unrelated GBA key and imply it is a map shortcut.
- Localize labels and accessible names in English and Traditional Chinese.
- Make mobile action hit areas generous; use roughly 48 CSS pixels or larger as the initial target, with spacing that limits accidental presses.
- On portrait phones, keep the game above thumb-accessible controls. In landscape, allow controls beside the game, preserving a large readable viewport. Keep decorative framing/header space compact during play and avoid covering dialogue with controls.
- Preserve reliable simultaneous movement/action input. Release held buttons on pointer cancellation, lost capture, pause, modal opening, focus loss, and orientation changes. Prevent accidental page gestures within the game controls without blocking normal interaction with the visitor guide.
- Provide visible pressed-state feedback. Test whether thumb movement between directional targets feels natural rather than assuming desktop pointer clicks represent touch use.

### Approved desktop keyboard defaults

The user explicitly selected **F = Interact / Confirm** and **D = Back**. Map physical `KeyF` to the emulator's A button and `KeyD` to its B button; the native GBA A/B semantics remain unchanged.

Use arrow keys for default directional movement. The current physical D key is the WASD right-movement alias, so remove that conflict: pressing D must never move right while also cancelling. Do not continue advertising WASD as a complete default movement scheme after reserving D for Back. Non-conflicting Z/X legacy action aliases can remain if useful, but help text and desktop button hints should present F/D as the primary keys. Menu aliases can remain Enter/M as appropriate.

On mobile, retain semantic touch-button labels rather than requiring a physical keyboard. Use small native A/B hints where useful for understanding original game prompts; desktop help should distinguish physical F/D from those emulated buttons. Update hints, accessible names, canvas instructions, translated copy, and tests consistently. Check focused buttons, text inputs, modal closure, pointer/keyboard overlap, and key-release handling. Avoid casually remapping KeyE: it currently maps to the GBA R shoulder button.

Observed ambiguity in the existing page: it says to press “Z or A” to interact, while physical keyboard A is mapped to moving left through WASD. The hint means on-screen A, but does not explain that distinction. Update hints, button labels, canvas instructions and keyboard help together.

F/D are approved keyboard defaults. The final mobile layout remains a prototype/testing decision; a configurable keybinding editor has not been requested.

## Vercel feasibility

The frontend is a Vite/TypeScript static application. The emulator runs in the browser. Vercel supports Vite deployments and custom static response headers, so the architecture is compatible in principle.

Preparation requirements:

1. Configure the intended Vercel project root, web build command and static output directory. Preserve the current working preview while preparing the alternative target.
2. Supply `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` through Vercel configuration. The current threaded mGBA build requires `crossOriginIsolated` and `SharedArrayBuffer`. A Cloudflare-style `_headers` file alone is not sufficient evidence of Vercel configuration.
3. Keep emulator JavaScript/Wasm, game artifacts and required fonts available from the intended origin, and verify asset MIME types and worker startup on a real preview deployment.
4. Define how the game artifact reaches the deployment. `vendor/`, `.tools/`, generated ROMs and `web/public/roms/*.gba` are intentionally absent from the public Git repository. A plain Git import followed by `npm run build` does not, by itself, supply the ROM. The existing `scripts/build-site.sh` explicitly requires the ROM first. Prepare a reproducible artifact/build handoff; do not silently publish a game-less page or commit the ROM just to make deployment easy.
5. Keep save export/import working. Browser storage belongs to a device/browser and origin; moving to a Vercel origin does not automatically carry saves over. Account/cloud save synchronization is not part of this scope.

Official references: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Vercel response-header configuration](https://vercel.com/docs/project-configuration/vercel-json#headers).

## Verification and first deliverable

Deliver a small responsive-control prototype and a separate Vercel-readiness/configuration commit, with build checks and concrete limitations. Verify desktop keys, portrait/landscape layouts, multi-pointer movement/actions, modal input isolation, language changes, save persistence and the existing restart/import behavior.

Desktop browser resizing is a layout check. Real iPhone Safari and Android Chrome touch/performance testing remains necessary before claiming mobile usability. Record which devices/browsers were actually tested and keep physical-device checks distinct from desktop emulation.
