#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
game_source="${TAICHUNG_GAME_SOURCE:-$project_root/vendor/pokefirered}"
game_source="$(python3 -c 'import os,sys; print(os.path.abspath(sys.argv[1]))' "$game_source")"
baseline="ce6406d8c2eaf46d543c8a2606de0c3cb1951982"

if [[ ! -e "$game_source/.git" ]]; then
  printf 'Game source is missing. Run scripts/bootstrap-game.sh first.\n' >&2
  exit 1
fi

if ! git -C "$game_source" merge-base --is-ancestor "$baseline" HEAD; then
  printf 'Game source must descend from the pinned baseline. Export cancelled.\n' >&2
  exit 1
fi

mkdir -p "$project_root/patches"
patch_output="$(mktemp "$project_root/patches/taichung.patch.XXXXXX")"
trap 'rm -f "$patch_output"' EXIT
python3 - "$game_source" "$baseline" "$patch_output" <<'PY'
import pathlib
import subprocess
import sys

source, baseline, output = sys.argv[1:]
patch = subprocess.check_output(['git', 'diff', '--binary', baseline, '--', '.'], cwd=source)
untracked = subprocess.check_output(
    ['git', 'ls-files', '--others', '--exclude-standard', '-z'], cwd=source
).split(b'\0')
for raw_path in filter(None, untracked):
    path = raw_path.decode()
    addition = subprocess.run(
        ['git', 'diff', '--no-index', '--binary', '--', '/dev/null', path],
        cwd=source, capture_output=True
    )
    if addition.returncode not in (0, 1):
        raise SystemExit(f'Cannot export new source file: {path}')
    patch += addition.stdout
pathlib.Path(output).write_bytes(patch)
PY
mv "$patch_output" "$project_root/patches/taichung.patch"
printf 'Exported game changes to patches/taichung.patch\n'
