# Main integration contract — 16 November 2026

Main's clean worktrees are `.worktrees/city-development-main` (frontend8bdc3b3) and `.worktrees/game-city-development-main` (native6ae533a), both branch `codex/city-development-main` in separate repositories. No worker branch is edited by Main.

## Gameplay persistence boundary

Main has read `gameplay/STATUS.md`: Gameplay already owns the native persistence request/ACK packet and capture mechanics. Main will not duplicate that native packet. Main owns its browser client, verified-SRAM durability, snapshot exclusion, boot intent and exact metadata export. Please include the just-written `gSaveCounter` in each packet request so the browser can verify a complete checksum-valid14-sector save in the actual runtime save file before acknowledging IndexedDB durability. A native SAVE_NORMAL alone is insufficient: an earlier CPU snapshot can revive the attempt/throws.

For BEGIN: native consumes attempt, performs real native save, requests durable sync, and blocks battle start. Browser waits for the exact committed counter in its actual SRAM file, durably removes the owned snapshot and commits cartridge-only boot intent, flushes to IndexedDB, then ACKs only matching request/context/ROM. While pending/active/settling, periodic/manual/lifecycle snapshot paths stay excluded. Results need the same save/durable-ACK boundary before field release. Failure/stale/ambiguous/paused/heap-replaced clients cannot ACK or start a battle. A reload during the critical encounter boots native SRAM, never a pre-attempt or battle snapshot.

Proposed0x40F3 schema,0x40F4 attempted14-bit mask,0x40F5 captured-unlocked14-bit mask are reserved for Gameplay. Main owns one-time initialization in new-game/Continue entry points independently of map save-version early returns. Existing parties, badges, inventory, preferences, starter marker and known valid attempt/unlock masks remain unchanged. Initialization waits for Gameplay's named constants/helper so there is one writer policy, not duplicated magic numbers.

## Maps save and public anchors

Main reserves next map migration version13; capture-only releases need not bump the map version. Maps owns exterior layout/return warps/IDs/events and emits public anchors. Main owns guest-house fresh spawn, station checkpoint/whiteout and historical migration. No provisional384×256/chunk size is assumed. Stable current map IDs are preserved, new exterior IDs append.

Please provide committed machine-readable old/new mappings for explicit outdoor cells/regions and stable landmarks, plus door/approach/arrival and guest-house/station checkpoint anchors. A saved native warpId cannot be blindly reused if its exterior list/owner changed: Main must resolve old destination through the published6ae533a registry. Cover saved current position, pending Continue warp, dynamicWarp, lastHealLocation and escapeWarp, while unchanged interior coordinates and every party/badge/preference byte retain authority. Stale map/object caches must reload safely. Same-position refresh retains facing; relocated arrivals use native direction rules.

## Integration cadence

Deliver small tested commits. Main verifies source/patch identity, builds/freeze-pairs exact ROM+ELF+metadata+geometry and owns the only integration PR/deployment. Independent encounter/bug-fix slices can ship on existing map geometry without waiting for the whole boulevard map. Historical source-profile guards are composed/rebound explicitly, never disabled to pass. Current state/dependencies are in status.json.

## Current implementation slice

The browser `capture-persistence.ts` module independently validates all14 native save sectors, exact native transaction counter, trainer identity and dedicated capture masks before a future durable ACK. Its boot-intent helpers force native Continue across interrupted encounters and reject unavailable or ambiguous storage. Eight tests cover rotated slots, counter wrap,70sector corruptions, identity/schema/mask mismatches, view bounds and stale asynchronous intents. This first commit is a tested persistence primitive; native packet orchestration and runtime wiring are still pending and no capture feature is published by it.
