# Building the game

The game is compiled from the community reconstruction of FireRed. No separately downloaded cartridge ROM is used as a build input.

## Prerequisites

All platforms need Git, Make, a native C/C++ compiler, Python 3, `pkg-config`, and libpng development files. The game also needs ARM binutils and the pinned `agbcc` compiler. The bootstrap script fetches and builds `agbcc` inside this project.

On Apple Silicon macOS, install the Xcode command-line tools and Homebrew first. `libpng`, `pkgconf`, and `zstd` must be available through Homebrew. If needed, install these with:

```sh
brew install libpng pkgconf zstd
```

The bootstrap script downloads a checksum-verified ARM binutils Homebrew bottle for arm64 macOS 26 into `.tools/`, relocates its zstd dependency, and signs the relocated executables locally. It does not install ARM tools into the system or modify shell startup files. An existing `arm-none-eabi` toolchain can be used instead. Other macOS architectures should provide that toolchain themselves.

On Debian/Ubuntu, the equivalent prerequisites are:

```sh
sudo apt install build-essential git python3 pkg-config libpng-dev binutils-arm-none-eabi
```

The initial downloads require network access. Subsequent builds use the local source and tools.

## Build the Taichung version

Run these commands from the project root:

```sh
bash scripts/bootstrap-game.sh
bash scripts/build-game.sh
```

Bootstrap checks out the pinned source versions and installs the compiler into the game checkout. When `patches/taichung.patch` exists, it applies that patch to a clean upstream checkout. Repeating bootstrap detects an already-applied patch and preserves local edits; conflicting local changes cause a clear error rather than being overwritten.

The build writes:

- `web/public/roms/taichung-firered.gba`: the browser player's 16 MiB game image.
- `web/public/roms/build.json`: source commit, ROM size, and SHA-1/SHA-256 digests.
- `artifacts/game-build.log`: complete compiler output.

The default is eight compiler jobs. Set `GAME_BUILD_JOBS` to change it. On macOS without GNU's ARM C preprocessor, the build uses the system Clang preprocessor. This configuration was verified to produce the exact original FireRed image before the Taichung edits.

## Verify the untouched baseline

Before applying changes, a clean source checkout can be verified with:

```sh
bash scripts/bootstrap-game.sh --baseline
bash scripts/build-game.sh --baseline
```

The baseline mode skips patch application. It does not undo edits in an existing checkout, and baseline verification refuses a modified checkout. A successful baseline must have SHA-1 `41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc`; the build records a copy in `artifacts/baseline-firered.gba` and its digest in `artifacts/baseline-firered.sha1`.

## Source pins and editing

- FireRed: `pret/pokefirered` at `ce6406d8c2eaf46d543c8a2606de0c3cb1951982`.
- Compiler: `pret/agbcc` at `da598c1d918402c42c0c0d7128ba14567f3175e9`.
- Local macOS ARM binutils bottle: version `2.47`, SHA-256 `9b2c0bddcc6c6f3665a06e9a8ebf3677fc220abaee18f884269a015c3677d4d8`.

Edit the game source in `vendor/pokefirered/` and run the build again. Map, script, and tileset edits rebuild through the upstream dependency rules. Export changes with `bash scripts/export-game-patch.sh` so a fresh checkout can reproduce them. The vendor checkouts, build tools, and generated ROMs are excluded from the parent repository.

## Isolated development worktrees

Native development commits may descend from the pinned upstream revision. Bootstrap preserves those committed and working changes; export always compares the selected source against the original pinned revision. Baseline verification still requires an exactly matching, clean upstream checkout.

Set `TAICHUNG_GAME_SOURCE` to an absolute game worktree path for bootstrap, build, export, map validation, rendering, and font generation:

```sh
TAICHUNG_GAME_SOURCE="$PWD/.worktrees/game-localization" bash scripts/bootstrap-game.sh
TAICHUNG_GAME_SOURCE="$PWD/.worktrees/game-localization" bash scripts/build-game.sh
TAICHUNG_GAME_SOURCE="$PWD/.worktrees/game-localization" python3 scripts/generate-chinese-font.py
```

Each non-default source path gets its own build log and ROM output under `artifacts/worktrees/<path-hash>/`; compiler outputs also stay in that worktree. These builds do not overwrite the integrated browser cartridge. The integration owner alone copies verified artifacts into the web player or sets `TAICHUNG_ROM_DIRECTORY` explicitly. Font proofs use the same isolated artifact namespace. A feature-specific translation corpus can be selected with `TAICHUNG_TRANSLATION_CONFIG`; the integration owner reconciles corpus changes before release.

See `docs/workstreams.md` for active paths, branches, ownership, and checkpoint commits.
