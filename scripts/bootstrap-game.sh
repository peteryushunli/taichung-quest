#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GAME_DIR="${TAICHUNG_GAME_SOURCE:-$PROJECT_ROOT/vendor/pokefirered}"
GAME_DIR="$(python3 -c 'import os,sys; print(os.path.abspath(sys.argv[1]))' "$GAME_DIR")"
FIRERED_COMMIT=ce6406d8c2eaf46d543c8a2606de0c3cb1951982
AGBCC_COMMIT=da598c1d918402c42c0c0d7128ba14567f3175e9
BINUTILS_VERSION=2.47
BINUTILS_SHA256=9b2c0bddcc6c6f3665a06e9a8ebf3677fc220abaee18f884269a015c3677d4d8
BASELINE=0
if [[ "${1:-}" == --baseline ]]; then BASELINE=1; shift; fi
if [[ $# -ne 0 ]]; then printf 'Usage: %s [--baseline]\n' "$0" >&2; exit 2; fi

for prerequisite in git make cc c++ pkg-config python3; do
  if ! command -v "$prerequisite" >/dev/null 2>&1; then
    printf 'Missing prerequisite: %s. See docs/game-build.md.\n' "$prerequisite" >&2
    exit 1
  fi
done
if ! pkg-config --exists libpng; then
  printf 'libpng development files are missing. See docs/game-build.md.\n' >&2
  exit 1
fi

mkdir -p "$PROJECT_ROOT/vendor" "$PROJECT_ROOT/.tools"

checkout_pinned() {
  local repository="$1" destination="$2" revision="$3" allow_descendant="${4:-0}"
  if [[ ! -e "$destination/.git" ]]; then
    git init --quiet "$destination"
    git -C "$destination" remote add origin "$repository"
    git -C "$destination" fetch --depth 1 origin "$revision"
    git -C "$destination" checkout --quiet --detach FETCH_HEAD
  fi
  if [[ "$(git -C "$destination" rev-parse HEAD)" != "$revision" ]]; then
    if [[ "$allow_descendant" == 1 ]] && git -C "$destination" merge-base --is-ancestor "$revision" HEAD; then
      return
    fi
    printf 'Refusing to replace a different checkout at %s. Expected %s.\n' "$destination" "$revision" >&2
    exit 1
  fi
}

checkout_pinned https://github.com/pret/pokefirered.git "$GAME_DIR" "$FIRERED_COMMIT" 1
checkout_pinned https://github.com/pret/agbcc.git "$PROJECT_ROOT/vendor/agbcc" "$AGBCC_COMMIT"

if [[ "$BASELINE" == 1 ]] && { [[ "$(git -C "$GAME_DIR" rev-parse HEAD)" != "$FIRERED_COMMIT" ]] || [[ -n "$(git -C "$GAME_DIR" status --porcelain)" ]]; }; then
  printf 'Baseline mode requires a clean checkout at the exact upstream commit. Use a separate baseline worktree.\n' >&2
  exit 1
fi

LOCAL_BINUTILS="$PROJECT_ROOT/.tools/binutils/arm-none-eabi-binutils/$BINUTILS_VERSION/bin"
if [[ -x "$LOCAL_BINUTILS/arm-none-eabi-as" ]]; then
  export PATH="$LOCAL_BINUTILS:$PATH"
fi

if ! command -v arm-none-eabi-as >/dev/null 2>&1; then
  if [[ "$(uname -s)" != Darwin || "$(uname -m)" != arm64 ]]; then
    printf 'Install ARM binutils (binutils-arm-none-eabi on Debian/Ubuntu), then rerun.\n' >&2
    exit 1
  fi
  if ! command -v brew >/dev/null 2>&1; then
    printf 'Homebrew or an existing arm-none-eabi toolchain is required on macOS.\n' >&2
    exit 1
  fi
  BREW_CACHE="$PROJECT_ROOT/.tools/brew-cache"
  HOMEBREW_NO_AUTO_UPDATE=1 HOMEBREW_CACHE="$BREW_CACHE" \
    brew fetch --force --bottle-tag=arm64_tahoe arm-none-eabi-binutils
  BOTTLE_FILES=("$BREW_CACHE"/downloads/*--arm-none-eabi-binutils--"$BINUTILS_VERSION".arm64_tahoe.bottle.tar.gz)
  if [[ ! -f "${BOTTLE_FILES[0]}" ]]; then
    printf 'The pinned binutils %s bottle was not found in the Homebrew cache.\n' "$BINUTILS_VERSION" >&2
    exit 1
  fi
  BOTTLE="${BOTTLE_FILES[0]}"
  ACTUAL_SHA256="$(shasum -a 256 "$BOTTLE" | cut -d ' ' -f 1)"
  if [[ "$ACTUAL_SHA256" != "$BINUTILS_SHA256" ]]; then
    printf 'ARM binutils bottle checksum mismatch; refusing to unpack it.\n' >&2
    exit 1
  fi
  mkdir -p "$PROJECT_ROOT/.tools/binutils"
  tar -xzf "$BOTTLE" -C "$PROJECT_ROOT/.tools/binutils"
  ZSTD_PREFIX="$(brew --prefix zstd)"
  if [[ ! -f "$ZSTD_PREFIX/lib/libzstd.1.dylib" ]]; then
    printf 'The binutils bottle requires Homebrew zstd. Install zstd, then rerun.\n' >&2
    exit 1
  fi
  for binary in "$LOCAL_BINUTILS"/*; do
    if [[ "$(file -b "$binary")" == *Mach-O* ]]; then
      install_name_tool -change '@@HOMEBREW_PREFIX@@/opt/zstd/lib/libzstd.1.dylib' \
        "$ZSTD_PREFIX/lib/libzstd.1.dylib" "$binary"
      codesign -s - -f "$binary"
    fi
  done
  export PATH="$LOCAL_BINUTILS:$PATH"
fi

arm-none-eabi-as --version | head -1
if [[ ! -x "$PROJECT_ROOT/vendor/agbcc/agbcc" || ! -f "$PROJECT_ROOT/vendor/agbcc/libc.a" ]]; then
  printf 'Building the pinned agbcc compiler; log: .tools/agbcc-build.log\n'
  (cd "$PROJECT_ROOT/vendor/agbcc" && ./build.sh) > "$PROJECT_ROOT/.tools/agbcc-build.log" 2>&1
fi
(cd "$PROJECT_ROOT/vendor/agbcc" && ./install.sh "$GAME_DIR")

PATCH="$PROJECT_ROOT/patches/taichung.patch"
if [[ "$BASELINE" == 0 && "$(git -C "$GAME_DIR" rev-parse HEAD)" != "$FIRERED_COMMIT" ]]; then
  printf 'Development checkout: preserving its committed and working changes.\n'
elif [[ "$BASELINE" == 0 && -s "$PATCH" ]]; then
  if git -C "$GAME_DIR" apply --reverse --check "$PATCH" 2>/dev/null; then
    printf 'Taichung patch is already applied.\n'
  elif [[ -z "$(git -C "$GAME_DIR" status --porcelain)" ]]; then
    git -C "$GAME_DIR" apply --check "$PATCH"
    git -C "$GAME_DIR" apply "$PATCH"
    printf 'Applied patches/taichung.patch.\n'
  else
    printf 'Source has local edits. Refusing to apply the Taichung patch over them.\n' >&2
    exit 1
  fi
fi
printf 'Game toolchain ready. Run bash scripts/build-game.sh%s\n' "$(if [[ "$BASELINE" == 1 ]]; then printf ' --baseline'; fi)"
