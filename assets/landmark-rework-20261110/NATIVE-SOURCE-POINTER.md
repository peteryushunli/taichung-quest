# Expanded native landmark source — read-only pointer

Use `/Users/peter/devday_hackathon/.claude/worktrees/gym-gameboy-website-updates-9d8798/.worktrees/game-gym-text` at clean native `2362263510dfa38987c36b6cc40dca8d9372fc3c`. Its20-entry registry is `data/taichung/city-rework/masterplan.json` → `landmarks`; entries11–20 are the ten visit-art targets. `newLandmarks` contains the eight additional set-piece rectangles. Full paths/hashes and coordinate cautions are in `native-source-pointer.json`.

Matching website/build: `/Users/peter/devday_hackathon/.claude/worktrees/gym-gameboy-website-updates-9d8798` at757e90c. Its build.json binds native2362263 and the actual ROM SHA-256 is verified as `5c3e041d7ee8dacc126eb600098c8e63f7498dd73bd712aa4bb504c04c0ee1bb`. The website catalog still has12 entries, so it does not describe all20 native landmarks. The maps-landmark-dev website currently binds olderd47712a.

Read actual installed layouts/banks and these implementations for footprint/palette/clear-mask auditing:
- `tools/taichung/rework/landmark_redraw.py`: Botanical, Confucius, Yizhong, Prefectural Hall, Second Market.
- `tools/taichung/rework/build_rework.py`: placement/clearance/install and signs.
- `tools/taichung/nantun/landmark_art.py`: Heritage, Fengle, Wenxin art.
- `tools/taichung/nantun/rework_layout.py` and `data/taichung/nantun/skeleton-plan.json`: Nantun layout/temple context.

Some masterplan status prose predates installed art. Use current code and bytes rather than interpreting that prose as a current readiness claim. Native source, maps, PRs and deployment were not changed.

## Measured footprints

Use `temples/native-footprint-audit.json` and `.md` for exact native origins, preserved door/approach cells, collision/clear masks, layers and tile-bank counts. Entries13–20 are outdoor scenes with no native door or warp. The native contract frame differs from the frontend minimap by +5,+5; the measured audit documents this transform. It verifies checkout/build binding, not deployment state.

Photo update from Maps: official TCHAC facade photos for Wanhe and Wenchang were successfully downloaded and inspected, superseding the earlier empty MOI endpoint report. The official Confucius photo was also inspected.

## Presentation crops are separate

Website `sights.json` artRect includes surrounding context and is not replacement geometry. Botanical is registered13×7 cells, Confucius10×9, Wenxin12×7 and Fengle11×9, even where website crops are larger. Keep registered cells and their masks separate from crop context. Exact coordinate pairs are recorded in `native-source-pointer.json`; Maps is adding crop masks to its footprint audit. Do not expand or move native map art from presentation-crop dimensions.
