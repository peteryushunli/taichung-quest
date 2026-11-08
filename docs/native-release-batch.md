# Shared native release batch

Shared PR: https://github.com/peteryushunli/taichung-quest/pull/2. Integration branch: `integration/native-release-batch`. Main is the only writer to this branch and PR head, canonical native `integration/taichung`, and the exported portable patch. Other sessions retain their own branches/worktrees and submit small commits. No concurrent force-checkouts, resets or shared-head pushes.

## Accepted increment: Miyahara

Native source `0666de3bcb9fb14d6d9114b96373afc685548cc5` adds the voluntary Peiqi battle and badge at Miyahara. Prior Station/Park badges are preserved. All 476 existing Chinese glyph codes/rows remain exact; 30 Fusion glyphs append. Save version 6, onboarding, signs and maps are unchanged. The City Map now identifies this implemented battle as playable.

Frozen ROM SHA-256: `9a20d414b2ac9f824f49bb3c43983284af6b36ade16b3af832a694b59c8d7f3b`. Existing isolated win/loss/retry/repeat acceptance and combined host/static checks pass. The bounded current-v6 Continue, normal approach, offer/decline and native Save comparison also pass. All 600 party bytes, HP/PP, decoded inventory/currency, badges, settings, identity and checkpoint are preserved; only two ordinary walking counters advance by the observed 80 steps. Output save SHA-256: `ae568a9f0f227cd803656f2de25ee47c992cb916d74fa8979d78d50ee6ba366c`. Vercel production `dpl_6TbLb9rcu5WvnC9m2bMf2m8CubHr` is Ready; the frozen published frontend is `6109829`. This release did not wait for the facade increment.

## Ownership and parallel work

| Area | Owner and boundary |
| --- | --- |
| Integration, patch export, PR head, publication | Main; this checkout only for root integration |
| Miyahara combined runtime acceptance | Gameplay; passed and browser lease released |
| Final facade runtime acceptance | Maps; active exclusive lease, combined smoke only, no duplicate implementation |
| Active facade/street feature edits | Claude `maps-landmark-dev-feda2d`; immutable Xitun v7 commits `704e4f2`/`22059d6` are reviewed inputs; newer street/v8 work excluded |
| Landing page | Claude `taichung-quest-landing-8c9d2e`, separate existing PR #1; do not take over its head |
| Build-order and partner/font fixes | Existing Claude feature worktrees; collect only reviewed commits with explicit scope, never their working files |

The reviewed Codex facade candidate `9a001118` and Claude `22059d6` differ only in a checker comment and the immutable source-commit pin; functional source/geometry is identical. Use the Claude committed slice as the feature input, retaining both evidence sets. The subsequent combined facade/save-v7 source is `a72bd0ea92d3ce41c0b67b1b470066a3b0cfe2d0`, frozen ROM SHA-256 `c9e3bf3819c2f38446f3501680669d8a2affe33e3ff1dd133cf0ddca9312014e`. All 13 host/static groups and its build pass; Maps owns the remaining combined client/runtime smoke. Existing independently verified facade doors/seams/collisions and both v6→v7 migration cases are reused for identical source, with their provenance limits retained. This candidate is not yet published. Deeper city work remains nonurgent.

Before importing any contribution, re-read both repositories' worktree status and confirm path ownership. Preserve originals and unrelated dirty documents. Native commits integrate first; Main then exports the patch once into this root integration checkout. See [the current-state handoff](current-state-handoff.md) and [the Vercel release workflow](vercel-readiness.md).

## Batch completed

PR #2 merged as `4486220`; the final facade/save7 increment is published and fully public-hash verified. See [the exact receipt](facade-release.md). The earlier pending statements are historical. No shortened opening/tutorial revision is included; user screenshot approval is required for that isolated follow-up.
