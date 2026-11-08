# Keep QA output in the repository

Start native gameplay QA through the tracked wrapper:

```sh
python3 scripts/serve-gameplay-qa.py \
  --rom /absolute/path/to/frozen/taichung-firered.gba \
  --runtime /absolute/path/to/web/public/emulator \
  --port 8810
```

All other native QA arguments pass through, including exact-ROM inspection
addresses. Use `--helper /absolute/path/to/qa_server.py` for an isolated or extended
QA helper; otherwise the current native checkout supplies it. `TAICHUNG_GAME_SOURCE`
can select that checkout. Do not start the unwrapped helper for new QA sessions.

The wrapper saves screenshots, native saves, party reports and travel reports
directly into the main repository's ignored `artifacts/downloads/` directory,
including when launched from a Git worktree. It replaces the browser download
buttons with **Save … to repo** actions and uses a same-origin loopback POST.
Successful actions show the exact file path, byte count and SHA-256. Receipts are
also appended to `artifacts/downloads/qa-direct-exports.jsonl`. Existing files are
never overwritten. Unsupported templates or failed exports stop with an explicit
error; there is no fallback to the personal Downloads folder.

Write other QA screenshots, JSON, recordings and exported files to this same
directory by specifying their output path in the supported capture/file API.
Keep test evidence names descriptive. Do not change a personal browser's global
download preferences. Ordinary players' production save-download behavior is
unchanged; this wrapper is local QA tooling only.

To update a running session, first finish its battle and use native Save. Use the
existing **Reset cartridge (keep save)** action to sync the named SRAM before
reloading. Restart the server on the same origin, preserving the exact `qaSave`
token and ROM, and omit `--save` so an original fixture cannot replace the newly
earned progress. Then reload, load the cartridge and Continue. Confirm that the
saved party and badge count remain intact before resuming. Never reuse CPU
snapshots across ROM hashes or reload an unsaved battle for this migration.
