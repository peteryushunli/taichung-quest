# Copy, temple entrance and bike review checkpoint

The landing map and City Map now say “Explore Taichung’s real neighborhoods and landmarks.” / “探索臺中的真實街區與地標。”. Both normal entry points passed local Chrome checks in both languages. All 134 web tests and TypeScript pass.

The temple entrance now uses its painted doorway one tile north of the former wooden placeholders. The two central stair cells are open; outer rails and walls remain solid. Only four resolved native cells change, with visible changes confined to the two restored stair tiles. Both walking and biking enter and return correctly from each lane. No newly blocked cells were added and all 95 previous Continue targets remain safe.

The dedicated city bike now uses the existing four-Step4 row. Actual native controller timing over 32 tiles is 128 frames versus 96 before: exactly 75% of the former speed. Walking, running, collision, dismount/door/return/remount checks are recorded in the native receipt.

Native source da308778406fd03762ce000cdd59848f298f8700 produces cartridge d05cdd78e0a615f9354021d14b359e5a00053f44a54cde9ee6a9fbda14257cc3. The exact patch, source tree and ELF are independently qualified. Fresh 76-map HD references differ only at the two former wooden tiles. All approved HD pictures are byte-identical, and all nine tower masks were recomputed and match the verified baseline. The approved city overview changes only 72 pixels in the two stair cells. The map metadata and radar export are paired to this cartridge.

This is a protected preview checkpoint on draft PR 25. The later outdoor NPC and flower-animation work is separate. Production has not been changed.
