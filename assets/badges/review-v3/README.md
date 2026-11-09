# Approved landmark badge set — v3

The user accepted the v2 set (“ok keep these”) and requested a theater edit.
The revised City Pass badge10 (stable gym index9, Taichung Theater) uses a gold
stage arch with parted red curtains and a blue stage opening. The previous
paired masks are replaced. The shared palette is unchanged. The other nine
icons, including the five v2 clarity revisions, are byte-identical to v2.

`theater-before-after.png` shows the focused revision with native-size16px/32px
samples. `badge-board.png` and the City Pass mockups contain the complete set.
The user approved the theater revision with “looks good” on 2026-11-09.
Together with the preceding “ok keep these” acceptance of v2's other badges,
this makes v3 the approved complete ten-icon artwork set for integration.
It has not been published or integrated here. The accepted v2 artwork remains
preserved in `../review-v2`. See `APPROVAL.md` for the final source handoff.

PNG/SVG icons, horizontal sheets,4bpp tile payloads and RGB555 palette keep the
contract documented in `../review-v1/README.md`. `badge-assets.json` preserves
stable IDs/completionBit0–9 with separate displayNumber1–10. The generator needs
v2's theater PNGs only for the before/after board. The validator checks all nine
retained icons and both palette exports against v2, plus dimensions, tile decode
roundtrips, shared palette and transparency. Mockup progress is illustrative;
no game code, saves, memory, award logic or publication is changed.
