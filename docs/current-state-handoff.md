# Taichung Quest — current state and concurrent work

Production: https://taichung-quest.vercel.app. [Fengjia/Maple and save7 are published](facade-release.md), retaining three battles, the bilingual opening, Chinese font, signs and sound toggle. PR #2 is merged. Published native source is `a72bd0e`, frontend `057656d`; use the exact frozen ROM/metadata pair. The shortened opening/compact tutorial is an isolated review candidate and must not be integrated or published without explicit user approval.

## Source and release inputs

The root Git repository owns the web client, scripts, documentation and `patches/taichung.patch`. `vendor/pokefirered` is a separate ignored Git repository; committing the root does not include native edits. Integrate reviewed native commits there first, then have one integrator run `bash scripts/export-game-patch.sh` and commit the resulting portable patch in the root repository. Do not export from a feature checkout over another integrator's patch.

ROMs and `build.json` are ignored generated artifacts. Keep their exact matching pair together, and preserve the source commit, SHA-256 and test evidence. The ELF supplies bridge addresses; do not copy metadata from an older cartridge. Use `TAICHUNG_GAME_SOURCE` and `TAICHUNG_ROM_DIRECTORY` for isolated builds via the root `scripts/build-game.sh`.

Normal client checks are `npm test --prefix web` and `npm run check --prefix web`. `node scripts/prepare-vercel.mjs` validates the selected cartridge pair and builds the deployable artifact. Use a clean release checkout and the explicit Vercel preview target before promotion; see [the release workflow](vercel-readiness.md). Never publish through the old GPT Site.

The portable patch supports source reconstruction from the pinned upstream baseline. Historical native guard attestations also require the retained local native Git history/evidence; an upstream-only fresh clone lacks those historical commits. Do not interpret missing historical objects as a gameplay regression or silently weaken the guards.

## Shared PR workflow for the next coherent batch

After this release checkpoint, create or use one shared PR for the next coherent batch. Each Codex or Claude session keeps its own branch and worktree and makes small reviewable commits. One named integrator collects those commits onto one shared PR integration branch, resolves conflicts, runs combined checks and alone pushes that PR head. Several worktrees must not concurrently edit or force-checkout the same branch. Update the PR description to describe the final integrated behavior and evidence.

Before assigning overlapping work, inspect both repositories with `git worktree list --porcelain`, confirm the active owner, and inspect that worktree's status. A registered branch name is not proof that its editor has stopped. Do not reset, clean, delete or overwrite another session's files. Preserve unrelated dirty shared documents and untracked art/content; stage only reviewed paths.

Current Codex ownership is Main for canonical native integration, portable patch export and publication; Interface for the onboarding client and serialized browser acceptance; Gameplay for accepted Miyahara evidence; Maps for its frozen facade/map evidence. Runtime browser use is serialized, and Maps' preserved IAB12/8788 save must remain untouched.

Registered Claude root worktrees include `elastic-jackson-e60670`, `fervent-lehmann-04507c`, `maps-landmark-dev-feda2d` and `taichung-quest-landing-8c9d2e` under `.claude/worktrees/`. Their native subworktrees include build ordering, partner repaint/palette, Chinese punctuation, Xitun-v7 and Miyahara-streets-v8 branches. Coordinate active ownership before taking those topics; registration alone does not establish completion or acceptance.

## Preserved earlier checkpoints

- Miyahara combined native candidate `0666de3` is isolated in `.worktrees/game-miyahara-combined`, with frozen ROM SHA-256 `9a20d414b2ac9f824f49bb3c43983284af6b36ade16b3af832a694b59c8d7f3b`. Original bounded battle acceptance and combined host/static checks pass; current-version combined native smoke and publication remain pending.
- Final Fengjia/Maple facade source `bedf9595` and checker child `9a001118` are isolated in `.worktrees/game-facades-integration`. Exact save-v7 migration and static/host checks pass. No combined ROM/runtime acceptance or publication is claimed. Claude has overlapping Xitun work, so confirm one owner before further implementation.
- The deferred city-v3 proposal and Old City street change are separate. Nantun/Wanhe Temple is the next expansion preference, Yizhong second, Tiger City deferred. A proposal is not a shipped feature.

See [release history](next-build-integration.md), [opening validation](onboarding-web-validation.md) and [Chinese web typography](web-traditional-chinese-typography.md). Broader shared design documents may contain proposals or historical checkpoints; the exact release receipt determines what is live.

The earlier candidate descriptions above are historical; [the published facade receipt](facade-release.md) supersedes their pending flags. Current map scope is Xitun and already-created asset placement only; other geography/research is paused.
