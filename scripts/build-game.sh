#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GAME_DIR="${TAICHUNG_GAME_SOURCE:-$PROJECT_ROOT/vendor/pokefirered}"
GAME_DIR="$(python3 -c 'import os,sys; print(os.path.abspath(sys.argv[1]))' "$GAME_DIR")"
UPSTREAM_COMMIT=ce6406d8c2eaf46d543c8a2606de0c3cb1951982
LOCAL_BINUTILS="$PROJECT_ROOT/.tools/binutils/arm-none-eabi-binutils/2.47/bin"
BASELINE=0
if [[ "${1:-}" == --baseline ]]; then BASELINE=1; shift; fi
if [[ $# -ne 0 ]]; then printf 'Usage: %s [--baseline]\n' "$0" >&2; exit 2; fi

if ! git -C "$GAME_DIR" merge-base --is-ancestor "$UPSTREAM_COMMIT" HEAD; then
  printf 'Game source must descend from the pinned FireRed commit.\n' >&2
  exit 1
fi
if [[ "$GAME_DIR" == "$PROJECT_ROOT/vendor/pokefirered" ]]; then
  ARTIFACT_DIR="$PROJECT_ROOT/artifacts"
  ROM_DIR="${TAICHUNG_ROM_DIRECTORY:-$PROJECT_ROOT/web/public/roms}"
else
  build_namespace="$(printf '%s' "$GAME_DIR" | shasum -a 256 | cut -c1-12)"
  ARTIFACT_DIR="$PROJECT_ROOT/artifacts/worktrees/$build_namespace"
  ROM_DIR="${TAICHUNG_ROM_DIRECTORY:-$ARTIFACT_DIR/roms}"
fi

if [[ -x "$LOCAL_BINUTILS/arm-none-eabi-as" ]]; then export PATH="$LOCAL_BINUTILS:$PATH"; fi
if [[ ! -x "$GAME_DIR/tools/agbcc/bin/agbcc" ]] || ! command -v arm-none-eabi-as >/dev/null 2>&1; then
  printf 'Run bash scripts/bootstrap-game.sh first.\n' >&2
  exit 1
fi
if [[ "$BASELINE" == 1 ]] && { [[ "$(git -C "$GAME_DIR" rev-parse HEAD)" != "$UPSTREAM_COMMIT" ]] || [[ -n "$(git -C "$GAME_DIR" status --porcelain)" ]]; }; then
  printf 'Baseline verification requires an unchanged upstream source checkout.\n' >&2
  exit 1
fi

MAKE_ARGS=(-j"${GAME_BUILD_JOBS:-8}")
if [[ "$(uname -s)" == Darwin ]] && ! command -v arm-none-eabi-cpp >/dev/null 2>&1; then
  MAKE_ARGS+=("CPP=/usr/bin/clang -E -Wno-invalid-pp-token")
fi
mkdir -p "$ARTIFACT_DIR" "$ROM_DIR"
printf 'Compiling FireRed; log: %s/game-build.log\n' "$ARTIFACT_DIR"
if ! make -C "$GAME_DIR" "${MAKE_ARGS[@]}" > "$ARTIFACT_DIR/game-build.log" 2>&1; then
  tail -60 "$ARTIFACT_DIR/game-build.log" >&2
  exit 1
fi

if [[ "$BASELINE" == 1 ]]; then
  ACTUAL_SHA1="$(shasum "$GAME_DIR/pokefirered.gba" | cut -d ' ' -f 1)"
  EXPECTED_SHA1=41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc
  if [[ "$ACTUAL_SHA1" != "$EXPECTED_SHA1" ]]; then
    printf 'Baseline SHA-1 mismatch: expected %s, got %s\n' "$EXPECTED_SHA1" "$ACTUAL_SHA1" >&2
    exit 1
  fi
  cp "$GAME_DIR/pokefirered.gba" "$ARTIFACT_DIR/baseline-firered.gba"
  printf '%s  baseline-firered.gba\n' "$ACTUAL_SHA1" > "$ARTIFACT_DIR/baseline-firered.sha1"
  printf 'Unmodified FireRed baseline matches the original SHA-1: %s\n' "$ACTUAL_SHA1"
fi

rom_temp="$(mktemp "$ROM_DIR/.taichung-firered.gba.XXXXXX")"
trap 'rm -f "$rom_temp"' EXIT
cp "$GAME_DIR/pokefirered.gba" "$rom_temp"
mv "$rom_temp" "$ROM_DIR/taichung-firered.gba"
python3 - "$GAME_DIR" "$ROM_DIR" "$UPSTREAM_COMMIT" <<'PY'
import hashlib
import json
import pathlib
import re
import subprocess
import sys

source = pathlib.Path(sys.argv[1])
rom = pathlib.Path(sys.argv[2]) / 'taichung-firered.gba'
baseline = sys.argv[3]
data = rom.read_bytes()
metadata = {
    'file': 'taichung-firered.gba',
    'bytes': len(data),
    'sha1': hashlib.sha1(data).hexdigest(),
    'sha256': hashlib.sha256(data).hexdigest(),
    'upstreamCommit': baseline,
    'sourceCommit': subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip(),
    'modified': bool(subprocess.check_output(['git', '-C', str(source), 'diff', '--name-only', baseline], text=True).strip()) or bool(subprocess.check_output(['git', '-C', str(source), 'status', '--porcelain'], text=True).strip()),
}
symbols = subprocess.check_output(
    ['arm-none-eabi-nm', '--defined-only', '--print-size', str(source / 'pokefirered.elf')], text=True
)
for line in symbols.splitlines():
    columns = line.split()
    if len(columns) == 4 and columns[-1] == 'gTaichungLanguageBridge':
        address, size = int(columns[0], 16), int(columns[1], 16)
        if size != 32 or not 0x02000000 <= address <= 0x02040000 - size:
            raise SystemExit('Unexpected native language bridge layout; refusing incompatible metadata.')
        metadata['languageBridge'] = {
            'version': 1,
            'size': size,
            'address': address,
            'magicA': 0x414C4354,
            'magicB': 0x3130474E,
        }
        break
navigation_symbols = [
    columns for line in symbols.splitlines()
    if (columns := line.split()) and columns[-1] == 'gTaichungNavigationBridge'
]
if navigation_symbols:
    if len(navigation_symbols) != 1 or len(navigation_symbols[0]) != 4:
        raise SystemExit('Unexpected native navigation bridge symbol; refusing incompatible metadata.')
    try:
        address, size = (int(value, 16) for value in navigation_symbols[0][:2])
    except ValueError:
        raise SystemExit('Unexpected native navigation bridge layout; refusing incompatible metadata.')
    if size != 48 or address % 4 or not 0x02000000 <= address <= 0x02040000 - size:
        raise SystemExit('Unexpected native navigation bridge layout; refusing incompatible metadata.')
    contract_path = source / 'data/taichung/minimap-contract.json'
    try:
        contract = json.loads(contract_path.read_text())
    except (OSError, ValueError) as error:
        raise SystemExit(f'Cannot read navigation minimap contract {contract_path}: {error}')
    if not isinstance(contract, dict) or type(contract.get('schemaVersion')) is not int or contract['schemaVersion'] != 1:
        raise SystemExit('Unsupported minimap contract schema; refusing incompatible metadata.')
    fingerprint = contract.get('geometryFingerprintSha256')
    if not isinstance(fingerprint, str) or re.fullmatch(r'[0-9a-f]{64}', fingerprint) is None:
        raise SystemExit('Invalid minimap geometry fingerprint; refusing incompatible metadata.')
    metadata['navigationBridge'] = {
        'version': 1,
        'size': size,
        'address': address,
        'magicA': 0x414E4354,
        'magicB': 0x31303056,
    }
    metadata['minimap'] = {
        'schemaVersion': contract['schemaVersion'],
        'geometryFingerprintSha256': fingerprint,
    }
(rom.parent / 'build.json').write_text(json.dumps(metadata, indent=2) + '\n')
print(f"ROM ready: {rom} ({len(data):,} bytes)")
PY
