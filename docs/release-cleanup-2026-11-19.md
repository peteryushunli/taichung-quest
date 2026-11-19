# Release cleanup and place stories — 19 November 2026

This release makes the first minutes quicker and adds optional reading at every
existing place. It keeps the released map, save version 12, ten gyms and the ten
landmark captures from PR 20.

## What changed

- **Quiet start.** On a new game's first settings screen, wild and trainer
  encounters start at Off. A preference the player already saved is kept.
- **中文.** The language row on that screen now says 中文 instead of 繁體中文.
- **Shorter opening.** Xiaoyu's downstairs greeting is four pages instead of nine,
  and the outdoor tips are eight pages instead of eleven. The greeting now
  welcomes the player to Taichung, and the gym tip names the nearest gym instead
  of counting them. The bike and minimap tips are unchanged. A new player reaches
  free play in about 39 presses instead of about 45–49.
- **Solid console buttons.** The on-screen buttons stay their normal colour while
  the cartridge loads instead of looking faded.
- **Place stories.** Every one of the 20 existing place signs offers optional
  reading in English and Traditional Chinese: About this place, then staff or
  local notes, then Back. Gym and capture entry points are unchanged. This is
  Story's tested current-map package (native `1855002b`).

## Release identity

| Item | Value |
| --- | --- |
| Native source | `97db59801925a688e49b8207763b795dce033c43` (over released `586b8a84`) |
| ROM SHA256 | `846ed055e30f9193e66a88b044266910c3be60e610784c48029238d51699682c` |
| ROM SHA1 | `0c5ce95c78c4cd805a317583be47ee0a08dd44ea` |
| Geometry | `48fe4ba5208d0a2b1285c1b6aa6f776377ef003d5501e5ae837ca45c6127e92a` (unchanged) |
| Save version | 12 (unchanged) |

`patches/taichung.patch` is exported from that native commit. The release-pair
verifier passes: clean committed native tree, exact ELF-to-ROM bytes, all four
bridges, 24 minimap source pins and a patch that recreates the committed tree.

## Checks

- Native source guards: a new release-cleanup layer pins the six edited inputs
  and replays Story's layer and every older guard in a view with only those
  inputs restored (see the native `docs/release-cleanup-source-guard.md`).
- Story's own source tests: 20 places, 150 pages per language, 4,620 routes,
  longest line 198 px of 208.
- 92 website tests.
- Browser play, fresh saves:
  - English new game to free play on the shorter opening.
  - Chinese new game to free play: Off defaults and 中文 on the settings screen,
    the four greeting pages, partner choice and all eight tips.
  - Old Station sign in Chinese (About pages, local stories) and, after switching
    language in game, in English (About pages, Back returns to walking).

Not covered: the other 19 place menus in play (covered by Story's source tests),
existing-save Continue on this build, and a physical phone.
