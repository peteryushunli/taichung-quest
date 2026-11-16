# Verify a native/web release pair

`scripts/verify-release-pair.py` checks existing artifacts. It never compiles,
exports a dirty tree, modifies the native checkout/index/object store, or deploys.
Run it while Main holds the native source and candidate files frozen.

```sh
PYTHONDONTWRITEBYTECODE=1 python3 scripts/verify-release-pair.py \
  --native /Users/peter/devday_hackathon/.worktrees/game-city-development-main \
  --rom /absolute/candidate/roms/taichung-firered.gba \
  --elf /absolute/candidate/roms/taichung-firered.elf \
  --web-contract web/src/data/minimap-contract.json \
  --patch patches/taichung.patch \
  --binutils /Users/peter/devday_hackathon/.tools/binutils/arm-none-eabi-binutils/2.47/bin \
  --freeze-dir /absolute/new-frozen-release
```

`--metadata` defaults to `build.json` beside the ROM; `--elf` defaults to the
native checkout's `pokefirered.elf`. Without an output option the receipt goes
only to stdout. `--receipt /absolute/new-receipt.json` atomically creates just the
receipt. Output inside the native checkout and existing destinations are rejected.

The verifier requires:

- A clean committed native HEAD, including no untracked source files; metadata
  must name that exact commit and the pinned upstream FireRed baseline. An optional
  metadata `sourceTree` must also match. Ignored build caches are permitted.
- The 16 MiB ROM's actual SHA1/SHA256/size and the metadata filename; an optional
  metadata `elfSha256` must match too.
- An ARM ELF whose independent `objcopy -O binary --gap-fill 0xFF --pad-to
  0x9000000` output equals every ROM byte. Bridge addresses come from that ELF,
  with required exact schemas, sizes, alignment, disjoint EWRAM storage and metadata.
- Complete native/web minimap JSON equality, recomputed geometry fingerprint,
  metadata binding, and all native `sourceSha256` entries matching tracked files.
  Duplicate JSON keys, non-finite numbers and incompatible schema types fail.
- The portable binary patch recreating the entire HEAD tree from the pinned
  upstream in a temporary Git index **and object store**. The real index is
  checked byte-for-byte unchanged. HEAD, input files and source pins are rechecked
  before a successful result.

The freeze contains ROM, metadata, ELF, both contracts, patch, receipt and a sorted
SHA256/byte-count manifest. Files are verified in a private sibling staging
directory before one atomic directory rename. Receipt/manifest contents have no
timestamps or machine-specific input paths, so identical inputs/tools yield
identical receipts/manifests. Existing evidence is never replaced.

Language, navigation and onboarding packets are currently registered. Unknown
native or metadata bridge names fail closed. When Gameplay's encounter packet and
Main's metadata contract are final, add its agreed tuple to `BRIDGES`; do not infer
a packet's ABI from an address or silently omit an unknown bridge.

This proves pair consistency and the declared committed source/portable tree.
It cannot prove that an arbitrary ELF was originally compiled from the claimed
source without an independently trusted build attestation or reproducible build.
It also does not replace source guards, native play testing or browser persistence
acceptance. Main remains the only release integrator/publisher.

## Focused checks

```sh
PYTHONDONTWRITEBYTECODE=1 \
TAICHUNG_BINUTILS=/Users/peter/devday_hackathon/.tools/binutils/arm-none-eabi-binutils/2.47/bin \
python3 scripts/test-verify-release-pair.py
```

Tests create disposable Git repositories and explicitly synthetic, non-playable
ELF/ROM fixtures. Real `nm`, `objcopy` and binary-patch application are exercised;
there is no native compilation, installation or network access. Negatives cover
dirty/staged/untracked source, source/tree/ROM/ELF mismatch, bridge corruption,
duplicate/unregistered packets, stale/different geometry/source pins, malformed
JSON, incomplete patches and output overwrite. They also verify stable manifests
and unchanged real Git index/object files.
