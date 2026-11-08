# Game display selection fix

Prepared independently from combined PR8 source
`b0d684e679b6ab39c93364685ec515eece544f5b`.

Only the `.screen` subtree receives `user-select: none`, the WebKit equivalent,
`-webkit-touch-callout: none` and `-webkit-user-drag: none`. This includes native
canvas content, minimap HTML/SVG labels, pause/start overlays and any compact
tutorial frame mounted in that display. The page, City Map dialog and options
forms outside the display keep their normal browser behavior.

The screen captures and cancels only `selectstart`, `contextmenu` and `dragstart`.
It does not cancel pointer, touch, click or keyboard events, change focusability,
use `pointer-events: none`, or change the input/ACK protocols.

Validation: existing unit tests, production TypeScript/Vite build and browser
fixture build pass. The targeted browser fixture checks selection prevention on
SVG/HTML labels, unaffected outside inputs, working buttons and canvas keyboard
focus. The matched PR8 client later passed 20/20 controls/selection browser checks at
desktop and 390px phone sizes; no physical iPhone callout test is claimed. Controls and onboarding source remain
unchanged. Main owns PR8 integration and publication.
