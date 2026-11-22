#!/usr/bin/env python3
"""Verify a committed native release pair; never build, export dirty source, or deploy."""

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import struct
import subprocess
import sys
import tempfile


UPSTREAM = 'ce6406d8c2eaf46d543c8a2606de0c3cb1951982'
NATIVE_CONTRACT = 'data/taichung/minimap-contract.json'
GEOMETRY_KEYS = ('schemaVersion', 'coordinateSystem', 'world',
                 'mapsByNativeKey', 'markersById', 'seams')
# Register new packets only after their native and browser contracts are agreed.
BRIDGES = {
    'languageBridge': ('gTaichungLanguageBridge', 32, 1, 0x414C4354, 0x3130474E),
    'navigationBridge': ('gTaichungNavigationBridge', 48, 1, 0x414E4354, 0x31303056),
    'onboardingBridge': ('gTaichungOnboardingBridge', 48, 1, 0x4E494354, 0x314F5254),
    'encounterBridge': ('gTaichungEncounterBridge', 64, 1, 0x4E454354, 0x31525443),
}
OPTIONAL_BRIDGES = {'encounterBridge'}  # Pre-encounter releases have neither symbol nor metadata.
ADDITIONAL_BRIDGE_VERSIONS = {'navigationBridge': {52: 2}, 'encounterBridge': {72: 2}}


class PairError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise PairError(message)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'),
                      ensure_ascii=False, allow_nan=False).encode('utf-8')


def json_bytes(value):
    return json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False,
                      allow_nan=False).encode('utf-8') + b'\n'


def read_json(raw, label):
    def constant(value):
        raise PairError(f'{label}: non-finite JSON number {value}')

    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, f'{label}: duplicate JSON key {key!r}')
            result[key] = value
        return result

    try:
        value = json.loads(raw, object_pairs_hook=pairs, parse_constant=constant)
    except (UnicodeError, json.JSONDecodeError) as error:
        raise PairError(f'{label}: invalid JSON: {error}') from error
    require(type(value) is dict, f'{label}: expected a JSON object')
    try:
        canonical(value)
    except ValueError as error:
        raise PairError(f'{label}: invalid/non-finite JSON value') from error
    return value


