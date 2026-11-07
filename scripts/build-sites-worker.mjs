import { readFile, readdir, mkdir, rm, rename, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { verifyCartridge } from '../web/scripts/verify-cartridge.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const stage = path.join(root, '.artifacts/sites-worker-stage');
const manifest = JSON.parse(await readFile(path.join(root, '.openai/hosting.json'), 'utf8'));
if (!manifest.project_id || manifest.static != null) throw new Error('Sites Worker requires the existing project ID and no static dispatch configuration.');
execFileSync('bash', ['scripts/build-site.sh'], { cwd: root, stdio: 'inherit' });
const cartridge = await verifyCartridge(path.join(dist, 'roms'));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm', '.gba': 'application/octet-stream', '.txt': 'text/plain; charset=utf-8' };
const assets = {};
const files = {};
async function collect(directory, prefix = '') {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) await collect(path.join(directory, entry.name), `${relative}/`);
    else if (!entry.isFile()) throw new Error(`Unexpected non-file: ${relative}`);
    else if (relative !== '_headers') {
      const type = types[path.extname(relative)];
      if (!type) throw new Error(`Missing MIME type for ${relative}`);
      const bytes = await readFile(path.join(directory, entry.name));
      const gzip = gzipSync(bytes, { level: 9 });
      assets[`/${relative}`] = { type, bytes: bytes.length, gzipBytes: gzip.length, gzip: gzip.toString('base64') };
      files[`/${relative}`] = { type, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
    }
  }
}
await collect(dist);
for (const required of ['/index.html', '/emulator-loader.js', '/emulator/mgba.js', '/emulator/mgba.wasm', '/roms/taichung-firered.gba', '/roms/build.json', '/emulator/LICENSE.txt', '/emulator/SOURCE.txt', '/emulator/prepare-emulator.mjs', '/licenses/NotoSansTC-OFL.txt']) {
  if (!assets[required]) throw new Error(`Missing release asset ${required}`);
}
const handler = await readFile(path.join(root, 'hosting/asset-worker.mjs'), 'utf8');
const source = `${handler}\nconst assets = ${JSON.stringify(assets)};\nexport default createAssetWorker(assets);\n`;
if (Buffer.byteLength(source) > 32 * 1024 * 1024) throw new Error('Worker bundle exceeds the conservative 32 MiB release limit.');
await rm(stage, { recursive: true, force: true });
await mkdir(path.join(stage, 'server'), { recursive: true });
await mkdir(path.join(stage, '.openai'), { recursive: true });
await writeFile(path.join(stage, 'server/index.js'), source);
await writeFile(path.join(stage, '.openai/hosting.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await mkdir(path.join(root, 'artifacts'), { recursive: true });
await writeFile(path.join(root, 'artifacts/sites-worker-build.json'), `${JSON.stringify({ cartridge, workerBytes: Buffer.byteLength(source), files }, null, 2)}\n`);
await rm(dist, { recursive: true, force: true });
await rename(stage, dist);
console.log(`Built self-contained Sites Worker: ${Object.keys(files).length} assets, ${Buffer.byteLength(source)} bytes. Isolation headers are explicit responses, not _headers metadata.`);
