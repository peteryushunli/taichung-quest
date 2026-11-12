# Smaller minimap and Xiaoyu guide

The user approved the English desktop and Chinese mobile screenshots on2026-11-12
and requested Vercel publication. This release retains mainf92ee10, including
Claude’s expanded city, guest house, gym interiors, settings and current font.

## Player-visible changes

The minimap is25% narrower:48×36 instead of64×48 GBA-equivalent pixels. Map
coverage and proportions stay the same. The frame and symbols use smooth vector
edges; terrain uses smooth sampling. Gyms are red squares and landmarks yellow dots.

During a new-game outdoor introduction it stays hidden through Xiaoyu’s early
and bike tips, appears when she mentions the minimap, remains through her later
tips, and continues following the player once exploration resumes. The saved Off
preference is respected. Other menus, battles, interiors and pauses retain their
normal hiding behavior. Tutorial position comes from the actual read-only native
onboarding packet, rather than invented navigation data; its dot turns into the
normal facing arrow when live navigation resumes.

English: “See the minimap at top left? / Red squares are gyms.” Then “Yellow dots
are landmarks. / Tap it to open the City Map.” Traditional Chinese has the same
two short pages. Only two missing bitmap glyphs(圓黃) are appended; all prior
codepoints and bitmap rows remain intact.

## Validation and provenance

Native source: `250ba92128fea49c1f3a19da4f6d8df6a23fcdf6`.
Cartridge SHA-256: `a7918845bb7bddc721b19d3759fde9ba2cbf8ce5cd4bf3d5985bc0667b2d3186`.
Geometry fingerprint stays `48fe4ba5208d0a2b1285c1b6aa6f776377ef003d5501e5ae837ca45c6127e92a`.
Save version remains12; no map, room, collision, party or progression data changes.

59 frontend tests, TypeScript,13 browser minimap checks, native onboarding host
tests and7 font tests pass. Native and frontend builds pass. The source layer
pins the new dialogue/glyph files and rejects12 mutation probes, including
mutated dialogue, glyph table and glyph mapping. Guest-house11 and approved-art13
probes also pass. The older guest-house text pin checks the exact9cb6855 bytes
beneath the registered newer layer; no bypass or relaxed hash matching is added.
Live geometry and the minimap export round-trip pass.

The portable patch is replayed against pinned upstream and compared to the native
commit, permitting palette line-ending normalization only. All three portable
source guards pass from the replay without private native Git history.

The approved runtime screenshots use explicitly synthetic SRAM location/stage
fixtures imported through the normal player UI, followed by normal native input.
English desktop and Chinese mobile both show the minimap at the map line, through
the next tips and afterward, at20% of the game viewport width(previously26.667%).
No page errors occur. Local evidence: `artifacts/downloads/minimap-intro-review/`
and this worktree’s `artifacts/minimap-review/`.

## Publication

The production receipt will be appended after the preview and public URL checks.
