# Portrait Game Boy casing

Requested directly by the user: make the fullscreen background look like a Game Boy. This CSS-only follow-up adds a shaded plastic shell, molded edge/seam, dark rounded bezel with colored trim, a small wordmark and decorative speaker slots. No raster assets or extra network dependencies were added.

The accepted portrait control arrangement and target sizes remain. Decorative details are hidden from assistive technology, ignore pointer input, and disappear on shorter portrait viewports to avoid covering controls. The game still renders at its original aspect ratio. No dedicated landscape layout is added.

Validation: TypeScript/production build passed. Desktop in-app browser checks at 390×844 and 320×568 showed no horizontal overflow, all controls within the viewport, 48px directions/system controls and 58px primary actions. At 390px, the controls ended at y=688.5 and decorative details started at y=763; they do not overlap. Options and queued English/Chinese language selection still worked. All JavaScript behavior is unchanged from the separately tested `5c1bc72` functional commit.

Ignored local review image: `artifacts/interface-qa/gameboy-portrait.jpg`. This styling has not yet been tested on a physical phone. Main owns integration and publication using the verified Worker hosting path.
