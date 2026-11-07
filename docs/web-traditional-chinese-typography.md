# Readable Traditional Chinese web type

The web language picker and tutorial cards use full-resolution browser text. Their shared Traditional Chinese font stack explicitly prefers PingFang TC, Noto Sans TC, Noto Sans CJK TC, then Microsoft JhengHei before the platform sans-serif fallback. These are system fonts; no network font request or bitmap font asset is added. The page language and each tutorial dialog carry `zh-Hant` when appropriate, and the bilingual first choice keeps explicit language tags on both languages.

Chinese headings use normal tracking and 1.4 line height instead of the compressed Latin heading settings. Main tutorial copy remains 16px; the Chinese language-choice help is 14px and secondary choice descriptions/captions are 13px. Existing 48px dialog action targets remain intact. The page's serif display headings retain their existing design.

This follow-up changes shared typography tokens, onboarding CSS and the dialog's language attribute. It does not change native dialogue rendering, canvas image-rendering, emulator glue, mailbox behavior, party/progress, or either sound control. Root's shared in-game sound icon and audio state remain separate accepted work.

TypeScript, production build and development-fixture build pass. The preferred PingFang TC family is present in the preview machine's installed system font collection. A source comparison confirms canvas rules, main/audio, emulator glue and the mailbox coordinator are unchanged.

Phone-width visual/overflow checks and matched before/after screenshots are pending. Main relayed the user's request to conserve usage and stop new UI/research/test waves, so no revised-font UI check was started. Existing `onboarding-language-390-draft.jpg` and `onboarding-map-320-draft.jpg` are the **before** examples from the previous typography, not proof of this revision. Native bitmap-font examples and acceptance remain Main's separate renderer task; this source checkpoint does not claim to improve native glyphs or to be a live release.
