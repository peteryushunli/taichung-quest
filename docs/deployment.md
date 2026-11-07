# Private playable preview

URL: https://taichung-quest-hackday.helpfulwren.chatgpt.site

The existing owner-private Site published successfully on 7 November 2026.
Its audience was preserved; the public GitHub repository is a separate source
publication and excludes generated ROMs, saves, tools and in-progress drafts.

- Site version: 5 (Pokémon/Taichung introduction and portrait Game Boy view).
- Published source: `2d43fb203ac60b2d68c9c9e0e370b63f3e5b03dd`.
- Native source: `54fe5af0a30445fddb587dca6532881acc83d18b`.
- ROM SHA-1: `ae0ada352b1cd0b0d281c09fdde42a95446c9b4f`.
- Worker build includes the matching ROM metadata, same-origin emulator assets,
  runtime/font license notices and explicit COOP/COEP response headers.

Version 4 integrated the functional introduction/immersive view from `5c1bc72`
at source `f91c6fb4c5975b5ab2ec4d82249adabb9c8ccb70`. Version 5 adds the
CSS-only Game Boy casing from `a32b228`. Play immediately fills the viewport
and requests native fullscreen, with a CSS fallback; options, City Map and
Back/Return retain the same live canvas. Startup failures appear beside Play.
The phone layout follows the user's later portrait-only direction.

Version 5 deployment `appgdep_6aeec224b2a481919b2aead96c5c2b0f` succeeded at
14:16 Taipei time on 7 November 2026. Main verified the deployed JS/CSS hashes
against the built files and checked isolation headers again. The combined
source passed TypeScript, production build, 13 unit tests and 39 complete
Worker asset-response checks. Interface's expanded browser fixture passed
13/13 cases. Main also checked the integrated 390×844 view, options,
Back/Return and CSS fallback in the local browser. See
[immersive-player-validation.md](immersive-player-validation.md) and
[gameboy-casing-review.md](gameboy-casing-review.md). Physical-phone coverage of
these new view changes remains separate from the confirmed version-3 startup.

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

## Landmark introduction, version 6

The same owner-private Site now includes four landmark-art postcards above the player, from Interface checkpoint `5240040`. Source `79579962094719faca7b1edeeb49a6ceda5889d4` adds PNG MIME support to the explicit-header Worker. Deployment `appgdep_6aeec4e0d32c8191aa7d810089b80c64` succeeded at 14:27 Taipei on 7 November 2026. The published native cartridge remains `ae0ada35`; native Team/Station/opening integration is separate and not yet published.

Validation: 13 tests, TypeScript, production build, 51 complete asset-response checks, and actual local Worker rendering of all four images. Interface verified 1280px/390px/320px layouts and Play/Back; no new physical-phone claim. Proof: `artifacts/qa-landmark-intro-v6.jpg`.

## Frozen submission, version 9

Deployment `appgdep_6aeec9213cf48191bc625e4ad1f07b8a` succeeded at14:46 Taipei from source `e6dbee134ffe375ebc41be8010a66bbc8664cc6f`, retaining the same owner-private Site. Native cartridge is now `ea482a326672ac9fec2595e235ab669f9db0dd10`, source `21c08cbda8e1787b4504eb3a1131d628fc77222f`. All 51 Worker asset checks pass; authorized live reads verify exact full ROM/Wasm hashes and isolation headers. See [submission-release.md](submission-release.md) for playable scope and precise native acceptance.
