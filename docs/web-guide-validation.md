# Browser guide validation — 7 November 2026

Validated in the isolated `feature/web-guide` worktree after fast-forwarding to parent checkpoint `5787e9b`. The worktree installed its own dependencies with `npm ci`, copied the canonical game as a read-only input, and served its own Vite preview at `127.0.0.1:5174`. The integration preview at port 4173 was left untouched.

## Bounded changes

- Nonplayable landmarks are labeled **Guide preview / 導覽預覽**, rather than promising an approved future game district. The overview and cards explicitly leave the complete city layout and gym roster undecided. The five researched entries remain guide examples.
- The existing credits include a quiet link to the bundled Noto Sans TC SIL Open Font License.
- Corrected an observed Traditional Chinese guide-heading wrap at a 390 px viewport.

## Actual browser checks

Chrome loaded the source-modified FireRed ROM with SHA-1 `8d0b2a311d40e14cfff035df28f9506e4801f569` and reached the playable neighborhood after its native Chinese opening.

The City Map opened before starting the emulator. All five markers were selected in both interface languages. Each card showed both place names, a translated visitor description, its original illustration, and the expected official source link. Only the Greenway entry claimed a playable starting area. Other entries said they were not playable; every card disclosed that no gym had been assigned.

The interface language persisted after reload in both directions. Switching it during an existing game kept a single playing canvas and the current field scene. Source review confirms that localization updates text/attributes and button labels without replacing the canvas or instantiating another emulator. The interface selector remains independent of the cartridge's language.

Opening the guide paused a running game and released held controls. With the dialog open, Right and Z input did not reach the game: the actual player-region JPEG crop was byte-identical before opening and after closing. Escape closed the dialog, resumed the previously running game, and returned focus to the City Map opener. A game paused before opening the guide remained paused after closing it. Resuming after an interface language change returned to the existing field position.

Save spot reported success. Reloading and starting again restored the field checkpoint rather than repeating the native language/starter opening.

At a 390 × 844 Chrome viewport, the Chinese overview and a complete landmark card were readable by scrolling. The dialog had a 370 px client width and 370 px scroll width, with no horizontal overflow. The temporary viewport was reset, the agent's QA tab was closed, and its port-5174 server was stopped. Captured console errors were empty.

## Build and evidence

`npm run build` passed TypeScript checking and the production build after the final changes. `git diff --check` passed. ROMs, dependencies, emulator distributions, and screenshots remain ignored generated files.

Local screenshots are stored under the ignored root `artifacts/` directory:

- `qa-guide-en.jpg`
- `qa-guide-zh.jpg`
- `qa-guide-mobile-zh.jpg`
- `qa-guide-mobile-card-zh.jpg`
- `qa-guide-game-resumed.jpg`
- `qa-guide-preserved-pause.jpg`

This slice tested Chrome and a phone-size Chrome viewport. It did not test physical iOS/Android touch behavior, other browser engines, or production hosting headers. Native Save/Continue and native translation coverage belong to the separate game-localization checks; this slice verified browser snapshots and companion-guide behavior.
