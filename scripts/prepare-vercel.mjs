import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyCartridge } from '../web/scripts/verify-cartridge.mjs';
import { hasReadableFireRedSave } from '../web/src/firered-save.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const output = path.join(root, '.vercel/output');
const staged = path.join(root, `.vercel/output-${randomUUID()}`);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const config = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
const seedName = 'roms/playtest-post-intro.sav';
const [option, seedManifestPath, ...extra] = process.argv.slice(2);
const playtestPreview = process.env.VITE_PLAYTEST_PREVIEW_SAVE === '1';

if (extra.length || (option && (option !== '--playtest-save' || !seedManifestPath)) ||
    playtestPreview !== Boolean(seedManifestPath)) {
  throw new Error('Set VITE_PLAYTEST_PREVIEW_SAVE=1 and pass --playtest-save with the paired playtest manifest together.');
}

// Build from the same checked release pair that the frontend will serve.
const publicCartridge = await verifyCartridge(path.join(root, 'web/public/roms'));
if (Object.hasOwn(publicCartridge, 'playtestSave')) {
  throw new Error('Keep preview save metadata in the dedicated playtest manifest.');
}
let previewSeed;
if (playtestPreview) {
  const source = JSON.parse(await readFile(seedManifestPath, 'utf8'));
  if (source.version !== 1 || source.romSha256 !== publicCartridge.sha256 ||
      source.bytes !== 0x20000 || typeof source.savePath !== 'string' ||
      !/^[a-f0-9]{64}$/.test(source.sha256)) {
    throw new Error('The preview save manifest does not match this cartridge.');
  }
  const bytes = await readFile(path.resolve(path.dirname(seedManifestPath), source.savePath));
  if (bytes.length !== source.bytes || sha256(bytes) !== source.sha256 || !hasReadableFireRedSave(bytes)) {
    throw new Error('The selected preview save failed its size, digest or native Save validation.');
  }
  previewSeed = { bytes, metadata: { version: 1, bytes: source.bytes, sha256: source.sha256 } };
}
execFileSync('bash', ['scripts/build-site.sh'], { cwd: root, stdio: 'inherit' });
const cartridge = await verifyCartridge(path.join(dist, 'roms'));
if (previewSeed) cartridge.playtestSave = previewSeed.metadata;
for (const file of ['index.html', 'emulator-loader.js', 'emulator/mgba.js', 'emulator/mgba.wasm', 'emulator/LICENSE.txt', 'emulator/SOURCE.txt', 'emulator/prepare-emulator.mjs', 'licenses/NotoSansTC-OFL.txt', 'licenses/native-font.txt']) {
  await readFile(path.join(dist, file));
}
const buildConfig = {
  version: 3,
  routes: config.headers.map(({ source, headers }) => ({ src: source, headers: Object.fromEntries(headers.map(({ key, value }) => [key, value])), continue: true })),
  overrides: { 'emulator/mgba.wasm': { contentType: 'application/wasm' } },
};
if (previewSeed) {
  buildConfig.routes.push({ src: '/roms/playtest-post-intro\\.sav',
    headers: { 'Cache-Control': 'private, no-store' }, continue: true });
}
const files = {};
async function fingerprint(directory, prefix = '') {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = `${prefix}${entry.name}`;
    if (/\.sav$/i.test(entry.name) && (!previewSeed || relative !== `static/${seedName}`)) {
      throw new Error(`A game save must not be published: ${relative}. Remove it from web/public.`);
    }
    if (entry.isDirectory()) await fingerprint(path.join(directory, entry.name), `${relative}/`);
    else if (entry.isFile()) files[relative] = sha256(await readFile(path.join(directory, entry.name)));
    else throw new Error(`Unexpected non-file in deployment output: ${relative}`);
  }
}
await mkdir(staged, { recursive: true });
try {
  await cp(dist, path.join(staged, 'static'), { recursive: true });
  if (previewSeed) {
    await writeFile(path.join(staged, 'static', seedName), previewSeed.bytes, { flag: 'wx' });
    await writeFile(path.join(staged, 'static/roms/build.json'), `${JSON.stringify(cartridge, null, 2)}\n`);
  }
  await writeFile(path.join(staged, 'config.json'), `${JSON.stringify(buildConfig, null, 2)}\n`);
  await fingerprint(staged);
  const manifest = {
    frontendCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    trackedSourceDirty: !!execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: root, encoding: 'utf8' }).trim(),
    cartridge,
    ...(previewSeed ? { deploymentTarget: 'preview' } : {}),
    files,
  };
  // Only replace generated build output; retain Main's ignored project link.
  await rm(output, { recursive: true, force: true });
  await rename(staged, output);
  await mkdir(path.join(root, 'artifacts'), { recursive: true });
  await writeFile(path.join(root, 'artifacts/vercel-readiness.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Prepared ${Object.keys(files).length} files in .vercel/output. ROM SHA-256 ${cartridge.sha256}.`);
  console.log('No account, project, upload or deployment action was performed. Main owns the authenticated preview deployment.');
} finally { await rm(staged, { recursive: true, force: true }); }
