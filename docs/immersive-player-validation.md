# Portrait introduction and immersive Play

User requests: clearly introduce Pokémon + Taichung; make Play enter fullscreen with a reliable phone fallback; keep accepted thumb-control positions; show startup failures prominently. The later direct instruction **“don't build the landscape”** supersedes the earlier landscape work. This slice uses one portrait stack and adds no dedicated landscape mode. Game Boy casing styling is a separate follow-up.

The bilingual landing names the four real native starters, Taichung exploration and ten landmark gyms. It explicitly says only the Station has a playable battle. It does not add a cosmetic web starter selector or claim the future native Team/opening work has shipped.

Play immediately enters a viewport-filling CSS player and requests native fullscreen before any awaited loading step. Unsupported/rejected fullscreen leaves CSS mode active. Back to introduction pauses the live game; Return resumes it without recreating the canvas. A late native fullscreen completion is dismissed if the player already left. Leaving during loading prevents the cartridge from beginning behind the introduction.

Game options contains the existing language/save/sound/restart controls. Existing nodes and handlers are moved, not cloned. All modal dialogs live under the player so they remain reachable in native fullscreen. Options preserve prior pause state, release held inputs, and restore focus. The separate City Map remains available. Preflight/loading failures appear directly beside Play; native fullscreen failure does not prevent play.

## Verification

- TypeScript, production build and all **13 unit tests** passed.
- The optional browser fixture passed **13/13 synthetic DOM checks**: previous input coverage plus synchronous fullscreen request/rejection fallback, options pause/resume/focus, already-paused preservation and exit/canvas preservation. DOM node checks compare actual identity.
- Real desktop in-app emulator loaded the frozen `ae0ada35` cartridge. Play filled a 390×844 viewport; the page content disappeared. Escape from native fullscreen preserved CSS game mode. Back → Return restored active controls with exactly one original canvas and no new loading gate.
- At 320×568 portrait, the page had no horizontal overflow; directions/system controls remained 48px and action buttons were 106×58px. Both header actions were 44px tall. Controls remained inside the viewport.
- The moved options controls saved a snapshot and exported the existing **131088-byte** native save. Restart opened its nested confirmation and Escape returned safely to options. City Map opened/closed inside the player and resumed the prior running state.
- A separate ordinary loopback server on port 5176 deliberately omitted isolation headers. Play still entered CSS game mode, displayed the complete preflight error directly below its 44px button, kept game controls disabled, and allowed return to the introduction. This was a local negative test, not a service-credential request.
- The native save format, language bridge v1, runtime preparation, hosting manifests and frozen ROM were unchanged.

These are desktop browser/viewport checks. Main reported that the user confirmed actual iPhone Chrome startup after the separate version-3 hosting repair. That report does not establish physical-phone coverage of this new portrait view. Main remains integration/publishing owner.

Local ignored evidence: `artifacts/interface-qa/introduction-zh.jpg`, `immersive-portrait.jpg`, and `visible-startup-error.jpg`. Earlier short-landscape captures are superseded diagnostics and are not part of this requested release.
