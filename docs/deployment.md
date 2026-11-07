# Private playable preview

URL: https://taichung-quest-hackday.helpfulwren.chatgpt.site

The existing owner-private Site published successfully on 7 November 2026.
Its audience was preserved; the public GitHub repository is a separate source
publication and excludes generated ROMs, saves, tools and in-progress drafts.

- Site version: 2 (accepted phone controls).
- Published source: `1809d204fcb6f9c2e444166c18785af379de3dd1`.
- Native source: `54fe5af0a30445fddb587dca6532881acc83d18b`.
- ROM SHA-1: `ae0ada352b1cd0b0d281c09fdde42a95446c9b4f`.
- Static build includes the matching ROM metadata, same-origin emulator assets,
  runtime/font license notices and declared COOP/COEP response headers.

The Sites deployment returned `succeeded`. Both available browser sessions
reached the expected private ChatGPT sign-in gate, but neither was signed in.
Hosted emulator boot, isolation headers and persistence after that gate remain
unverified until the owner signs in. No access widening or authentication bypass
was used. The exact build's native game, browser bridge, guide and save/recovery
behavior passed the local checks in [playable-build-validation.md](playable-build-validation.md).

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

Version 2 deployment `appgdep_6aeeba9c811c8191ab74ed0b087f90ca` returned
`succeeded` at 13:44 Taipei time on 7 November 2026. The live page still
requires normal ChatGPT sign-in; the available browser reached an empty login
form. An unauthenticated request for the deployed Wasm returned HTTP 401 HTML,
so deployed application COOP/COEP, Wasm MIME, worker startup and persistence
remain unverified behind that gate. The gate response is not an application
header check. Access remains owner-only, revision 1.

Version 1 used source `e5df62512c23ff2447198796ccdbaee96fcae700` and the same
cartridge bytes. The controls update retains the existing HTTPS origin.

Native save export/import is the transfer path when changing hosting origins;
browser-local snapshots and saves do not automatically follow a new domain.
