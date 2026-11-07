# Private playable preview

URL: https://taichung-quest-hackday.helpfulwren.chatgpt.site

The existing owner-private Site published successfully on 7 November 2026.
Its audience was preserved; the public GitHub repository is a separate source
publication and excludes generated ROMs, saves, tools and in-progress drafts.

- Site version: 3 (hosted emulator startup fix).
- Published source: `701adb53f5c98c813f4e71ae8e434ae813053147`.
- Native source: `54fe5af0a30445fddb587dca6532881acc83d18b`.
- ROM SHA-1: `ae0ada352b1cd0b0d281c09fdde42a95446c9b4f`.
- Static build includes the matching ROM metadata, same-origin emulator assets,
  runtime/font license notices and declared COOP/COEP response headers.

The owner confirmed on iPhone Chrome after refreshing version 3: **“Yes, the
game starts.”** Hosted startup now has physical-phone user confirmation.
Main's browser remains at the normal private sign-in gate. Hosted persistence
and sustained fullscreen still need separate checks. The exact build's native
game, browser bridge, guide and save/recovery behavior passed the local checks
in [playable-build-validation.md](playable-build-validation.md).

The accepted controls through feature commit `89ff269` are integrated:
arrows move, F confirms/interacts, D goes back, and M/Enter opens Menu.
The portrait touch layout has semantic Interact/Confirm and Back actions,
with separate Menu and City Map controls. The isolated integrated checkout
passed all 13 tests, TypeScript and the production build. Its Vercel preparation
manifest records clean source and fingerprints all 15 output files. Vercel
configuration is prepared; this release uses the existing private Site, with
no new hosting account or Vercel deployment.

Main booted the exact integrated production output locally and restored the
existing Chinese City Pass save at 390×844. The accepted interface's broader
desktop, pointer, save/import and viewport checks are recorded in
[interface-controls-validation.md](interface-controls-validation.md).
Physical-phone and sustained-fullscreen checks remain open.

Version 2 deployment succeeded but its static dispatch did not apply the
copied `_headers` file. Authenticated application responses lacked COOP/COEP,
which blocked the threaded emulator. Version 3 switches the same private Site
to explicit Worker responses; see [sites-worker-hosting.md](sites-worker-hosting.md).
Deployment `appgdep_6aeebd10cd3481918398f244143320bc` succeeded at 13:54 Taipei
time on 7 November 2026. All 39 local complete-asset response checks passed,
and the generated Worker booted the native game in the local browser.

After automatic approval review blocked service-token diagnostics, the user
explicitly authorized **“Allow read-only service-token checks.”** Main then
verified live HTML, loader, emulator JavaScript, Wasm and metadata return 200
with COOP `same-origin`, COEP `require-corp` and CORP `same-origin`. The full
gzip ROM and Wasm downloads match the frozen release hashes; Wasm is served as
`application/wasm`. The token stayed in memory/hidden stdin, only reached this
Site, and redirects were disabled. No access policy changed: owner-only,
revision 1. Service HTTP checks are distinct from browser sign-in or phone QA.

Version 1 used source `e5df62512c23ff2447198796ccdbaee96fcae700`; version 2 used
`1809d204fcb6f9c2e444166c18785af379de3dd1`. All three use the same cartridge
bytes and retain the existing HTTPS origin.

Native save export/import is the transfer path when changing hosting origins;
browser-local snapshots and saves do not automatically follow a new domain.
