# Shared native release batch

Shared PR: https://github.com/peteryushunli/taichung-quest/pull/2. Integration branch: `integration/native-release-batch`. Main is the only writer to this branch and PR head, canonical native `integration/taichung`, and the exported portable patch. Other sessions retain their own branches/worktrees and submit small commits. No concurrent force-checkouts, resets or shared-head pushes.

## Current increment: Miyahara

Native source `0666de3bcb9fb14d6d9114b96373afc685548cc5` adds the voluntary Peiqi battle and badge at Miyahara. Prior Station/Park badges are preserved. All 476 existing Chinese glyph codes/rows remain exact; 30 Fusion glyphs append. Save version 6, onboarding, signs and maps are unchanged. The City Map now identifies this implemented battle as playable.

Frozen ROM SHA-256: `9a20d414b2ac9f824f49bb3c43983284af6b36ade16b3af832a694b59c8d7f3b`. Existing isolated win/loss/retry/repeat acceptance and combined host/static checks pass. Gameplay owns the remaining bounded current-v6 Continue, normal approach, offer/decline and Save preservation smoke. No full battle-matrix repetition is required. This increment is not published until its combined gate passes.

## Ownership and parallel work

| Area | Owner and boundary |
| --- | --- |
| Integration, patch export, PR head, publication | Main; this checkout only for root integration |
| Miyahara combined runtime acceptance | Gameplay; exclusive browser lease until released |
| Final facade runtime acceptance | Maps; next serialized browser lease, no duplicate implementation |
| Active facade/street feature edits | Claude `maps-landmark-dev-feda2d`; immutable Xitun v7 commits `704e4f2`/`22059d6` are reviewed inputs; newer street/v8 work excluded |
| Landing page | Claude `taichung-quest-landing-8c9d2e`, separate existing PR #1; do not take over its head |
| Build-order and partner/font fixes | Existing Claude feature worktrees; collect only reviewed commits with explicit scope, never their working files |

The reviewed Codex facade candidate `9a001118` and Claude `22059d6` differ only in a checker comment and the immutable source-commit pin; functional source/geometry is identical. Use the Claude committed slice as the feature input, retaining both evidence sets. The final facade/save-v7 increment is prepared separately and will be accepted/published when ready; it does not delay Miyahara. Deeper city work remains nonurgent.

Before importing any contribution, re-read both repositories' worktree status and confirm path ownership. Preserve originals and unrelated dirty documents. Native commits integrate first; Main then exports the patch once into this root integration checkout. See [the current-state handoff](current-state-handoff.md) and [the Vercel release workflow](vercel-readiness.md).
