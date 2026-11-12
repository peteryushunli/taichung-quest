# Minimap and Xiaoyu intro — awaiting user approval

Local preview only. Do not publish/merge/deploy until the user approves the screenshots.
Base frontend: f92ee10 (latest main on2026-11-12). Native base59e51d9 retains
Claude’s guest house, gym interiors, map and current font.

## Candidate

- Minimap width48 instead of64 GBA-equivalent pixels:25% narrower, preserving
  aspect ratio and the same60×44-tile map coverage. Smooth SVG frame, red gym
  squares, yellow landmark circles, north label and player arrow. Background
  uses smooth sampling rather than nearest-neighbour pixel enlargement.
- Hidden during the early introduction/bike tip. Appears on native MAP phase6,
  using the actual position in the read-only onboarding packet while native
  dialogue intentionally hides navigation. Stays through the remaining tour,
  then hands over to live navigation. Uses a dot during the tour because the
  onboarding protocol has no facing field. Off preference still works.
- Two short native dialogue pages in English and Traditional Chinese:
  “See the minimap at top left? / Red squares are gyms.”
  “Yellow dots are landmarks. / Tap it to open the City Map.”
  “看左上角的小地圖！ / 紅色方塊是道館。”
  “黃色圓點是地標。 / 點小地圖可開城市地圖。”
- Appended only two missing glyphs(圓黃) through the pinned bitmap font pipeline;
  every prior codepoint and bitmap row is preserved.

## Source and evidence

Frontend branch/worktree: codex/minimap-intro-review,
`/Users/peter/devday_hackathon/.worktrees/minimap-intro-review`.
Native branch/worktree: codex/minimap-intro-text,
`/Users/peter/devday_hackathon/.worktrees/game-minimap-intro-review`.
Native preview commit: c952dec. No portable patch export, PR or Vercel deployment yet.
After approval, register the reviewed text/font changes with the existing native
source guards before exporting a production patch. Do not weaken those guards.

59 frontend tests and TypeScript pass;13 browser minimap checks pass, including
intro timing, Off preference, real-position projection and menu/paused hiding.
The native cartridge and frontend build. The glyph append dry-run reports0
remaining missing glyphs. Actual web-player screenshots cover English desktop
and Chinese mobile; both reveal during the map line, remain through the next tip,
and remain in exploration, with no page errors and width20% of the game viewport
(previously26.667%). These are explicit synthetic SRAM location/stage fixtures
imported through the ordinary player UI, then normal keyboard input; no emulator
snapshot or RAM position writes. Synthetic source version10 runs native cache
refresh so camera/avatar/map all agree at the guest-house door.

Evidence: `/Users/peter/devday_hackathon/artifacts/downloads/minimap-intro-review/`.
Screenshots: map-tip-1.png, legend-tip-1.png (English desktop), map-tip-2.png,
legend-tip-2.png (Chinese mobile), exploration-1.png and exploration-2.png.
Full player screens: full-player-1.png and full-player-2.png. Fixtures and exact
hashes: fixtures.json. Runtime results: preview-results.json.

Preview ROM SHA-256: `a7918845bb7bddc721b19d3759fde9ba2cbf8ce5cd4bf3d5985bc0667b2d3186`.
