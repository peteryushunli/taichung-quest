import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = path.dirname(require.resolve('@thenick775/mgba-wasm'));
const target = path.join(root, 'public', 'emulator');
await mkdir(target, { recursive: true });
for (const file of ['mgba.js', 'mgba.wasm']) {
  await copyFile(path.join(runtime, file), path.join(target, file));
}
await copyFile(path.join(root, 'licenses', 'MPL-2.0.txt'), path.join(target, 'LICENSE.txt'));
await writeFile(path.join(target, 'SOURCE.txt'), [
  'mGBA WebAssembly runtime — @thenick775/mgba-wasm 2.6.0',
  'Copyright © 2013–2026 Jeffrey Pfau and contributors.',
  'Distributed unmodified under the Mozilla Public License 2.0.',
  'Corresponding source: https://github.com/thenick775/mgba/tree/c0d196432c4437ff06827dccd1a785de2afab5b8',
  'License: https://www.mozilla.org/MPL/2.0/',
  '',
].join('\n'));
console.log('Prepared same-origin mGBA runtime.');
