import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { verifyCartridge } from '../scripts/verify-cartridge.mjs';

test('deployment refuses absent, mismatched or unsupported cartridge metadata', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'taichung-cartridge-'));
  try {
    await assert.rejects(verifyCartridge(directory), /Missing cartridge/);
    const rom = Buffer.alloc(192);
    rom[0xb2] = 0x96;
    const metadata = {
      file: 'taichung-firered.gba', bytes: rom.length,
      sha256: createHash('sha256').update(rom).digest('hex'),
      sha1: createHash('sha1').update(rom).digest('hex'), sourceCommit: 'a'.repeat(40),
      languageBridge: { version: 1, size: 32, address: 0x0203f470, magicA: 0x414c4354, magicB: 0x3130474e },
    };
    await writeFile(path.join(directory, 'taichung-firered.gba'), rom);
    await writeFile(path.join(directory, 'build.json'), JSON.stringify(metadata));
    assert.equal((await verifyCartridge(directory)).sha256, metadata.sha256);
    await writeFile(path.join(directory, 'build.json'), JSON.stringify({ ...metadata, sha256: '0'.repeat(64) }));
    await assert.rejects(verifyCartridge(directory), /does not match/);
    await writeFile(path.join(directory, 'build.json'), JSON.stringify({ ...metadata, languageBridge: { ...metadata.languageBridge, address: 0x0203f471 } }));
    await assert.rejects(verifyCartridge(directory), /language-bridge metadata/);
    await writeFile(path.join(directory, 'build.json'), 'null');
    await assert.rejects(verifyCartridge(directory), /does not match/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
