# Accepted compact tutorial — PR8 semantic port

Prepared on isolated branch `codex/compact-onboarding-pr8` from combined PR8
`b0d684e679b6ab39c93364685ec515eece544f5b`. Game decisions and Main relayed
acceptance of the compact screenshot style; this is a source port for Main's
integration, not a publication or combined-runtime receipt.

The four tutorial frames retain the reviewed in-game placement, short bilingual
copy, native A/B hints, no tutorial backdrop/blur and readable initial language
picker. The Map body now says "all landmarks" / "所有地標", avoiding the old
ten-place claim now that PR8 includes twelve stops and ten gyms.

Only the reviewed tutorial route is added to current controls. Current PR8's
controls were identical to the shipped `8067476` hotfix; the route delta was
applied onto that file, preserving pointer-type ownership, global terminal-event
handling, last-touch recovery and lifecycle cleanup. The resulting controls,
coordinator and tutorial CSS match reviewed source `db0ca38` exactly. The view
matches it except for the corrected Map sentence.

The `main.ts` change is exactly one tutorial callback binding; removing that line
reproduces the current PR8 file byte-for-byte. Sound, boot/import handling,
native bridge, input mapping, view manager, twelve-stop catalog, contract,
landing and art/team bindings are unchanged. Native source and ROMs were not
edited. Keyboard configurability is outside this port.

Validation: 50/50 unit tests, TypeScript, production build and fixture build pass.
Read-only source comparisons verify the preservation statements above. The
earlier review source passed 19/19 browser input checks, 5/5 presentation checks
and a simulated ACK check; those were run on the older preview, not this combined
PR8 client. This source-only pass performs no new browser actions while Gameplay
owns the UI lease. Main will coordinate combined full-client checks.

Selection/callout fix `80d8c156947744a0049ab78cc0de7d0fd2bdcffb` is independent
on `codex/game-display-no-selection` and may be integrated separately. Main alone
owns shared PR8 integration, combined runtime acceptance and publication.
