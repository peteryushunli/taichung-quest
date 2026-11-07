#!/usr/bin/env python3
"""Exercise build-game.sh's real metadata block without make or a ROM build."""

import contextlib
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).with_name('build-game.sh')
METADATA_CODE = SCRIPT.read_text().split("<<'PY'\n", 1)[1].rsplit('\nPY', 1)[0]
LANGUAGE = '0203e000 00000020 B gTaichungLanguageBridge'
NAVIGATION = '0203d080 00000030 B gTaichungNavigationBridge'
BASELINE = '1' * 40
SOURCE_COMMIT = '2' * 40
FINGERPRINT = 'a' * 64


class MetadataTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='taichung-metadata-')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.source = self.root / 'selected-worktree'
        self.contract = self.source / 'data/taichung/minimap-contract.json'
        self.contract.parent.mkdir(parents=True)
        self.output = self.root / 'output'
        self.output.mkdir()
        self.rom = self.output / 'taichung-firered.gba'
        self.rom.write_bytes(b'explicit metadata fixture, not a playable ROM')
        self.build = self.output / 'build.json'
        self.build.write_bytes(b'previous metadata must survive validation failure\n')
        self.write_contract()

    def write_contract(self, **changes):
        contract = {'schemaVersion': 1, 'geometryFingerprintSha256': FINGERPRINT}
        contract.update(changes)
        self.contract.write_text(json.dumps(contract))

    def run_metadata(self, symbols):
        def check_output(command, **kwargs):
            self.assertTrue(kwargs.get('text'))
            if command[:3] == ['git', '-C', str(self.source)]:
                operation = command[3:]
                if operation == ['rev-parse', 'HEAD']:
                    return SOURCE_COMMIT + '\n'
                if operation == ['diff', '--name-only', BASELINE]:
                    return 'src/taichung_navigation_bridge.c\n'
                if operation == ['status', '--porcelain']:
                    return ''
            if command == ['arm-none-eabi-nm', '--defined-only', '--print-size', str(self.source / 'pokefirered.elf')]:
                return symbols
            self.fail(f'Unexpected external command: {command}')

        with patch.object(sys, 'argv', ['metadata', str(self.source), str(self.output), BASELINE]), \
                patch.object(subprocess, 'check_output', side_effect=check_output), \
                contextlib.redirect_stdout(io.StringIO()):
            exec(compile(METADATA_CODE, str(SCRIPT) + ':metadata', 'exec'), {})
        return json.loads(self.build.read_text())

    def assert_rejected(self, symbols):
        previous = self.build.read_bytes()
        with self.assertRaises(SystemExit):
            self.run_metadata(symbols)
        self.assertEqual(self.build.read_bytes(), previous)

    def test_language_only_omits_navigation_and_does_not_require_contract(self):
        self.contract.unlink()
        metadata = self.run_metadata(LANGUAGE)
        self.assertNotIn('navigationBridge', metadata)
        self.assertNotIn('minimap', metadata)
        self.assertEqual(metadata['languageBridge'], {
            'version': 1, 'size': 32, 'address': 0x0203E000,
            'magicA': 0x414C4354, 'magicB': 0x3130474E,
        })
        self.assertEqual(metadata['sha256'], hashlib.sha256(self.rom.read_bytes()).hexdigest())
        self.assertEqual(metadata['bytes'], self.rom.stat().st_size)
        self.assertEqual(metadata['sourceCommit'], SOURCE_COMMIT)
        self.assertEqual(metadata['upstreamCommit'], BASELINE)
        self.assertTrue(metadata['modified'])

    def test_navigation_binds_selected_source_and_independent_symbol_order(self):
        for symbols in [LANGUAGE + '\n' + NAVIGATION, NAVIGATION + '\n' + LANGUAGE]:
            with self.subTest(symbols=symbols):
                metadata = self.run_metadata(symbols)
                self.assertEqual(metadata['navigationBridge'], {
                    'version': 1, 'size': 48, 'address': 0x0203D080,
                    'magicA': 0x414E4354, 'magicB': 0x31303056,
                })
                self.assertEqual(metadata['minimap'], {
                    'schemaVersion': 1, 'geometryFingerprintSha256': FINGERPRINT,
                })
                self.assertEqual(metadata['languageBridge']['size'], 32)
        self.write_contract(geometryFingerprintSha256='b' * 64)
        metadata = self.run_metadata('02000000 00000030 B gTaichungNavigationBridge')
        self.assertEqual(metadata['navigationBridge']['address'], 0x02000000)
        self.assertEqual(metadata['minimap']['geometryFingerprintSha256'], 'b' * 64)
        metadata = self.run_metadata('0203ffd0 00000030 B gTaichungNavigationBridge')
        self.assertEqual(metadata['navigationBridge']['address'], 0x02040000 - 48)

    def test_incompatible_symbols_do_not_write_metadata(self):
        for symbol in [
            '0203d080 00000020 B gTaichungNavigationBridge',
            '0203d080 00000034 B gTaichungNavigationBridge',
            '0203d081 00000030 B gTaichungNavigationBridge',
            '01fffffc 00000030 B gTaichungNavigationBridge',
            '0203ffd4 00000030 B gTaichungNavigationBridge',
            '08000000 00000030 B gTaichungNavigationBridge',
            'nothex 00000030 B gTaichungNavigationBridge',
            '0203d080 B gTaichungNavigationBridge',
            NAVIGATION + '\n' + NAVIGATION,
        ]:
            with self.subTest(symbol=symbol):
                self.assert_rejected(LANGUAGE + '\n' + symbol)

    def test_missing_malformed_or_incompatible_contract_does_not_write_metadata(self):
        for document in [
            None, '{not JSON', 'null', '[]',
            {'schemaVersion': 2, 'geometryFingerprintSha256': FINGERPRINT},
            {'schemaVersion': True, 'geometryFingerprintSha256': FINGERPRINT},
            {'schemaVersion': 1.0, 'geometryFingerprintSha256': FINGERPRINT},
            {'schemaVersion': '1', 'geometryFingerprintSha256': FINGERPRINT},
            {'schemaVersion': 1},
            {'schemaVersion': 1, 'geometryFingerprintSha256': None},
            {'schemaVersion': 1, 'geometryFingerprintSha256': 'a' * 63},
            {'schemaVersion': 1, 'geometryFingerprintSha256': 'G' * 64},
            {'schemaVersion': 1, 'geometryFingerprintSha256': 'A' * 64},
        ]:
            with self.subTest(document=document):
                if document is None:
                    self.contract.unlink(missing_ok=True)
                else:
                    self.contract.write_text(document if isinstance(document, str) else json.dumps(document))
                self.assert_rejected(NAVIGATION)


if __name__ == '__main__':
    unittest.main()
