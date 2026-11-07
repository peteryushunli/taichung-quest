# Private playable preview

URL: https://taichung-quest-hackday.helpfulwren.chatgpt.site

The existing owner-private Site published successfully on 7 November 2026.
Its audience was preserved; the public GitHub repository is a separate source
publication and excludes generated ROMs, saves, tools and in-progress drafts.

- Site version: 1.
- Published source: `e5df62512c23ff2447198796ccdbaee96fcae700`.
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

The preview uses the tested baseline interface. New F/D controls and mobile
layout are checkpointed separately for the Interface and controls chat to
finish and validate. That chat also owns Vercel readiness. No Vercel account,
project or production deployment has been created by this release.

Native save export/import is the transfer path when changing hosting origins;
browser-local snapshots and saves do not automatically follow a new domain.
