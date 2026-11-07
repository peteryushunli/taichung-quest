# Explicit emulator response headers on Sites

> Current hosting policy: [Vercel](https://taichung-quest.vercel.app) is the sole production frontend for future releases and client QA. Follow [the Vercel release workflow](vercel-readiness.md). Legacy GPT Site deployments and commands below are historical records; do not publish new versions there. The legacy host was last observed active, and shutdown has not yet been verified. Preserve its source archives and `.openai/hosting.json` identity.

The version-2 static Site served the app and Wasm without COOP/COEP in
Interface's authenticated response checks. Its copied `_headers` file was not
applied by Sites static dispatch. That prevents the threaded emulator's
`crossOriginIsolated` precondition even though local Vite works.

Sites supports a Worker ES module at `dist/server/index.js`. The retained
project manifest now selects that mode (no `static` field). Build with:

```sh
node scripts/build-sites-worker.mjs
node scripts/validate-sites-worker.mjs
```

This first runs the unchanged static/Vercel build and verifies the frozen
cartridge pair. It then packages those same assets into a self-contained
Worker. Each asset is stored compressed and delivered with explicit isolation,
MIME and private/no-store headers. There are no external fetches, secrets,
database bindings or alternative authentication flows. The existing Sites
private access gate remains in front of the handler.

The Worker approach follows the provided Sites ESM deployment contract without
assuming that an undocumented asset binding or `_headers` parser exists.
Compressed binary data is generated only inside ignored build output; the
source repository still excludes cartridge and emulator binaries.

The validator checks every asset byte-for-byte in gzip and identity responses,
including the full ROM and Wasm, along with HEAD, error routes and isolation
headers. `node scripts/preview-sites-worker.mjs` runs that same generated
handler on local port 4183 for browser testing. This local preview deliberately
does not emulate hosted sign-in and is not a claim of physical-phone testing.

Vercel preparation remains `node scripts/prepare-vercel.mjs`; its static output
is separate. Run the Sites build last before packaging a Sites release.

Worker gzip delivery uses Cloudflare's documented `encodeBody: "manual"` to
avoid double compression: [Response API](https://developers.cloudflare.com/workers/runtime-apis/response/).
The bundle is checked against a conservative 32 MiB local cap, below the
current platform limit: [Worker limits](https://developers.cloudflare.com/workers/platform/limits/).

Live response verification uses ordinary authorized browser sign-in or
explicitly authorized service access. After an initial automatic approval
rejection, the user explicitly allowed read-only service-token checks. Main
verified the deployed headers and full ROM/Wasm hashes through that authorized
path, without printing/persisting the token or following redirects. The user
then confirmed successful game startup on iPhone Chrome. This does not imply
authorization to rotate credentials, widen access or use the token elsewhere.
