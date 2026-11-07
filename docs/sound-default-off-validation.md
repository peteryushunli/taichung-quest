# Sound starts off

New page sessions initialize muted, with the Sound off icon, visible name and pressed state matching. The frontend previously had no saved sound preference; this change does not add a preference key. A deliberate Sound on choice lasts for the current page session. Reload, import and cartridge restart create a new muted session.

Volume is set to zero before `loadGame` starts native output, then the current mute state is applied after loading. Startup only calls audio/context resume when sound was deliberately enabled. Resume applies the current volume before `resumeGame` can resume audio. Fullscreen and returning to the player do not alter mute.

The pinned [mGBA implementation](https://github.com/thenick775/mgba/blob/c0d196432c4437ff06827dccd1a785de2afab5b8/src/platform/wasm/main.c#L203) stores renderer volume before a core exists and uses it as the new core's default at load. This verifies the pre-load mute call is supported by the current runtime.

An independent export of the base frontend plus only this sound change passes all 28 existing unit tests, TypeScript and production build. The combined onboarding development checkout also passes 36 tests; those tests do not prove audible output. Actual client checks now pass fresh startup Off, screen-icon/options synchronization, deliberate On, pause/resume in both states, reload and ordinary Restart returning to Off. English and Chinese labels/ARIA and 44px targets pass at 320px and 390px with no horizontal overflow. No audible-output or physical-phone measurement is claimed.

The icon beside Game options shipped from parent `8032231` with the unchanged accepted CMP cartridge. Vercel production `dpl_2URKnxndKWxdJVFvJUTcbjm1RrAM` is live at https://taichung-quest.vercel.app. Exact production HTML/JavaScript/CSS match the tested artifact. Evidence: `artifacts/browser-game-runtime/sound-icon-client-8032231/sound-qa-report.json` and `artifacts/sound-icon/vercel-production.json`. The legacy GPT Site was not updated.
