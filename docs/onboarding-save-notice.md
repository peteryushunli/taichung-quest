# Avoid a false opening warning after native Save

Base frontend: `b2428841968206eb313e3dcaa60c41d27dcbdf0c`.

The onboarding controller previously showed first-settings instructions on every
`unavailable` event, even after a trusted native packet identified an exempt
existing save or completed opening. The bridge intentionally rejects stale
frames (one-second threshold), replaced/invalid heaps and ambiguous allocations.
A Save-like frame stall plus reconnect failure reproduces the false notice.
The exact transport failure during Main's native QA is not inferred from its
observed 500ms flash pause alone.

The fix changes notification policy only. Keep the most recent trusted live or
pending snapshot across transport-only states. Suppress this startup notice for
native phase0/flags0 with a known native language (existing exempt save), or
phase9/flags1 (finished farewell). Fresh phase0 without a language, startup,
teaching, unfinished farewell and unknown discovery retain the existing fallback.
A new attach resets the evidence and duplicate-notice latch; a fresh native
snapshot supersedes a prior completion.

No discovery, liveness, command writer, ACK handling, language bridge, pause/input
recovery, persistence, packet ABI or native source changes. In particular, actual
rejected/timed-out startup-language ACKs keep their existing fallback message.
The policy does not use browser save hints or capture masks as completion proof.

Validation:

- 13 focused onboarding tests pass, including the real bridge's stalled-frame/
  reconnect behavior and the actual controller compiled with view/browser
  boundaries stubbed. Reinstating its old unconditional notice reproduces the
  false toast. No emulator/browser UI is controlled by these tests.
- Full frontend suite: 92/92 pass. TypeScript check passes.
- Native Save/runtime confirmation after integration remains Main's QA task.

```sh
cd web
node --experimental-strip-types --test tests/onboarding-fallback.test.mjs tests/onboarding-bridge.test.mjs
npm test
npm run check
```
