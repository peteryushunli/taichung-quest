# Vercel preparation — separate integration item

This document began as a local configuration handoff. Main has since created and linked the existing-account `taichung-quest` project and deployed and verified the Greenway update at https://taichung-quest.vercel.app, after a separate protected preview and native/client acceptance. The original GPT Site remains live. See `docs/next-build-integration.md` for release identities and verification limits.

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

`node web/scripts/verify-cartridge.mjs` validates the header, byte count, SHA-256, SHA-1, native source commit and version-1 language-bridge contract. It also requires the version-1/48-byte navigation packet, supported magic values and an aligned address wholly inside EWRAM. The address comes from the release metadata rather than a fixed previous build address.

Both the static site build and the Vercel packager require `minimap.schemaVersion` and `geometryFingerprintSha256` to match the frontend's bundled `web/src/data/minimap-contract.json`. The verifier independently recomputes the native exporter's sorted UTF-8 JSON fingerprint over schema, coordinates, world, map layouts, markers and seams. A stale edited layout therefore fails even if its old fingerprint string still matches the metadata. Source-provenance-only refreshes remain valid when geometry is unchanged. Missing/unsupported navigation or geometry rejects the build before fresh output is produced. These checks establish metadata consistency; native gameplay and exact final-build attachment still need testing.

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
vercel deploy --prebuilt --target preview
```

Main has now executed the prebuilt workflow. Use the explicit preview target: on the new project, omitting it made the first deployment production. The explicit preview target produced a separate protected preview. This uploads the prepared output without relying on a remote checkout to reconstruct the ignored cartridge. See [prebuilt deployment documentation](https://vercel.com/docs/cli/deploying-from-cli#deploying-from-local-build-prebuilt). Production promotion remains Main's release decision.

## Verification and open checks

The original local preparation used the older `ae0ada35` cartridge. It is historical evidence, not proof of a current release.

The new deployment gate passes all 28 unit tests, including missing/unsupported navigation metadata, invalid packet addresses, missing/mismatched minimap bindings, an edited Theater layout with a stale fingerprint, a missing geometry file and a provenance-only refresh. Existing ROM digest/source and language checks remain covered.

Local packaging was refreshed against Main's intermediate Theater/cast pair: native `a9587ae9b4d8988cf89f9c72ecf413d3c6fa7d85`, 16MiB ROM SHA-256 `38e48bf5110c16910f3f769ef72540e11b16538e0143d1fb18078342e416cb6b`, navigation address 33813676 and geometry fingerprint `924380bc2dfe7176686fd81395a52b8489ff18ff6401442acdf06a5d41331722`. The 19 output file hashes, isolation headers, Wasm content type and fixture exclusion were checked. This is an intermediate packaging check; Main must regenerate from the clean integrated final Park source/metadata and verify that final attachment before deploying.

An actual Vercel preview still needs Main to verify response headers/MIME types, `crossOriginIsolated`/`SharedArrayBuffer`, worker startup and a complete Play/save/reload flow at that origin. Local Vite headers and artifact inspection do not prove Vercel edge behavior. No remote deployment or physical iPhone/Android test is claimed.

Saves belong to each browser/origin. Download/import can move a cartridge save from the existing host to a future Vercel origin; browser snapshots do not automatically migrate. Keep the existing preview/release available during that transition.
