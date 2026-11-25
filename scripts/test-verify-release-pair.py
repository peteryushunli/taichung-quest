#!/usr/bin/env python3
"""Real Git/binutils tests using synthetic ELF/ROM files; no native compilation."""

import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).with_name('verify-release-pair.py')
SPEC = importlib.util.spec_from_file_location('release_pair', SCRIPT)
PAIR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PAIR)


def binutils_directory():
    if os.environ.get('TAICHUNG_BINUTILS'):
        return Path(os.environ['TAICHUNG_BINUTILS'])
    for parent in SCRIPT.parents:
        directory = parent / '.tools/binutils/arm-none-eabi-binutils/2.47/bin'
        if (directory / 'arm-none-eabi-nm').is_file():
            return directory
    executable = shutil.which('arm-none-eabi-nm')
    if executable:
        return Path(executable).parent
    raise RuntimeError('Set TAICHUNG_BINUTILS to the installed ARM binutils directory')


def synthetic_elf(text, symbols):
    """Small ARM ELF32 executable, assembled directly as a fixture, never runnable game code."""
    image = bytearray(52)

    def append(data):
        image.extend(b'\0' * (-len(image) % 4))
        offset = len(image)
        image.extend(data)
        return offset

    strings = bytearray(b'\0')
    table = bytearray(16)
    for name, address, size in symbols:
        name_offset = len(strings)
        strings.extend(name.encode('ascii') + b'\0')
        table.extend(struct.pack('<IIIBBH', name_offset, address, size, 0x11, 0, 2))
    text_offset = append(text)
    table_offset = append(table)
    strings_offset = append(strings)
    section_names = b'\0.text\0.bss\0.symtab\0.strtab\0.shstrtab\0'
    names_offset = append(section_names)
    image.extend(b'\0' * (-len(image) % 4))
    section_offset = len(image)
    sections = [
        (0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        (1, 1, 6, 0x08000000, text_offset, len(text), 0, 0, 4, 0),
        (7, 8, 3, 0x0203E000, 0, 0x200, 0, 0, 4, 0),
        (12, 2, 0, 0, table_offset, len(table), 4, 1, 4, 16),
        (20, 3, 0, 0, strings_offset, len(strings), 0, 0, 1, 0),
        (28, 3, 0, 0, names_offset, len(section_names), 0, 0, 1, 0),
    ]
    for section in sections:
        image.extend(struct.pack('<10I', *section))
    ident = b'\x7fELF\x01\x01\x01' + bytes(9)
    image[:52] = struct.pack('<16sHHIIIIIHHHHHH', ident, 2, 40, 1, 0x08000000,
                             0, section_offset, 0x05000000, 52, 0, 0, 40, 6, 5)
    return bytes(image)


class ReleasePairTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.binutils = binutils_directory()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='pair-tool-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / 'native'
        self.source.mkdir()
        self.git('init', '-q')
        self.git('config', 'user.name', 'Pair verifier fixture')
        self.git('config', 'user.email', 'fixture@example.invalid')
        self.git('config', 'core.autocrlf', 'false')
        (self.source / 'README').write_bytes(b'Baseline source fixture\n')
        (self.source / 'data').mkdir()
        (self.source / 'data/map.bin').write_bytes(b'geometry fixture, not a game map\n')
        self.commit('baseline')
        self.upstream = self.git('rev-parse', 'HEAD').strip().decode()
        self.native_contract = self.source / PAIR.NATIVE_CONTRACT
        self.native_contract.parent.mkdir(parents=True)
        self.contract = dict(schemaVersion=1, coordinateSystem=dict(x='right', y='down'),
                             world=dict(width=2, height=2), mapsByNativeKey={},
                             markersById={}, seams=[],
                             sourceSha256={'data/map.bin': PAIR.sha256((self.source / 'data/map.bin').read_bytes())})
        self.fingerprint()
        self.native_contract.write_bytes(PAIR.json_bytes(self.contract))
        (self.source / 'sprite.bin').write_bytes(bytes(range(256)))
        self.commit('registered minimap fixture')
        self.head = self.git('rev-parse', 'HEAD').strip().decode()
        self.web = self.root / 'web-contract.json'
        self.web.write_bytes(PAIR.json_bytes(self.contract))
        self.patch = self.root / 'taichung.patch'
        self.patch.write_bytes(self.git('diff', '--binary', self.upstream, 'HEAD'))
        self.rom = self.root / 'taichung-firered.gba'
        self.text = b'Explicit synthetic ELF/ROM fixture; NOT a playable cartridge.\n'
        self.rom.write_bytes(self.text + b'\xff' * (0x1000000 - len(self.text)))
        self.symbols = [(packet[0], 0x0203E000 + i * 0x40, packet[1])
                        for i, packet in enumerate(PAIR.BRIDGES.values())]
        self.elf = self.root / 'taichung-firered.elf'
        self.elf.write_bytes(synthetic_elf(self.text, self.symbols))
        self.metadata = self.root / 'build.json'
        rom = self.rom.read_bytes()
        self.build = dict(file=self.rom.name, bytes=len(rom), sha256=PAIR.sha256(rom),
                          sha1=hashlib.sha1(rom).hexdigest(), sourceCommit=self.head,
                          upstreamCommit=self.upstream, modified=True,
                          minimap=dict(schemaVersion=1, geometryFingerprintSha256=self.contract['geometryFingerprintSha256']))
        for i, (key, (name, size, version, a, b)) in enumerate(PAIR.BRIDGES.items()):
            self.build[key] = dict(address=self.symbols[i][1], size=size, version=version, magicA=a, magicB=b)
        self.save_metadata()

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.source), *args], stderr=subprocess.PIPE)

    def commit(self, message):
        self.git('add', '.')
        self.git('commit', '-qm', message)

    def fingerprint(self):
        self.contract['geometryFingerprintSha256'] = PAIR.sha256(PAIR.canonical(
            {key: self.contract[key] for key in PAIR.GEOMETRY_KEYS}))

    def save_metadata(self):
        self.metadata.write_bytes(PAIR.json_bytes(self.build))

    def verify(self):
        index = (self.source / '.git/index').read_bytes()
        objects = sorted(str(p.relative_to(self.source / '.git/objects'))
                         for p in (self.source / '.git/objects').rglob('*') if p.is_file())
        try:
            return PAIR.verify_pair(native=self.source, rom=self.rom, metadata=self.metadata,
                                    elf=self.elf, web_contract=self.web, patch=self.patch,
                                    binutils=self.binutils, upstream_commit=self.upstream)
        finally:
            self.assertEqual((self.source / '.git/index').read_bytes(), index)
            self.assertEqual(sorted(str(p.relative_to(self.source / '.git/objects'))
                                    for p in (self.source / '.git/objects').rglob('*') if p.is_file()), objects)

    def test_real_git_objcopy_symbols_and_deterministic_freeze(self):
        receipt, payload = self.verify()
        self.assertTrue(receipt['elf']['independentObjcopyByteExact'])
        self.assertIn(b'GIT binary patch', self.patch.read_bytes())
        self.assertEqual(receipt['portablePatch']['recreatedTree'], self.git('rev-parse', 'HEAD^{tree}').decode().strip())
        self.assertEqual(receipt['minimap']['sourceFilesVerified'], 1)
        for name, raw in payload.items():
            self.assertEqual(receipt['inputs'][name], dict(bytes=len(raw), sha256=PAIR.sha256(raw)))
        for name in ['first', 'second']:
            PAIR.write_output(receipt, payload, freeze_dir=self.root / name, native=self.source)
        self.assertEqual((self.root / 'first/manifest.json').read_bytes(), (self.root / 'second/manifest.json').read_bytes())
        manifest = json.loads((self.root / 'first/manifest.json').read_bytes())
        for entry in manifest['files']:
            raw = (self.root / 'first' / entry['path']).read_bytes()
            self.assertEqual((len(raw), PAIR.sha256(raw)), (entry['bytes'], entry['sha256']))

    def test_dirty_staged_and_untracked_source_are_rejected(self):
        for mode in ['tracked', 'staged', 'untracked']:
            with self.subTest(mode=mode):
                path = self.source / ('new.c' if mode == 'untracked' else 'README')
                original = path.read_bytes() if path.exists() else None
                path.write_bytes(b'unreviewed source')
                if mode == 'staged':
                    self.git('add', 'README')
                with self.assertRaisesRegex(PAIR.PairError, 'Native source is dirty'):
                    self.verify()
                if original is None:
                    path.unlink()
                else:
                    path.write_bytes(original)
                if mode == 'staged':
                    self.git('add', 'README')

    def test_source_metadata_mismatch(self):
        self.build['sourceCommit'] = self.upstream
        self.save_metadata()
        with self.assertRaisesRegex(PAIR.PairError, 'sourceCommit'):
            self.verify()

    def test_optional_source_tree_is_enforced(self):
        self.build['sourceTree'] = '0' * 40
        self.save_metadata()
        with self.assertRaisesRegex(PAIR.PairError, 'sourceTree'):
            self.verify()

    def test_rom_byte_digest_and_count_negatives(self):
        for mutation in ['digest', 'size', 'bool-size']:
            with self.subTest(mutation=mutation):
                previous = copy.deepcopy(self.build)
                self.build['sha256' if mutation == 'digest' else 'bytes'] = (
                    '0' * 64 if mutation == 'digest' else True if mutation == 'bool-size' else 123)
                self.save_metadata()
                with self.assertRaisesRegex(PAIR.PairError, 'ROM digest|ROM byte count'):
                    self.verify()
                self.build = previous
        self.save_metadata()
        raw = bytearray(self.rom.read_bytes())
        raw[0] ^= 1
        self.rom.write_bytes(raw)
        with self.assertRaisesRegex(PAIR.PairError, 'ROM digest'):
            self.verify()

    def test_actual_other_elf_rom_is_rejected(self):
        self.elf.write_bytes(synthetic_elf(b'other compiled input', self.symbols))
        with self.assertRaisesRegex(PAIR.PairError, 'ELF reconstruction differs'):
            self.verify()

    def test_optional_elf_hash_is_enforced(self):
        self.build['elfSha256'] = '0' * 64
        self.save_metadata()
        with self.assertRaisesRegex(PAIR.PairError, 'ELF digest mismatch'):
            self.verify()

    def test_each_metadata_bridge_address_size_and_magic_is_checked(self):
        for key in PAIR.BRIDGES:
            for field in ['address', 'size', 'magicA', 'version']:
                with self.subTest(key=key, field=field):
                    original = self.build[key][field]
                    self.build[key][field] += 4
                    self.save_metadata()
                    with self.assertRaisesRegex(PAIR.PairError, 'metadata does not match ELF'):
                        self.verify()
                    self.build[key][field] = original

    def test_invalid_elf_packet_not_blessed_by_matching_metadata(self):
        for address, size in [(0x0203E001, 32), (0x0203FFF0, 32), (0x0203E000, 64)]:
            with self.subTest(address=address, size=size):
                symbols = self.symbols[:]
                symbols[0] = (symbols[0][0], address, size)
                self.elf.write_bytes(synthetic_elf(self.text, symbols))
                self.build['languageBridge'].update(address=address, size=size)
                self.save_metadata()
                with self.assertRaisesRegex(PAIR.PairError, 'incompatible ELF'):
                    self.verify()

    def test_duplicate_missing_and_unregistered_bridge_symbols(self):
        for symbols in [self.symbols + [self.symbols[0]], self.symbols[1:],
                        self.symbols + [('gTaichungUnregisteredBridge', 0x0203E100, 64)]]:
            with self.subTest(symbols=symbols):
                self.elf.write_bytes(synthetic_elf(self.text, symbols))
                with self.assertRaisesRegex(PAIR.PairError, 'expected one sized ELF|Unregistered bridge'):
                    self.verify()

    def test_encounter_exact_agreed_64_byte_abi(self):
        expected = dict(address=0x0203E140, size=64, version=1,
                        magicA=0x4E454354, magicB=0x31525443)
        self.build['encounterBridge'] = expected.copy()
        symbols = [row for row in self.symbols if row[0] != 'gTaichungEncounterBridge']
        symbols.append(('gTaichungEncounterBridge', 0x0203E140, 64))
        self.elf.write_bytes(synthetic_elf(self.text, symbols))
        self.save_metadata()
        receipt, _ = self.verify()
        self.assertEqual(receipt['bridges']['encounterBridge'],
                         dict(symbol='gTaichungEncounterBridge', **expected))
        for size in [32, 48, 68]:
            with self.subTest(size=size):
                symbols[-1] = ('gTaichungEncounterBridge', 0x0203E140, size)
                self.elf.write_bytes(synthetic_elf(self.text, symbols))
                self.build['encounterBridge']['size'] = size
                self.save_metadata()
                with self.assertRaisesRegex(PAIR.PairError, 'encounterBridge: incompatible ELF'):
                    self.verify()

    def test_encounter_absent_only_when_both_sides_are_absent(self):
        without_symbol = [row for row in self.symbols if row[0] != 'gTaichungEncounterBridge']
        self.elf.write_bytes(synthetic_elf(self.text, without_symbol))
        with self.assertRaisesRegex(PAIR.PairError, 'encounterBridge: expected one sized ELF'):
            self.verify()
        del self.build['encounterBridge']
        self.save_metadata()
        receipt, _ = self.verify()
        self.assertNotIn('encounterBridge', receipt['bridges'])
        self.elf.write_bytes(synthetic_elf(self.text, self.symbols))
        with self.assertRaisesRegex(PAIR.PairError, 'encounterBridge: metadata does not match ELF'):
            self.verify()

    def test_badge_absence_mismatch_and_overlap_are_rejected(self):
        without_badge = [row for row in self.symbols if row[0] != 'gTaichungBadgeBridge']
        self.elf.write_bytes(synthetic_elf(self.text, without_badge))
        with self.assertRaisesRegex(PAIR.PairError, 'badgeBridge: expected one sized ELF'):
            self.verify()
        packet = self.build.pop('badgeBridge')
        self.save_metadata()
        receipt, _ = self.verify()
        self.assertNotIn('badgeBridge', receipt['bridges'])
        self.elf.write_bytes(synthetic_elf(self.text, self.symbols))
        with self.assertRaisesRegex(PAIR.PairError, 'badgeBridge: metadata does not match ELF'):
            self.verify()
        # Matching metadata cannot bless overlapping native packet storage.
        address = self.build['languageBridge']['address']
        self.build['badgeBridge'] = dict(packet, address=address)
        self.save_metadata()
        symbols = without_badge + [('gTaichungBadgeBridge', address, 32)]
        self.elf.write_bytes(synthetic_elf(self.text, symbols))
        with self.assertRaisesRegex(PAIR.PairError, 'badgeBridge: bridge storage overlaps'):
            self.verify()

    def test_web_contract_differs_even_with_identical_fingerprint(self):
        other = copy.deepcopy(self.contract)
        other['policy'] = {'wrong': 'not part of the geometry fingerprint'}
        self.web.write_bytes(PAIR.json_bytes(other))
        with self.assertRaisesRegex(PAIR.PairError, 'Native/web minimap contracts differ'):
            self.verify()

    def test_badge_presentation_matches_the_committed_ten_slot_layout(self):
        ids = ['station','park','miyahara','science','greenway','confucius','arts','fengjia','wanhe','theater']
        manifest = dict(schemaVersion=1, assetSetId='explicit-test-art-set',
                        badges=[dict(gymIndex=i, completionBit=i, landmarkId=name) for i,name in enumerate(ids)])
        path = self.source / 'data/taichung/story-confucius/badge-display-manifest-v1.json'
        path.parent.mkdir(parents=True)
        path.write_bytes(PAIR.json_bytes(manifest))
        self.commit('register explicit badge display fixture')
        self.build['sourceCommit'] = self.git('rev-parse','HEAD').decode().strip()
        self.patch.write_bytes(self.git('diff','--binary',self.upstream,'HEAD'))
        presentation = dict(schemaVersion=1,assetSetId='explicit-test-art-set',gymIds=ids)
        self.build['badgePresentation'] = copy.deepcopy(presentation)
        self.save_metadata()
        receipt,_ = self.verify()
        self.assertEqual(receipt['badgePresentation']['gymIds'],ids)
        self.assertEqual(receipt['badgePresentation']['sourceManifestSha256'],PAIR.sha256(path.read_bytes()))
        for change in [dict(schemaVersion=True),dict(assetSetId='wrong-art-set'),
                       dict(gymIds=ids[:5]+['old-shen-ji']+ids[6:]),dict(extra='unregistered')]:
            with self.subTest(change=change):
                self.build['badgePresentation'] = {**presentation,**change}
                self.save_metadata()
                with self.assertRaisesRegex(PAIR.PairError,'Badge presentation differs'):
                    self.verify()

    def test_metadata_geometry_binding_is_checked(self):
        self.build['minimap']['geometryFingerprintSha256'] = '0' * 64
        self.save_metadata()
        with self.assertRaisesRegex(PAIR.PairError, 'Metadata minimap binding differs'):
            self.verify()

    def test_identical_native_web_stale_fingerprint_is_rejected(self):
        self.contract['world']['width'] = 99
        self.native_contract.write_bytes(PAIR.json_bytes(self.contract))
        self.web.write_bytes(PAIR.json_bytes(self.contract))
        self.commit('bad stale geometry fixture')
        self.build['sourceCommit'] = self.git('rev-parse', 'HEAD').decode().strip()
        self.save_metadata()
        with self.assertRaisesRegex(PAIR.PairError, 'fingerprint does not match actual geometry'):
            self.verify()

    def test_identical_contracts_stale_native_source_pin_is_rejected(self):
        (self.source / 'data/map.bin').write_bytes(b'new committed map without a contract refresh')
        self.commit('changed geometry fixture')
        self.build['sourceCommit'] = self.git('rev-parse', 'HEAD').decode().strip()
        self.save_metadata()
        with self.assertRaisesRegex(PAIR.PairError, 'Stale minimap source hash'):
            self.verify()

    def test_duplicate_json_key_is_rejected(self):
        self.metadata.write_bytes(self.metadata.read_bytes().replace(b'"bytes":', b'"bytes": 0, "bytes":', 1))
        with self.assertRaisesRegex(PAIR.PairError, 'duplicate JSON key'):
            self.verify()

    def test_nonfinite_json_is_rejected(self):
        original = self.metadata.read_bytes()
        for token in [b'NaN', b'Infinity', b'1e999']:
            self.metadata.write_bytes(original[:-2] + b', "invalid": ' + token + b'}\n')
            with self.subTest(token=token), self.assertRaisesRegex(PAIR.PairError, 'non-finite'):
                self.verify()

    def test_patch_must_recreate_whole_committed_tree(self):
        for patch in [b'', self.git('diff', '--binary', self.upstream, 'HEAD', '--', PAIR.NATIVE_CONTRACT)]:
            with self.subTest(patch=bool(patch)):
                self.patch.write_bytes(patch)
                with self.assertRaisesRegex(PAIR.PairError, 'Portable patch tree mismatch'):
                    self.verify()

    def test_output_refuses_overwrite_and_native_tree(self):
        receipt, payload = self.verify()
        destination = self.root / 'receipt.json'
        PAIR.write_output(receipt, payload, receipt_path=destination, native=self.source)
        previous = destination.read_bytes()
        with self.assertRaisesRegex(PAIR.PairError, 'Output already exists'):
            PAIR.write_output(receipt, payload, receipt_path=destination, native=self.source)
        self.assertEqual(destination.read_bytes(), previous)
        with self.assertRaisesRegex(PAIR.PairError, 'outside the native'):
            PAIR.write_output(receipt, payload, freeze_dir=self.source / 'output', native=self.source)
        self.assertFalse((self.source / 'output').exists())


if __name__ == '__main__':
    unittest.main()
