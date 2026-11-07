#!/usr/bin/env python3
"""Refresh native Chinese glyphs without rewriting content or character codes.

The selected native checkout owns its pinned font source and shared append /
refresh pipeline. Translation and menu edits require separate reviewed content
integration; this entrypoint never regenerates them from upstream templates.
"""
import argparse
import hashlib
import os
from pathlib import Path
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Report proposed bitmap changes without writing native source')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    game = Path(os.environ.get('TAICHUNG_GAME_SOURCE', root / 'vendor/pokefirered')).resolve()
    helper = game / 'tools/taichung_gameplay/refresh-chinese-glyphs.py'
    if not helper.is_file():
        raise SystemExit('This checkout lacks the safe native font pipeline; use its checked-in glyphs or integrate the reviewed font tools first.')
    artifacts = root / 'artifacts'
    if game != (root / 'vendor/pokefirered').resolve():
        artifacts = artifacts / 'worktrees' / hashlib.sha256(str(game).encode()).hexdigest()[:12]
    command = [sys.executable, str(helper), '--game', str(game), '--artifacts', str(artifacts / 'font-refresh')]
    # Optional corpus contributes missing glyphs only, never translation/menu generation.
    corpus = Path(os.environ.get('TAICHUNG_TRANSLATION_CONFIG', root / 'scripts/map-content/taichung-zh.json'))
    if corpus.is_file():
        command += ['--corpus', str(corpus.resolve())]
    if not (game / 'assets/fonts/taichung-native-font.json').exists():
        command += ['--font', str(root / '.tools/fonts/NotoSansTC.ttf')]
    if not args.check:
        command.append('--write')
    env = {**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'}
    subprocess.run(command, check=True, env=env)


if __name__ == '__main__':
    main()
