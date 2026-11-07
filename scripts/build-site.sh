#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
rom="$project_root/web/public/roms/taichung-firered.gba"
if [[ ! -f "$rom" ]]; then
  printf 'Build the game with bash scripts/build-game.sh before building the website.\n' >&2
  exit 1
fi

cd "$project_root/web"
npm run build -- --outDir ../dist --emptyOutDir
