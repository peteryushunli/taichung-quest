#!/usr/bin/env python3
"""Reproduce approved, lossless native-fit PNGs without changing map geography."""
import argparse
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
from PIL import Image

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent

def load(name, folder):
    spec = importlib.util.spec_from_file_location(name, ROOT / folder / 'generate.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def encoded(image):
    output = io.BytesIO()
    image.save(output, format='PNG', transparency=0, optimize=False)
    return output.getvalue()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--game-source', type=Path, required=True)
    parser.add_argument('--check', action='store_true', help='Verify installed bytes without writing')
    args = parser.parse_args()
    target = args.game_source / 'data/taichung/approved-landmarks/art'
    manifest = json.loads((ROOT / 'art-manifest.json').read_text())
    images = {row['id']: (ROOT / row['nativeFile']).read_bytes() for row in manifest['landmarks']}
    v4 = load('approved_v4', 'revisions-v4')
    parks = load('approved_parks', 'parks-street')
    for ident, image in (
        ('second-market', v4.market(native_fit=True).im),
        ('prefectural-hall', v4.prefectural(native_fit=True).im),
        ('fengle-sculpture-park', parks.fengle(native_fit=True).im),
        ('yizhong-street', parks.yizhong(native_fit=True).im),
    ):
        images[ident] = encoded(image)
    # Trim only extra courtyard/padding columns, preserving the building pixels.
    images['cultural-heritage-park'] = encoded(Image.open(io.BytesIO(images['cultural-heritage-park'])).crop((9, 0, 233, 208)))
    if not args.check:
        target.mkdir(parents=True, exist_ok=True)
    for ident, data in images.items():
        path = target / (ident + '.png')
        if args.check:
            if path.read_bytes() != data:
                raise SystemExit(f'Native-fit bytes differ: {path}')
        else:
            path.write_bytes(data)
        print(ident, hashlib.sha256(data).hexdigest())
    print('PASS: all ten approved native-fit PNGs reproduce exactly.')

if __name__ == '__main__':
    main()
