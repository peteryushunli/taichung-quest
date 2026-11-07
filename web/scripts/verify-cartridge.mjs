import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function verifyCartridge(directory) {
  let rom, metadata;
  try {
    [rom, metadata] = await Promise.all([
      readFile(path.join(directory, 'taichung-firered.gba')),
      readFile(path.join(directory, 'build.json'), 'utf8').then(JSON.parse),
    ]);
  } catch {
    throw new Error('Missing cartridge or build.json. Build the game, or copy Main’s frozen ROM and matching metadata together. Generated ROMs are intentionally absent from Git.');
  }
  const sha256 = createHash('sha256').update(rom).digest('hex');
  if (!metadata || typeof metadata !== 'object' || rom.length < 192 || rom.length > 32 * 1024 * 1024 || rom[0xb2] !== 0x96 ||
      metadata.file !== 'taichung-firered.gba' || metadata.bytes !== rom.length || metadata.sha256 !== sha256 ||
      metadata.sha1 !== createHash('sha1').update(rom).digest('hex') || !/^[a-f\d]{40}$/.test(metadata.sourceCommit)) {
    throw new Error('Cartridge header, digest, size or source metadata does not match. Use a single frozen release pair; do not deploy mixed ROM/build.json files.');
  }
  const packet = metadata.languageBridge;
  if (!packet || packet.version !== 1 || packet.size !== 32 || packet.magicA !== 0x414c4354 || packet.magicB !== 0x3130474e ||
      !Number.isInteger(packet.address) || packet.address % 4 || packet.address < 0x02000000 || packet.address > 0x02040000 - 32) {
    throw new Error('The release requires matching version-1 native language-bridge metadata.');
  }
  return metadata;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const directory = process.argv[2] ?? fileURLToPath(new URL('../public/roms/', import.meta.url));
    const metadata = await verifyCartridge(directory);
    console.log(`Verified cartridge: ${metadata.bytes} bytes, SHA-256 ${metadata.sha256}.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
