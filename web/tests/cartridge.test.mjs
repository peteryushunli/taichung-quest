import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { verifyCartridge } from '../scripts/verify-cartridge.mjs';

const geometry = JSON.parse(await readFile(new URL('../src/data/minimap-contract.json', import.meta.url), 'utf8'));
async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), 'taichung-cartridge-'));
  const rom = Buffer.alloc(192);
  rom[0xb2] = 0x96;
  const metadata = {
    file: 'taichung-firered.gba', bytes: rom.length,
    sha256: createHash('sha256').update(rom).digest('hex'),
    sha1: createHash('sha1').update(rom).digest('hex'), sourceCommit: 'a'.repeat(40),
    languageBridge: { version: 1, size: 32, address: 0x0203f470, magicA: 0x414c4354, magicB: 0x3130474e },
    navigationBridge: { version: 1, size: 48, address: 0x0203f494, magicA: 0x414e4354, magicB: 0x31303056 },
    minimap: { schemaVersion: 1, geometryFingerprintSha256: geometry.geometryFingerprintSha256 },
  };
  await writeFile(path.join(directory, 'taichung-firered.gba'), rom);
  const writeMetadata = (value) => writeFile(path.join(directory, 'build.json'), JSON.stringify(value));
  return { directory, metadata, writeMetadata };
}

test('deployment refuses absent, mismatched or unsupported cartridge metadata', async () => {
  const { directory, metadata, writeMetadata } = await fixture();
  try {
    await assert.rejects(verifyCartridge(directory), /Missing cartridge/);
    await writeMetadata(metadata);
    assert.equal((await verifyCartridge(directory)).sha256, metadata.sha256);
    await writeMetadata({ ...metadata, sha256: '0'.repeat(64) });
    await assert.rejects(verifyCartridge(directory), /does not match/);
    await writeMetadata({ ...metadata, languageBridge: { ...metadata.languageBridge, address: 0x0203f471 } });
    await assert.rejects(verifyCartridge(directory), /language-bridge metadata/);
    await writeMetadata(null);
    await assert.rejects(verifyCartridge(directory), /does not match/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('deployment requires supported navigation metadata without hardcoding a build address', async () => {
  const { directory, metadata, writeMetadata } = await fixture();
  try {
    for (const navigationBridge of [undefined, null, ...[
      { version: 2 }, { size: 32 }, { magicA: 0 }, { magicB: 0 },
      { address: 0x08000000 }, { address: 0x0203fff0 }, { address: 0x02000001 }, { address: '0x0203f494' },
    ].map((change) => ({ ...metadata.navigationBridge, ...change }))]) {
      await writeMetadata({ ...metadata, navigationBridge });
      await assert.rejects(verifyCartridge(directory), /navigation-bridge metadata/);
    }
    const moved = { ...metadata, navigationBridge: { ...metadata.navigationBridge, address: 0x0203e000 } };
    await writeMetadata(moved);
    assert.equal((await verifyCartridge(directory)).navigationBridge.address, moved.navigationBridge.address);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('deployment binds the bundled geometry and rejects missing, mismatched or stale layouts', async () => {
  const { directory, metadata, writeMetadata } = await fixture();
  const geometryFile = path.join(directory, 'geometry.json');
  try {
    for (const minimap of [undefined, null, {}, { ...metadata.minimap, schemaVersion: 2 }, { ...metadata.minimap, geometryFingerprintSha256: '0'.repeat(64) }]) {
      await writeMetadata({ ...metadata, minimap });
      await assert.rejects(verifyCartridge(directory), /minimap metadata/);
    }
    await writeMetadata(metadata);
    await assert.rejects(verifyCartridge(directory, { geometryFile }), /Bundled minimap geometry/);
    const wrongLayout = structuredClone(geometry);
    wrongLayout.mapsByNativeKey['43:2'].height++;
    await writeFile(geometryFile, JSON.stringify(wrongLayout));
    await assert.rejects(verifyCartridge(directory, { geometryFile }), /stale layout fingerprint/);
    await writeFile(geometryFile, JSON.stringify({ ...geometry, schemaVersion: 2 }));
    await assert.rejects(verifyCartridge(directory, { geometryFile }), /Bundled minimap geometry/);
    // Native source provenance can refresh without changing authored geometry.
    await writeFile(geometryFile, JSON.stringify({ ...geometry, sourceSha256: { 'refreshed-source': 'a'.repeat(64) } }));
    assert.equal((await verifyCartridge(directory, { geometryFile })).sha256, metadata.sha256);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('legacy cartridges remain valid while optional onboarding metadata must match its bounded protocol', async () => {
  const { directory, metadata, writeMetadata } = await fixture();
  const onboardingBridge = { version: 1, size: 48, address: 0x0203d000, magicA: 0x4e494354, magicB: 0x314f5254 };
  try {
    await writeMetadata(metadata);
    assert.equal((await verifyCartridge(directory)).onboardingBridge, undefined);
    await writeMetadata({ ...metadata, onboardingBridge });
    assert.deepEqual((await verifyCartridge(directory)).onboardingBridge, onboardingBridge);
    for (const change of [{ version: 2 }, { size: 32 }, { magicA: 0 }, { address: 0x0203fff0 }, { address: 0x02000001 }]) {
      await writeMetadata({ ...metadata, onboardingBridge: { ...onboardingBridge, ...change } });
      await assert.rejects(verifyCartridge(directory), /onboarding-bridge metadata/);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
