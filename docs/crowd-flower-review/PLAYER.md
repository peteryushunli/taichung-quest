# Approved Crisp 2× player presentation

The reviewed Option B prototype sheets are packaged unchanged into a dedicated 2× atlas for walking, running and cycling, including the game’s eastward flips. All38 templates, source hashes, palette limits and the atlas reproduce byte-for-byte with `python3 scripts/hd-player.py --check`. The existing NPC4× atlas is separate.

The browser matches a fully visible native pose only within the verified player footprint. Its position, direction and cadence follow the native framebuffer. Faded, occluded, ambiguous, missing-asset or unsupported frames retain native pixels. The renderer restores foreground/background occlusion and uses no game or save writes. Indoor rooms without building overlays can still render the player. Local-only pose diagnostics support browser acceptance; the temporary proof harness is excluded from the review source.

All140 normal web tests and TypeScript pass. Fixtures cover every supported pose and direction, unsupported frames, transitions, occlusion, missing assets and mixed atlas scales. Interface observed the actual live indoor pose; remaining live walking/running/cycling and occlusion observations are recorded separately from those deterministic tests. This web-only presentation uses the same frozen native3dcbe774 cartridge.

A focused follow-up from Interface440844d5 retries a transient player-asset failure on the next HD start even when the render loop already exists; its regression test passes.
