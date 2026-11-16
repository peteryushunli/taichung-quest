# Interface and controls handoff — independent slice

Implementation commit `c176674d36aec1b095c2bc5aeb0fb3d2d8a4c55f` on `codex/horizontal-city`, based on PR18
`8bdc3b3`. This is the exclusively assigned frontend worktree. No native code,
Maps exporter, shared patch, old Claude checkout, PR or deployment was edited.

Completed: persistent compact bilingual street label lower-right; fresh native
field gating; off-road/unknown/interior/menu/battle/pause hiding; game-oriented
minimap without N; GPS-based visitor links; explicit geometry presentation
adapter used by minimap, landing pins and City Guide. New geometry cannot fall
back to old catalog sight positions, home coordinates or district label anchors.
The shipped exact geometry retains compatibility until its actual replacement.

Validation:68/68 unit tests; TypeScript/production build; fixture build;17/17
browser HUD checks on desktop and390×844; EN/ZH lower-right screenshots; real
Station visitor link confirmed from DOM. Input, selection, native tutorial,
sound/language and navigation bridge source files match baseline byte-for-byte.
See `ui-validation.json`. Browser tab closed, viewport reset, own port4217 stopped.

Review captures: `artifacts/horizontal-city-ui/street-en-desktop.jpg`,
`street-en-phone.jpg`, `street-zh-phone.jpg`, `guide-en-desktop.jpg` in this
worktree. The street region is explicitly simulated browser fixture data. These
are UI checks, not new native map synchronization or physical-device proof.

Pending Maps: actual corrected exterior chunks/IDs and origins; all placed
catalog markers; bilingual road regions; home and district label anchors;
source-rendered world/radar art and its matching fingerprint. Proposed optional
presentation boundary is documented in `geometry-adapter.md`, but adapt Maps'
actual export if it differs. No320×192/384×256 draft is frozen here. Existing
20-place catalog and shipped native geometry/images are unchanged; new four
proposed stops await actual placement/art, rather than invented playable pins.

Main owns cherry-picking, exact native-ROM/geometry metadata pairing, actual
catalog/art export and native acceptance/release. This handoff is ready to
integrate independently while the actual new geometry remains pending.
