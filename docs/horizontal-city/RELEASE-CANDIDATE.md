# Horizontal Taichung release candidate

The candidate places the twenty existing landmarks on a 352×216 city with Taiwan
Boulevard running horizontally from Tunghai on the left toward Old Station on
the right. The browser guide, radar, roads and place pins use the same native
geometry export. The four authorized new stops remain reserved plots without
finished facades or interactions and stay out of the playable guide.

Ten existing landmark signs/hosts now offer one rare-Pokémon encounter per save.
Prepare and Later leave the attempt available; Begin persists consumption before
the battle. Up to three temporary Great Balls do not debit the normal bag. A
successful catch unlocks that species for later TEAM selection rather than
silently adding it to the party. Scyther has False Swipe.

Save version13 migrates old outdoor positions to the nearest corresponding public
landmark arrival, retaining indoor positions and existing parties, preferences,
badges, inventory and capture state. Continue filters obsolete city recaps before
loading their old map, and automatic encounter saves refresh the current map
cache before writing SRAM. Browser durability acknowledgements bind the entire
14-sector transaction to the native counter, trainer and capture masks; pending
encounters force native Continue after refresh instead of a prior battle snapshot.

## Frozen source and cartridge

- Native product checkpoint: `6f11e184d01d600d1c8e8a946de40039b1f7aedf`.
- Guard-qualified native source: `465162b3` (guard/test/docs only; same ROM bytes).
- Cartridge SHA256: `e9b2a6f9ba32bc2fbf10cadf63307b3cd6c29b7fa762ec4e96574b7d1c64d79f`.
- Geometry fingerprint: `61734270b5b95656fff77fea5feb864c401c247fe658040c841d670a3ddc3e37`.
- Raw native/browser export SHA256: `e85324df545afae24bf3cec44c61789fc216b41e06e2ab8d7402db993660abe3`.

The independent release verifier passes ROM versus ELF objcopy, exact bridge ABI,
all92 committed native geometry inputs and portable-patch tree reconstruction.
An independent compiled-ROM proof checks all78841 exterior/interior map cells,
54 warps,34 connections,24 sign references and24 private tileset banks against
source. The browser art proof compares all76032 exterior cells and2020 retained
facade cells without pixel differences. These source/byte checks do not replace
runtime acceptance.

## Acceptance checkpoint

- 103 frontend tests, TypeScript and production asset build pass.
- 29 release-pair tests pass, including real horizontal contract cases and legacy compatibility.
- Current native v13 migration, city gates, bindings, field adapter, encounter state
  and bridge host checks pass. Historical source guards and probes remain intact.
- Genuine v12 native Save1 loads at the relocated residence. Ordinary bike travel
  crosses Old City→Greenway→Nantun and the relocated Wenchang door.
- Without a manual save after travel, Begin produces automatic native Save2 and
  browser durable ACK before battle. Refresh boots native Continue, restores the
  correctly rendered temple, and the host refuses another attempt. The downloaded
  full SRAM transaction preserves inventory, badges, identity, HP, moves and PP;
  the only party changes are the expected walking friendship gains.
- A separate genuine trial exhausts all three Great Balls. Native RESULT Save4 and
  its independent ACK complete; the species stays locked and snapshot protection
  clears. Battle HP/PP/faint changes remain native-owned.
- With wild encounters Off, a genuine Gyarados Lv70 capture completes RESULT
  Save5 + ACK, persisting its unlock. Four Seismic Tosses and Thunder Wave were
  ordinary native battle actions; the second temporary ball caught it. Full SRAM
  comparison confirms five normal Poké Balls remain and no party/PC grant occurs.
  Ordinary refresh and a fresh cartridge Restart→native Continue preserve unlock2.
  TEAM then permits #130, and an explicit confirmation adds Gyarados as slot4.
- The city guide and game options were visually checked at390px width in desktop
  Chrome emulation. This is not physical-iPhone acceptance.

Still required before production: remaining native door/seam travel, fresh
bilingual onboarding, whiteout and a
representative gym battle; production-client smoke and remote preview asset checks.
The existing hero reel and bike screenshot depict the previously released city.
No production publication is claimed by this checkpoint.
