import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = path.dirname(require.resolve('@thenick775/mgba-wasm'));
const target = path.join(root, 'public', 'emulator');
await mkdir(target, { recursive: true });
const glue = await readFile(path.join(runtime, 'mgba.js'), 'utf8');
const expectedGlueSha256 = '9bb59a97e21175e1cf4f9e36eec88ec6a53f2f3a17002b9f460e6f0339b76b62';
const factoryPrefix = 'async function mGBA(moduleArg={}){var Module=moduleArg;';
if (createHash('sha256').update(glue).digest('hex') !== expectedGlueSha256 || !glue.startsWith(factoryPrefix)) {
  throw new Error('The pinned mGBA 2.6.0 glue changed. Review the heap getter patch before preparing a new runtime.');
}
// A read-only accessor to the current view, rather than a stale exported view.
// The native Wasm core remains byte-for-byte upstream. Only our validated
// language-packet client may write its two protocol-owned request fields.
const modifiedGlue = glue.replace(factoryPrefix, `${factoryPrefix}Module.getTaichungHeapU8=()=>HEAPU8;`);
await writeFile(path.join(target, 'mgba.js'), modifiedGlue);
await copyFile(path.join(runtime, 'mgba.wasm'), path.join(target, 'mgba.wasm'));
await copyFile(path.join(root, 'licenses', 'MPL-2.0.txt'), path.join(target, 'LICENSE.txt'));
await copyFile(fileURLToPath(import.meta.url), path.join(target, 'prepare-emulator.mjs'));
await writeFile(path.join(target, 'SOURCE.txt'), [
  'mGBA WebAssembly runtime — @thenick775/mgba-wasm 2.6.0',
  'Copyright © 2013–2026 Jeffrey Pfau and contributors.',
  'Distributed under the Mozilla Public License 2.0.',
  'Modified JavaScript glue, 2026-11-07: adds getTaichungHeapU8(), a getter for the current private heap view.',
  'The WebAssembly core is unmodified. No game memory is changed by the getter.',
  `Original npm mgba.js SHA-256: ${expectedGlueSha256}`,
  'Reproducible modification: https://github.com/peteryushunli/taichung-quest/blob/main/web/scripts/prepare-emulator.mjs',
  'This served mgba.js is the complete corresponding modified glue source.',
  'Preferred reproducible patch script is also served at /emulator/prepare-emulator.mjs.',
  'Corresponding source: https://github.com/thenick775/mgba/tree/c0d196432c4437ff06827dccd1a785de2afab5b8',
  'License: https://www.mozilla.org/MPL/2.0/',
  '',
].join('\n'));
console.log('Prepared same-origin mGBA runtime.');
