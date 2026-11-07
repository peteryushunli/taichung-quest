# Interface and controls — ownership handoff

Status: ready

The user explicitly requested that desktop/mobile interface and controls move to a separate visible chat so they can iterate there while Main session focuses on integration.

## Existing work to preserve

- Worktree: `/Users/peter/devday_hackathon/.worktrees/web-guide`.
- Branch: `feature/web-guide`.
- Previous writer: Main session's web/interface subagent (`/root/browser_game`), now stopped and frozen. Do not assign further source-writing work to that agent in this checkout.
- At the handoff inspection, tracked/untracked work included `web/package.json`, `web/src/game-controls.ts`, `web/src/input-state.ts`, and `web/tests/input-state.test.mjs`. This list is a snapshot; preserve all subsequent valid edits too.

## Destination owner

The new visible **Interface and controls** chat owns hands-on desktop/mobile layout, keyboard/touch controls, UX testing and iteration, and Vercel preparation after the current writer is stopped at a checkpoint. Main retains canonical integration, release artifacts, native game integration, and publication.

## Required handoff

Main session should:

1. Stop or pause only the old web/interface writer at a safe boundary. Leave all other workstreams running.
2. Preserve tracked and untracked files. Prefer a feature-branch checkpoint commit; if the work is incomplete, record it as WIP rather than discarding it or waiting for the whole feature to finish.
3. Record the actual checkpoint commit, validation performed, unfinished files/tasks, preview port/session details if relevant, and any known issues below.
4. Change the status above to `ready` only after no old worker will continue writing this worktree. Do not assign another writer to it afterward.
5. Update `docs/workstreams.md` with the new visible-chat owner. Future handoffs are small reviewed commits from this branch to Main.

Until the status is `ready`, the new chat may inspect source read-only, discuss layouts with the user, and write independent notes under `docs/interface-iteration/` in the parent project. It must not edit, stage, commit, reset, or clean the active web worktree. Do not create a duplicate implementation branch or abandon the in-progress controls extraction.

## Context for the new chat

Read `docs/interface-and-hosting.md`, `docs/game-design.md`, and `docs/workstreams.md` from the parent project. This handoff file is current even if those documents have an older copy inside the feature worktree.

Approved keyboard defaults are **F = Interact / Confirm (GBA A)** and **D = Back (GBA B)**. Directional movement uses arrow keys; D must stop being the WASD-right alias. Keep mobile touch actions semantically labeled. Preserve the live emulator canvas, save/import/restart behavior, language bridge, and guide input isolation.

Priorities are a comfortable portrait/landscape phone experience, clear action buttons and help, reliable multi-touch and release handling, and concise bilingual interface copy. Vercel is the likely desired target; prepare configuration and the ignored-ROM deployment-artifact handoff, while Main owns actual release/publication. Desktop viewport tests must not be described as physical-device testing.

## Main session checkpoint record

- Checkpoint commit: `6f42ebcbe6a563f6a2bc972e61fe84e2b11d5cb4` on `feature/web-guide`.
- Old writer frozen: confirmed. The subagent finished after preserving all tracked/untracked source; Git status is clean. No old-worker source tasks remain assigned.
- Validation: TypeScript check and 12 unit tests passed. See `.worktrees/web-guide/docs/web-controls-wip-checkpoint.md` for the exact implementation record.
- Implemented source: F/D actions and arrow movement, semantic controls, extracted pointer/keyboard ownership modules and responsive control styles. These changes are checkpointed WIP and have not been merged into the main playable release.
- Unfinished: production build/browser QA, responsive and pointer behavior verification, real-phone testing, README control updates, and Vercel configuration/prebuilt-ROM artifact handoff. Vercel research has not created an account or deployment.
- Preview: no new WIP preview is running. Preserve the existing Main session's preview; any new test server should use an available port and its own build output.
- New visible chat ID: `01a1b46a-2f1d-7573-b44f-f85bc6b67219` (local host), **Interface and controls**.