def run(command, *, env=None):
    result = subprocess.run([str(part) for part in command], env=env,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    require(result.returncode == 0,
            f'{Path(str(command[0])).name} failed: '
            f'{result.stderr.decode("utf-8", "replace").strip()[:2000]}')
    return result.stdout


def git_environment():
    env = {key: value for key, value in os.environ.items() if not key.startswith('GIT_')}
    env.update(GIT_OPTIONAL_LOCKS='0', GIT_CONFIG_NOSYSTEM='1',
               GIT_CONFIG_GLOBAL=os.devnull)
    return env


def git(source, *args, env=None):
    return run(['git', '--no-optional-locks', '-c', 'core.fsmonitor=false',
                '-c', 'core.splitIndex=false', '-C', source, *args],
               env=env if env is not None else git_environment())


def native_state(source):
    require(git(source, 'rev-parse', '--show-toplevel').decode().strip() == str(source),
            'Native source must be the worktree root')
    require(not git(source, 'status', '--porcelain=v1', '--untracked-files=all'),
            'Native source is dirty (tracked, staged, or untracked files); commit reviewed inputs first')
    return {
        'commit': git(source, 'rev-parse', 'HEAD^{commit}').decode().strip(),
        'tree': git(source, 'rev-parse', 'HEAD^{tree}').decode().strip(),
    }


def git_path(source, name):
    path = Path(git(source, 'rev-parse', '--git-path', name).decode().strip())
    return path.resolve() if path.is_absolute() else (source / path).resolve()


def index_digest(source):
    path = git_path(source, 'index')
    return sha256(path.read_bytes()) if path.exists() else None


def verify_patch(source, patch, upstream, expected_tree, temporary):
    """Use private objects as well as a private index; no real Git writes."""
    env = git_environment()
    objects = temporary / 'objects'
    objects.mkdir()
    env.update(GIT_INDEX_FILE=str(temporary / 'index'),
               GIT_OBJECT_DIRECTORY=str(objects),
               GIT_ALTERNATE_OBJECT_DIRECTORIES=str(git_path(source, 'objects')))
    git(source, 'read-tree', upstream, env=env)
    if patch.read_bytes():
        git(source, 'apply', '--cached', '--binary', '--whitespace=nowarn', patch, env=env)
    tree = git(source, 'write-tree', env=env).decode().strip()
    require(tree == expected_tree,
            f'Portable patch tree mismatch: recreated {tree}, expected {expected_tree}')
    return tree


def verify_bridges(metadata, symbols):
    rows = {}
    for line in symbols.decode('ascii').splitlines():
        parts = line.split()
        if parts:
            rows.setdefault(parts[-1], []).append(parts)
    known = {packet[0] for packet in BRIDGES.values()}
    unknown = {key for key in metadata if key.endswith('Bridge')} - set(BRIDGES)
    unknown |= {name for name in rows if re.fullmatch(r'gTaichung\w*Bridge', name)} - known
    require(not unknown, f'Unregistered bridge contract(s): {sorted(unknown)}')
    result = {}
    ranges = []
    for key, (name, size, version, magic_a, magic_b) in BRIDGES.items():
        entries = rows.get(name, [])
        if key in OPTIONAL_BRIDGES and not entries and key not in metadata:
            continue
        require(len(entries) == 1 and len(entries[0]) == 4,
                f'{key}: expected one sized ELF symbol {name}')
        try:
            address, actual_size = (int(value, 16) for value in entries[0][:2])
        except ValueError as error:
            raise PairError(f'{key}: invalid ELF symbol') from error
        versions = {size: version, **ADDITIONAL_BRIDGE_VERSIONS.get(key, {})}
        require(actual_size in versions and address % 4 == 0
                and 0x02000000 <= address <= 0x02040000 - actual_size
                and entries[0][2] in ('B', 'D'),
                f'{key}: incompatible ELF EWRAM address, size, alignment, or storage')
        size, version = actual_size, versions[actual_size]
        expected = dict(version=version, size=size, address=address,
                        magicA=magic_a, magicB=magic_b)
        packet = metadata.get(key)
        require(type(packet) is dict and set(packet) == set(expected)
                and all(type(packet[field]) is int for field in expected)
                and packet == expected, f'{key}: metadata does not match ELF/schema')
        require(all(address + size <= start or address >= end for start, end in ranges),
                f'{key}: bridge storage overlaps another packet')
        ranges.append((address, address + size))
        result[key] = dict(symbol=name, **expected)
    return result


def verify_contract(source, state, native_raw, web_raw, metadata):
    native = read_json(native_raw, 'Native minimap contract')
    web = read_json(web_raw, 'Web minimap contract')
    committed = read_json(git(source, 'show', f'{state["commit"]}:{NATIVE_CONTRACT}'),
                          'Committed native minimap contract')
    require(canonical(native) == canonical(committed), 'Native contract differs from committed HEAD')
    require(canonical(native) == canonical(web), 'Native/web minimap contracts differ')
    require(type(native.get('schemaVersion')) is int and native['schemaVersion'] == 1,
            'Unsupported minimap contract schema')
    require(all(key in native for key in GEOMETRY_KEYS), 'Minimap geometry fields missing')
    fingerprint = sha256(canonical({key: native[key] for key in GEOMETRY_KEYS}))
    require(native.get('geometryFingerprintSha256') == fingerprint,
            'Minimap geometry fingerprint does not match actual geometry')
    binding = metadata.get('minimap')
    require(type(binding) is dict and type(binding.get('schemaVersion')) is int
            and binding == dict(schemaVersion=1, geometryFingerprintSha256=fingerprint),
            'Metadata minimap binding differs from verified geometry')
    source_hashes = native.get('sourceSha256')
    require(type(source_hashes) is dict and source_hashes,
            'Minimap contract must pin its native source files')
    for name, digest in source_hashes.items():
        relative = PurePosixPath(name)
        require(name == str(relative) and not relative.is_absolute() and '..' not in relative.parts,
                f'Unsafe minimap source path: {name}')
        path = source / relative
        require(path.resolve().is_relative_to(source) and path.is_file() and not path.is_symlink(),
                f'Missing or unsafe minimap source file: {name}')
        git(source, 'cat-file', '-e', f'{state["commit"]}:{name}')
        require(type(digest) is str and re.fullmatch(r'[0-9a-f]{64}', digest)
                and sha256(path.read_bytes()) == digest,
                f'Stale minimap source hash: {name}')
    return dict(schemaVersion=1, geometryFingerprintSha256=fingerprint,
                canonicalSha256=sha256(canonical(native)), sourceFilesVerified=len(source_hashes))


def verify_pair(*, native, rom, metadata, elf, web_contract, patch, binutils,
                upstream_commit=UPSTREAM):
    """Return deterministic receipt and frozen payload bytes. No build or network."""
    source = Path(native).resolve()
    state = native_state(source)
    real_index = index_digest(source)
    paths = {'roms/taichung-firered.gba': Path(rom).resolve(),
             'roms/build.json': Path(metadata).resolve(),
             'roms/taichung-firered.elf': Path(elf).resolve(),
             'minimap-contract.native.json': source / NATIVE_CONTRACT,
             'minimap-contract.web.json': Path(web_contract).resolve(),
             'taichung.patch': Path(patch).resolve()}
    payload = {name: path.read_bytes() for name, path in paths.items()}
    build = read_json(payload['roms/build.json'], 'Build metadata')
    require(build.get('sourceCommit') == state['commit'], 'Metadata sourceCommit does not match clean native HEAD')
    if 'sourceTree' in build:
        require(build['sourceTree'] == state['tree'], 'Metadata sourceTree does not match clean native HEAD')
    require(build.get('upstreamCommit') == upstream_commit, 'Metadata upstreamCommit differs from pinned baseline')
    git(source, 'merge-base', '--is-ancestor', upstream_commit, state['commit'])
    baseline_tree = git(source, 'rev-parse', f'{upstream_commit}^{{tree}}').decode().strip()
    require(type(build.get('modified')) is bool
            and build['modified'] == (baseline_tree != state['tree']), 'Metadata modified flag differs from committed tree')
    data = payload['roms/taichung-firered.gba']
    require(build.get('file') == 'taichung-firered.gba', 'Unexpected metadata ROM filename')
    require(type(build.get('bytes')) is int and build['bytes'] == len(data) == 0x1000000,
            'ROM byte count differs from metadata/16MiB cartridge size')
    require(build.get('sha256') == sha256(data)
            and build.get('sha1') == hashlib.sha1(data).hexdigest(), 'ROM digest mismatch')
    elf_data = payload['roms/taichung-firered.elf']
    require(len(elf_data) >= 52 and elf_data[:6] == b'\x7fELF\x01\x01'
            and struct.unpack_from('<HH', elf_data, 16) == (2, 40), 'Expected a 32-bit little-endian ARM executable ELF')
    if 'elfSha256' in build:
        require(build['elfSha256'] == sha256(elf_data), 'Metadata ELF digest mismatch')
    minimap = verify_contract(source, state, payload['minimap-contract.native.json'],
                              payload['minimap-contract.web.json'], build)
    directory = Path(binutils).resolve()
    nm, objcopy = (directory / f'arm-none-eabi-{name}' for name in ('nm', 'objcopy'))
    versions = {tool.name: run([tool, '--version']).decode().splitlines()[0] for tool in (nm, objcopy)}
    with tempfile.TemporaryDirectory(prefix='taichung-pair-') as temporary:
        temporary = Path(temporary)
        frozen_elf = temporary / 'input.elf'
        frozen_elf.write_bytes(elf_data)
        frozen_patch = temporary / 'input.patch'
        frozen_patch.write_bytes(payload['taichung.patch'])
        bridges = verify_bridges(build, run([nm, '--defined-only', '--print-size', frozen_elf]))
        reconstructed = temporary / 'from-elf.gba'
        options = ['-O', 'binary', '--gap-fill', '0xFF', '--pad-to', '0x9000000']
        run([objcopy, *options, frozen_elf, reconstructed])
        require(reconstructed.read_bytes() == data, 'ELF reconstruction differs from ROM')
        tree = verify_patch(source, frozen_patch, upstream_commit, state['tree'], temporary)
    require(native_state(source) == state, 'Native HEAD/tree changed during verification')
    require(index_digest(source) == real_index, 'Real native Git index changed during verification')
    require(all(path.read_bytes() == payload[name] for name, path in paths.items()),
            'Pair inputs changed during verification')
    # Recheck source pins after external commands; read-only Git status never refreshes the index.
    verify_contract(source, state, payload['minimap-contract.native.json'],
                    payload['minimap-contract.web.json'], build)
    receipt = dict(schemaVersion=1, status='PASS', native=dict(**state, upstreamCommit=upstream_commit, clean=True),
                   rom=dict(bytes=len(data), sha1=hashlib.sha1(data).hexdigest(), sha256=sha256(data)),
                   elf=dict(sha256=sha256(elf_data), independentObjcopyByteExact=True, objcopyOptions=options),
                   bridges=bridges, minimap=minimap,
                   portablePatch=dict(recreatedTree=tree, realIndexUnchanged=True, privateObjectStore=True),
                   binutils=versions,
                   inputs={name: dict(bytes=len(raw), sha256=sha256(raw))
                           for name, raw in sorted(payload.items())},
                   verifierSha256=sha256(Path(__file__).read_bytes()),
                   scope='Pair consistency and committed-tree proof; no native recompile, runtime acceptance, or deployment.')
    return receipt, payload


def write_output(receipt, payload, *, freeze_dir=None, receipt_path=None, native):
    destination = Path(freeze_dir or receipt_path).resolve()
    require(not destination.is_relative_to(Path(native).resolve()), 'Output must be outside the native source worktree')
    require(not destination.exists(), f'Output already exists; refusing overwrite: {destination}')
    destination.parent.mkdir(parents=True, exist_ok=True)
    if freeze_dir:
        stage = Path(tempfile.mkdtemp(prefix=f'.{destination.name}-', dir=destination.parent))
        try:
            payload = {**payload, 'receipt.json': json_bytes(receipt)}
            manifest = {'schemaVersion': 1, 'files': [
                dict(path=name, bytes=len(raw), sha256=sha256(raw)) for name, raw in sorted(payload.items())]}
            for name, raw in payload.items():
                target = stage / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(raw)
            (stage / 'manifest.json').write_bytes(json_bytes(manifest))
            for entry in manifest['files']:
                raw = (stage / entry['path']).read_bytes()
                require(len(raw) == entry['bytes'] and sha256(raw) == entry['sha256'], 'Freeze verification failed')
            require(not destination.exists(), f'Output appeared during freeze: {destination}')
            stage.rename(destination)  # Same-filesystem atomic directory publication.
        finally:
            if stage.exists():
                shutil.rmtree(stage)
    else:
        descriptor, temporary = tempfile.mkstemp(prefix=f'.{destination.name}-', dir=destination.parent)
        try:
            with os.fdopen(descriptor, 'wb') as stream:
                stream.write(json_bytes(receipt))
                stream.flush()
                os.fsync(stream.fileno())
            os.link(temporary, destination)  # Atomic create, never replace an existing receipt.
        finally:
            Path(temporary).unlink(missing_ok=True)


def main():
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--native', type=Path, required=True)
    parser.add_argument('--rom', type=Path, required=True)
    parser.add_argument('--metadata', type=Path)
    parser.add_argument('--elf', type=Path)
    parser.add_argument('--web-contract', type=Path, default=root / 'web/src/data/minimap-contract.json')
    parser.add_argument('--patch', type=Path, default=root / 'patches/taichung.patch')
    parser.add_argument('--binutils', type=Path, required=True)
    output = parser.add_mutually_exclusive_group()
    output.add_argument('--freeze-dir', type=Path)
    output.add_argument('--receipt', type=Path)
    args = parser.parse_args()
    try:
        receipt, payload = verify_pair(native=args.native, rom=args.rom,
                                      metadata=args.metadata or args.rom.with_name('build.json'),
                                      elf=args.elf or args.native / 'pokefirered.elf',
                                      web_contract=args.web_contract, patch=args.patch, binutils=args.binutils)
        if args.freeze_dir or args.receipt:
            write_output(receipt, payload, freeze_dir=args.freeze_dir,
                         receipt_path=args.receipt, native=args.native)
        sys.stdout.buffer.write(json_bytes(receipt))
    except (PairError, OSError, UnicodeError) as error:
        parser.exit(1, f'Release pair rejected: {error}\n')


if __name__ == '__main__':
    main()
