# Project working preferences

## Browser approvals and local testing

The user prefers minimal approval interruptions and selects **Always allow** for
routine local game-test uploads and downloads. Reuse previously approved local
test origins and keep their ports stable where practical. Avoid unnecessary
switches between `localhost` and `127.0.0.1`, or between ports, because these can
create distinct browser origins and additional permission prompts.

Honor existing authorization without asking the user to reconfirm routine work.
An Always allow grant remains scoped to its origin and capability; uploading,
downloading, and other permission types can have separate checks. This preference
does not authorize bypassing required approvals, disabling security controls, or
treating a local-site grant as blanket permission for unrelated actions. Do not
promise that all future human approval requests are eliminated.

## Chat ownership

Executive Decisions coordinates priorities, dependencies, decisions and reviews.
Implementation belongs to the existing Maps/Landmarks, Gameplay, Story and
characters, and Interface and controls chats. Main session owns integration,
shared PR assembly, combined checks and Vercel publication. Surface independently
ready reviews immediately instead of bundling them.

Current assignments and source checkpoints are recorded in
`artifacts/coordination/2026-11-16-city-development/BRIEF.md`; verify current Git
and deployment state rather than treating that dated checkpoint as permanently
current.

## Map visual quality and approval

Use the prior native maps as the baseline for density, building/object variety
and coherent neighborhood composition. Preserve the highway/water boundary
language when changing geometry. Real named arterials may be supplemented with
designed unlabeled local streets and varied orthogonal street patterns. Give
districts distinct building palettes, including modern Xitun high-rises and
recognizable convenience stores. All new location designs require the user's
explicit approval before installation. Tiger City is an approved additional
non-gym destination; retain ten gyms. Technical checks are not visual approval.
