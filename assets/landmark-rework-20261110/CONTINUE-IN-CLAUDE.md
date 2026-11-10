# Continue in Claude — ownership and commit status

User preference: **F is the clear first choice; C is a distant second.** Preserve the improved Xitun/building styles. This records a design decision only; Codex has not implemented city-shape expansion.

Read-only check: remote main is `80c714f5a5a4db209a6641840ec6674181d735ee`. The local root main remains `f2fdc51af40eb70569cb94be52eaef6cdaf7ced3` with five modified docs and other untracked work. This art package has **0 files on remote main** and is not installed in the game. Do not tell Claude that all local work is committed.

Claude owns current native map/source/shared-bank changes, the portable native patch, and PR/main integration. Codex's work remains separate art/generator/reference/decision files under this package. Use a current main-based Claude checkout; preserve the stale root's dirty work and the old Codex checkpoints.

The game source is a separate ignored Git repository. These latest ten drafts are assets-only and changed no native files, so this handoff requires no native patch export by Codex. After Claude integrates selected assets in the current native source, Claude can export those actual changes through its own release workflow. Do not resume or export an older Codex map merge.

See README.md, art-manifest.json and temples/native-footprint-audit.json for the art handoff, capacities and exact current geometry. Keep native map ownership exclusive so Claude and Codex do not edit the same files. This status request does not authorize publishing.

## Subsequent authorization for selected art installation

The user has since approved installation of the selected ten landmark drafts while preserving Claude’s latest map. The Decisions/Main art-integration chat owns this new isolated integration from current Claude native source; the earlier assets-only limit is superseded for that task. This source-pointer chat only audits read-only and does not start a competing integration. Old PR11/map reconciliation remains outside this art task. The original F>C preference remains recorded. See `native-map-source-status.json` for the latest registered-worktree check.
