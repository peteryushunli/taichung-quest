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
  metadata binding, and all native `sourceSha256` entries matching both current
  file bytes and committed Git blobs. Pins are lowercase 64-digit SHA256 values;
  absolute, non-normalized, parent-traversing and backslash paths are rejected.
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

Language, navigation, onboarding and encounter packets are registered. Encounter
ABI1 is exactly64 bytes, symbol `gTaichungEncounterBridge`, metadata key
`encounterBridge`, magicA `0x4E454354`, magicB `0x31525443`. Pre-encounter pairs may
omit it only when both ELF symbol and metadata are absent; one-sided presence,
wrong size/version/magic, overlap or invalid storage is rejected. Unknown native
or metadata bridge names fail closed; never infer a packet ABI from its address.

This proves pair consistency and the declared committed source/portable tree.
It cannot prove that an arbitrary ELF was originally compiled from the claimed
source without an independently trusted build attestation or reproducible build.
It also does not replace source guards, native play testing or browser persistence
acceptance. Main remains the only release integrator/publisher.

The geometry discriminator has two explicit paths. Absent `geometryVersion`, or
`baseline-v1`, retains the published six-field fingerprint exactly:
`schemaVersion`, `coordinateSystem`, `world`, `mapsByNativeKey`, `markersById`,
`seams`. `horizontal-v1` adds `geometryVersion`, `roads`, `placesById`,
`residence`, and `exteriorSourceSha256`, matching the native exporter. Unknown
versions, missing fields and horizontal fields masquerading as legacy fail.
Every exterior pin gets the same safe-path/current-file/committed-blob checks.
Native bank/map keys, packed IDs and reverse lookup must agree. Interior anchors
must reference their exterior and landmark, or the separate guest-house residence
with `parentMarkerId: null` and `parentPlaceId: "guest-house"`. No fingerprint or
native address is exempted by a known value. This is a structural/pair check;
native source guards still own complete geometry and collision qualification.

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

To additionally test the real horizontal `61734270…` contract and its 27 contexts,
32 ordinary pins and 60 exterior pins, point the same suite at a clean frozen
native checkout:

```sh
PYTHONDONTWRITEBYTECODE=1 \
TAICHUNG_BINUTILS=/Users/peter/devday_hackathon/.tools/binutils/arm-none-eabi-binutils/2.47/bin \
TAICHUNG_HORIZONTAL_NATIVE=/absolute/frozen-horizontal-native \
python3 scripts/test-verify-release-pair.py -v
```

These extra tests only read that checkout. Corrupted road/place/residence data,
native IDs, source hashes/bytes, version and missing fields are tested in private
committed fixture copies. Rehashed invalid IDs/parent relations and stale file
pins must still fail. A separate negative proves an updated pin cannot bless
uncommitted file bytes hidden with Git's `assume-unchanged` flag. The real contract
tests make no horizontal ROM or runtime claim; the existing ELF/ROM fixtures
remain explicitly synthetic and non-playable. A full published legacy-pair run
with its actual ROM/ELF/patch remains the compatibility acceptance check.
