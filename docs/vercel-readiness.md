# Vercel preparation — separate integration item

This is a local configuration and deployment-artifact handoff. No Vercel account, project, credentials, remote build, upload or deployment was created. Main owns integration and authenticated preview/publication.

## Project configuration

Use the **repository root** as the Vercel Project Root Directory, leaving the root-directory override empty. The tracked root `vercel.json` declares:

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Install | `npm ci --prefix web` |
| Build | `bash scripts/build-site.sh` |
| Static output | `dist` |
| Global COOP | `same-origin` |
| Global COEP | `require-corp` |
| Wasm Content-Type | `application/wasm` |
| ROM/metadata cache | `no-store` |

Vercel's static header configuration is separate from the existing Cloudflare-style `_headers` file. See the official [Vite guide](https://vercel.com/docs/frameworks/frontend/vite) and [response-header configuration](https://vercel.com/docs/project-configuration/vercel-json#headers).

The player, emulator loader/glue/Wasm, ROM and metadata remain same-origin. The pinned runtime preparation still verifies the upstream JavaScript before adding the existing language-heap getter; runtime license, modification notice and reproducible patch script are included in the artifact.

## Required cartridge handoff

Generated ROMs, native vendor source, toolchains and `build.json` are intentionally ignored. A public Git import alone cannot supply a playable game. Both the ordinary site build and prebuilt packager now reject a missing or mismatched release pair before producing a fresh deployable output.

After Main freezes the combined native release, place **both** of its files in `web/public/roms/`:

```text
taichung-firered.gba
build.json
```

Main can generate that pair with the existing source/build workflow, or copy an already-verified pair. Do not rebuild native source in another owner's checkout, commit generated ROMs, mix metadata from another build, or fetch a cartridge from an arbitrary external URL.

`node web/scripts/verify-cartridge.mjs` validates the header, byte count, SHA-256, SHA-1, native source commit and version-1 language-bridge contract. This validates the build identity; it does not substitute for testing native gameplay.

## Reproducible local artifact

From the integrated repository root, with Node/npm dependencies installed:

```sh
npm ci --prefix web
npm test --prefix web
node scripts/prepare-vercel.mjs
```

The script runs the normal checked Vite build, verifies the copied ROM/metadata again, confirms runtime/license assets, and emits:

- `.vercel/output/static/`: complete deployable site, including the ignored ROM.
- `.vercel/output/config.json`: Build Output API v3 headers and Wasm MIME override.
- `artifacts/vercel-readiness.json`: frontend commit, dirty-source flag, native release metadata and SHA-256 for every output file.

Only generated `.vercel/output/` is replaced. Any existing ignored `.vercel/project.json` link is retained. The packager performs no account or network action. Main should generate the actual release artifact from its clean integrated checkout and confirm `trackedSourceDirty` is false. All ignored release inputs must be the frozen pair recorded in the manifest.

The output follows Vercel's official [Build Output API format](https://vercel.com/docs/build-output-api/configuration). Once Main has authenticated and linked the intended project, the standard **preview** command is:

```sh
vercel deploy --prebuilt
```

This command is documented for the integration owner; it has **not** been executed here. It uploads the prepared output without relying on a remote checkout to reconstruct the ignored cartridge. See [prebuilt deployment documentation](https://vercel.com/docs/cli/deploying-from-cli#deploying-from-local-build-prebuilt). Production promotion remains Main's release decision.

## Verification and open checks

Local preparation passed with the frozen 16MiB `ae0ada35` cartridge, SHA-256 `629bcd40965e7e5af51c3e1ffbb6fa436f76fe454fbb9f21aa7015e3dd6a2185`, and its exact metadata. TypeScript/build and all 13 unit tests passed, including fail-closed cases for missing, mismatched and unsupported bridge metadata. The prepared output contains 15 fingerprinted files, explicit isolation headers and the Wasm content type. Optional browser test fixtures are excluded from normal release builds.

An actual Vercel preview still needs Main to verify response headers/MIME types, `crossOriginIsolated`/`SharedArrayBuffer`, worker startup and a complete Play/save/reload flow at that origin. Local Vite headers and artifact inspection do not prove Vercel edge behavior. No remote deployment or physical iPhone/Android test is claimed.

Saves belong to each browser/origin. Download/import can move a cartridge save from the existing host to a future Vercel origin; browser snapshots do not automatically migrate. Keep the existing preview/release available during that transition.
