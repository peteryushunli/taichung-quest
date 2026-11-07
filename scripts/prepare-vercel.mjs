import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyCartridge } from '../web/scripts/verify-cartridge.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const output = path.join(root, '.vercel/output');
const staged = path.join(root, `.vercel/output-${randomUUID()}`);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const config = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));

// Build from the same checked release pair that the frontend will serve.
await verifyCartridge(path.join(root, 'web/public/roms'));
execFileSync('bash', ['scripts/build-site.sh'], { cwd: root, stdio: 'inherit' });
const cartridge = await verifyCartridge(path.join(dist, 'roms'));
for (const file of ['index.html', 'emulator-loader.js', 'emulator/mgba.js', 'emulator/mgba.wasm', 'emulator/LICENSE.txt', 'emulator/SOURCE.txt', 'emulator/prepare-emulator.mjs', 'licenses/NotoSansTC-OFL.txt']) {
  await readFile(path.join(dist, file));
}
const buildConfig = {
  version: 3,
  routes: config.headers.map(({ source, headers }) => ({ src: source, headers: Object.fromEntries(headers.map(({ key, value }) => [key, value])), continue: true })),
  overrides: { 'emulator/mgba.wasm': { contentType: 'application/wasm' } },
};
const files = {};
async function fingerprint(directory, prefix = '') {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) await fingerprint(path.join(directory, entry.name), `${relative}/`);
    else if (entry.isFile()) files[relative] = sha256(await readFile(path.join(directory, entry.name)));
    else throw new Error(`Unexpected non-file in deployment output: ${relative}`);
  }
}
await mkdir(staged, { recursive: true });
try {
  await cp(dist, path.join(staged, 'static'), { recursive: true });
  await writeFile(path.join(staged, 'config.json'), `${JSON.stringify(buildConfig, null, 2)}\n`);
  await fingerprint(staged);
  const manifest = {
    frontendCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    trackedSourceDirty: !!execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: root, encoding: 'utf8' }).trim(),
    cartridge,
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
