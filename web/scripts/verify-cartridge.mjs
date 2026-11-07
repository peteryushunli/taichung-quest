import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const geometryFields = ['schemaVersion', 'coordinateSystem', 'world', 'mapsByNativeKey', 'markersById', 'seams'];
const bundledGeometry = new URL('../src/data/minimap-contract.json', import.meta.url);
// Match the native exporter's sorted UTF-8 JSON fingerprint, excluding source provenance.
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;

export async function verifyCartridge(directory, { geometryFile = bundledGeometry } = {}) {
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
  const navigation = metadata.navigationBridge;
  if (!navigation || navigation.version !== 1 || navigation.size !== 48 || navigation.magicA !== 0x414e4354 || navigation.magicB !== 0x31303056 ||
      !Number.isInteger(navigation.address) || navigation.address % 4 || navigation.address < 0x02000000 || navigation.address > 0x02040000 - 48) {
    throw new Error('The release requires matching version-1 native navigation-bridge metadata.');
  }
  let geometry;
  try {
    geometry = JSON.parse(await readFile(geometryFile, 'utf8'));
    if (!geometry || geometry.schemaVersion !== 1 || !geometryFields.every((key) => Object.hasOwn(geometry, key)) ||
        typeof geometry.geometryFingerprintSha256 !== 'string' || !/^[a-f\d]{64}$/.test(geometry.geometryFingerprintSha256)) throw new Error();
    const layout = Object.fromEntries(geometryFields.map((key) => [key, geometry[key]]));
    const fingerprint = createHash('sha256').update(JSON.stringify(canonical(layout))).digest('hex');
    if (fingerprint !== geometry.geometryFingerprintSha256) throw new Error();
  } catch {
    throw new Error('Bundled minimap geometry is missing, unsupported or has a stale layout fingerprint. Use Main’s authoritative export.');
  }
  if (!metadata.minimap || metadata.minimap.schemaVersion !== geometry.schemaVersion ||
      metadata.minimap.geometryFingerprintSha256 !== geometry.geometryFingerprintSha256) {
    throw new Error('The release minimap metadata does not match the bundled geometry schema/fingerprint.');
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
