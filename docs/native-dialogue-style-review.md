# Native dialogue style — isolated review draft

Base: released main `0ffa9c9dabd9c212927aeba4b84c800b4deabad4`.
Branch: `codex/native-dialogue-style-review`. This style is a draft for user
review only. It is not authorized for integration or publication yet and does
not block Main's independent selector/collision fixes.

The draft stops painting a second message over the native dialogue. At the
native `ScriptWaitCard` boundary, the cartridge's actual final message page,
frame, palette and bitmap text remain visible. A transparent button fits the
native message area and accepts the existing A/tap route. The original native
red advance-arrow sprite provides the only added visible cue. The modern web
type, duplicate frame, progress counter and side pause strip are removed.

The initial bilingual language picker is unchanged. The accessible topic and
brief description remain available to screen readers. Pending ACK disables the
hit target and hides the arrow. Native movement stays blocked by the existing
coordinator. Back to introduction still leaves the stage unread through the
existing `beforeLeave` path; no separate visible pause-strip button is added.

Shipped controls/input cleanup, selection protection, sound/main logic, keyboard
mapping, native language/ACK bridge and coordinator are byte-for-byte unchanged
from the release. No native code, dialogue copy, font, portrait, map or save
schema is edited. The arrow is a direct unchanged source PNG; provenance is in
`web/src/assets/native-dialogue/README.md`.

The review preview uses the released matching native pair `6366b9e` / ROM
`9550aaff12089132384e82f244c3359b7c09a3fe57a43696610821f8e0c0a020`.
Actual native English and Chinese text therefore needs real language application;
changing only the paused browser UI is not sufficient for these screenshots.
The existing longer native opening/tutorial pages remain unchanged. This is a
style draft, not acceptance of shortened native copy or a new ROM.

Source validation: 50/50 existing unit tests, TypeScript/production build and
fixture build pass. The browser fixture now checks transparent hit regions,
accessible A/B descriptions, the original native arrow, absence of progress/pause
chrome, context/ACK guards and unread-state preservation when leaving. Actual
browser execution and four EN/ZH desktop/phone captures await Main's UI lease.
