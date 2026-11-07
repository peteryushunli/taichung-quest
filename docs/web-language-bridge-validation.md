# Production browser/native language integration

Validated in an isolated, built Vite preview on `http://127.0.0.1:5174`, using the native bridge cartridge with SHA-1 `550080af3d845ff50ce02a6163e20c36905ea894` and SHA-256 `6d7e3c1111c3cf6b8510f2111e9340a59d05889fea60bafcfc38a6f4b8fddcd9`. Its matching metadata identifies the version-1 32-byte packet at GBA address `0x0203F468`.

## Actual Chrome checks

- The production client found one advancing packet at Wasm heap offset `0xB3468`. No emulator core settings are changed by the bridge.
- Browser English before Play did not answer the native language choice. Before Continue, the connection reported native startup/unset. Continuing the existing native Chinese SRAM save changed the entire browser interface to Traditional Chinese automatically.
- A header English selection while the actual Chinese Start menu was open remained visibly queued, with both selectors disabled. Closing the native menu acknowledged the request; reopening it showed the actual English menu, with the browser in English.
- Choosing Traditional Chinese inside the actual native Language menu immediately changed the browser back to Chinese. The Chinese confirmation and Chinese browser interface were captured together.
- An English selection from the City Map while the game was paused stayed queued. Closing the map resumed play and applied it. A second test opened the guide from an already paused game, queued Chinese, and closed the guide: the prior pause remained and the request stayed pending until the player explicitly pressed Resume. The next native menu was Chinese.
- An older browser English request was queued while the actual native Language chooser was open. Explicitly re-selecting the current native Chinese language canceled that request; the browser reverted to Chinese and re-enabled its selectors. This exercises the same-language native-precedence case in the production client.
- The player remained on the saved bicycle at the same Greenway position throughout language changes. There was no game reset or fresh title sequence.
- At a 390×844 viewport, body and header widths remained 390 pixels with no horizontal overflow. The viewport override was reset; the healthy QA tab was closed.

Ignored screenshot evidence lives in root `artifacts/`: `qa-language-browser-applied-en.jpg`, `qa-language-native-applied-zh.jpg`, `qa-language-guide-paused-pending.jpg`, `qa-language-previous-pause-pending.jpg`, `qa-language-native-wins.jpg`, and `qa-language-mobile-zh.jpg`.

## Save-spot regression after disabling the duplicate native timer

With `autoSaveStateEnable: false` set before load, Save spot completed successfully while the actual Chinese Start menu was open on Language. An ordinary page reload, followed by Play without a cartridge-boot query, restored that exact open menu, bicycle position and Chinese language. The player reported “Welcome back” and the bridge reattached to one advancing packet. It did not boot through the title/Continue flow. Evidence: `qa-save-spot-menu-before-reload.jpg` and `qa-save-spot-menu-restored.jpg`.

Pinned upstream source confirms the forced `autoSaveState()` API is independent of `autoSaveStateEnable`; that flag gates only the internal timer. Load-time restoration separately uses `restoreAutoSaveStateOnLoad`. Source: <https://github.com/thenick775/mgba/blob/c0d196432c4437ff06827dccd1a785de2afab5b8/src/platform/wasm/main.c>.

## Source and automated checks

- `npm run build` and TypeScript checking passed.
- `npm test` passed eight adversarial shared-heap tests: exact ROM metadata, frozen-copy rejection, sole advancing candidate, writes confined to the five request bytes, busy queuing, native same-selection precedence, startup authority, restored outstanding requests, ambiguous candidates, sequence wrap and heap replacement. Tests run on Node 22 with built-in type stripping.
- The prepared Wasm binary matches the npm package byte for byte. Prepared JavaScript differs only by `Module.getTaichungHeapU8=()=>HEAPU8;` inside its factory. Preparation checks the complete upstream glue SHA-256 and refuses unexpected input.
- The modified-source notice, complete modified glue, preferred patch script and MPL 2.0 license are served together. The source script records the exact npm/source revision.

Coverage is custom Taichung menus/content plus browser/guide text. Original FireRed screens remain English. Native language persists through the game's own Save action; the interface preference alone is not a substitute for a cartridge save. No bridge access is attempted for missing/mismatched metadata or an unsupported runtime. Full city maps and gym gameplay are separate integrations.
