# Fresh-runtime Restart and save import

Validated in a dedicated Chrome tab on `http://127.0.0.1:5174`, using the isolated `feature/web-guide` checkout and a read-only copy of the native 8d0b2a3 cartridge. Parent preview/deployment tabs were not used.

## Changes

- Async HTML confirmation replaces blocking JavaScript confirmation for Restart and import.
- The old runtime disables only its JavaScript scheduler, drains filesystem writes and navigates to a fresh Play gate. It does not reload/quit the running core or change any live boolean settings.
- The new runtime deletes only the current build's owned auto snapshot before loading stable SRAM. The one-time boot intent remains on a failed load and is consumed after success.
- Wrapper-owned snapshots retain their 20-second interval; the duplicate native timer is disabled before load.
- Import accepts the player's own 131088-byte mGBA backup, as well as raw 64/128 KiB saves and the corresponding 16-byte-trailer variants. Bytes are preserved.
- A failed/expired filesystem flush leaves the current page available for backup and restores the previous imported-save bytes where available.

## Actual checks

1. Native Chinese Save completed for WALKER, one male Charmander Lv5 with 19/19 HP, 0 badges, a mounted bicycle and a position between the houses and lab in the Greenway prototype.
2. Restart opened a keyboard-accessible dialog with Cancel initially focused. Confirm returned promptly to `?cartridge-boot=1` and a Play gate, without a renderer freeze.
3. Play loaded the title's actual CONTINUE entry: WALKER, time 0:04, Pokédex 1 and 0 badges. Continuing restored the same Chinese menu, bicycle/location and one Charmander Lv5, 19/19 HP. `artifacts/qa-safe-restart-party-after.jpg` records the restored party.
4. The player downloaded its own native save (`taichung-firered.sav`, 131088 bytes). The old importer rejected that size; the revised importer presented the expected async confirmation, then navigated promptly to `?cartridge-boot=import`.
5. Import's Play gate loaded the actual CONTINUE entry with the same WALKER / 0:04 / Pokédex 1 / 0 badges. Continuing restored the bicycle and saved location.
6. `npm run check` and `npm run build` passed. Source inspection confirms a single pre-load `setCoreSettings` call, no `quickReload`/`quitGame`, and a single per-runtime `loadGame` call.

No destructive cross-origin or user saves were used. Filesystem failure/timeout rollback was reviewed in source, not forced against the browser's actual IndexedDB. Vite HMR triggered an unresponsive development tab when source was edited live; the final import regression used a built preview without HMR. This is distinct from the verified responsive Restart/import flows.
