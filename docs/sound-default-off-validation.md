# Sound starts off

New page sessions initialize muted, with the Sound off icon, visible name and pressed state matching. The frontend previously had no saved sound preference; this change does not add a preference key. A deliberate Sound on choice lasts for the current page session. Reload, import and cartridge restart create a new muted session.

Volume is set to zero before `loadGame` starts native output, then the current mute state is applied after loading. Startup only calls audio/context resume when sound was deliberately enabled. Resume applies the current volume before `resumeGame` can resume audio. Fullscreen and returning to the player do not alter mute.

The pinned [mGBA implementation](https://github.com/thenick775/mgba/blob/c0d196432c4437ff06827dccd1a785de2afab5b8/src/platform/wasm/main.c#L203) stores renderer volume before a core exists and uses it as the new core's default at load. This verifies the pre-load mute call is supported by the current runtime.

An independent export of the base frontend plus only this sound change passes all 28 existing unit tests, TypeScript and production build. The combined onboarding development checkout also passes 36 tests; those tests do not prove audible output. Actual emulator Sound on/off, pause/resume, reload and import/restart UI acceptance is pending Main's shared-browser lease. No physical-phone or live-release claim is made here.
