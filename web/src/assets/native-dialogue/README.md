# Native dialogue advance arrow

`down-arrows.png` is an unchanged copy of `graphics/fonts/down_arrows.png` at native source `6366b9e5c037647ce4d2a007efa3d3dfbedcdb48`. SHA-256 `f88fc23b44ef97753ddeed01546a7245789a47fbe5da8d22b851d90b9720bdeb`. The existing 128×16 indexed PNG holds eight 16×16 frames; CSS displays only the original four red-arrow frames without image editing or recolouring.

The source PNG has an opaque white palette-zero background. CSS multiply compositing lets those white pixels preserve the existing message-box background; the original arrow colours remain unchanged over the white native interior. No replacement transparency PNG is generated.

The draft shows the real native message box and bitmap text already rendered by the cartridge. It does not redraw them or generate replacement art. The transparent HTML hit region and this native arrow retain browser A/tap acknowledgement while removing the duplicate visible web card.
