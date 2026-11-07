# Native party and ten-badge integration contract

This handoff records Main's integration boundaries for the accepted no-grind
direction in `gameplay-session-brief.md`. The visible Gameplay chat
`01a1b488-ef6c-7b53-b614-f4299f6d5447` is the sole feature writer in
`.worktrees/game-world`; the former gameplay subagent stays frozen.

## Accepted behavior and current release

The accepted next slice preserves the four-starter entry, then offers free
native Team selection/replacement during exploration, useful preset moves and
an initial common level of 50. National Dex 001–150 excluding Mew and native
capacity six are revisable initial defaults. Accepted gym challenges restore
HP/status/PP and allow easy retries. Each genuine landmark victory awards its
own badge. Team changes preserve all earned progress and Save/Continue.

These are feature requirements, not claims about the published phone build.
The `ae0ada35` cartridge still starts at level 5, has one Station battle and
uses City Pass stamps. It does not yet offer Team selection or level-50 gyms.

## Single native writer and shared state

- Gameplay owns native team creation and replacement using the engine party
  structures/APIs. Keep one reusable operation behind native menus; browser
  code must not independently construct Pokémon or write party memory.
- Replacements commit only after selection is confirmed and valid, outside
  battles and transitions. Cancellation keeps the original party. Never leave
  a new player with zero usable party members. Preserve the chosen starter
  marker separately from whichever species is currently in slot one.
- Keep save variables `40F7`–`40FD` unchanged: save version, wild mode,
  trainer-sight mode, gym mask, language, starter species, legacy tea state.
  Menu IDs 65/66 remain starter/language. Submit any new allocation to Main
  with its first implementation commit; none is reserved by this document.
- `TAICHUNG_GYM_COMPLETION_VAR` is `0x40FA`; ten permanent bits use mask
  `0x03FF`. Native `TaichungGymGetCompletedMask`, `GetCompletedCount`,
  `IsComplete` and `GetLandmarkId` are the existing read interface.
- Preserve the only completion writer in `TaichungGymOnTrainerBattleEnd`:
  a prepared challenge must actually start against the expected trainer,
  then finish with `B_OUTCOME_WON`. Decline, loss, wrong trainer, duplicate
  callbacks and interrupted challenges must not create badges.
- Badge order is Station, Park, Miyahara, Science Museum, Greenway, Shen Ji,
  Fine Arts, Fengjia, Maple Garden, Theater. Stable string IDs come from
  `include/constants/taichung_gyms.h` and `src/taichung_gym_progress.c`.
  Do not repurpose vanilla eight-badge flags to hold this collection.

## Browser and content boundary

The existing version-1 language bridge is language-only. Do not extend its
32-byte packet or reuse its fields for party/progress. A future browser team
or badge feature needs a separate versioned protocol reviewed by Main and
Interface, with native validation, safe-state gating, request/acknowledgement
and read-only reported progress. The first native Team slice needs no web
protocol and should not wait for one.

Story supplies reviewed names, dialogue, teams and badge art; Gameplay maps
them onto stable native IDs. Mapping retains geometry, object placement and
doors. Main alone merges canonical native source, regenerates shared glyphs
when needed, builds the canonical ROM, exports the patch and publishes.

Deliver the first usable non-starter/evolved selection independently, then
the Station win/badge and loss/retry loop. Verify cancellation/replacement,
usable moves, controls, preserved mask/preferences/language and Save/Continue
before handing each commit to Main. Later gyms and artwork remain independent.
