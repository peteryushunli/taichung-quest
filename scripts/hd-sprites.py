#!/usr/bin/env python3
"""Build the high-resolution character pack: gym leaders and story people.

For every character whose installed game sprite was exported from an original
in assets/story/<name>/source/, this writes each game frame at 4x from that
original, plus the frame's exact in-game pixels so the browser can find the
sprite on screen wherever it walks.

    python3 scripts/hd-sprites.py <native game checkout> <out dir>

The overworld originals are 3x3 grids (rows south/north/west, columns idle,
step A, step B); the game strip orders them 0,3,6,1,2,4,5,7,8 (+0), and east is
the game's horizontal flip of west. Battle originals are one portrait.
"""
import base64
import glob
import json
import os
import struct
import sys

import numpy as np
from PIL import Image

SCALE = 4
STORY = '/Users/peter/devday_hackathon/assets/story'
ORDER = [0, 3, 6, 1, 2, 4, 5, 7, 8, 0]
WEST = {2, 7, 8}


def gbapal(path):
    data = open(path, 'rb').read()[:32]
    return [struct.unpack_from('<H', data, i * 2)[0] & 0x7FFF for i in range(16)]


def rgb(c):
    return ((c & 31) << 3 | (c & 31) >> 2, (c >> 5 & 31) << 3 | (c >> 5 & 31) >> 2, (c >> 10 & 31) << 3 | (c >> 10 & 31) >> 2)


def to_rgba(indexed, palette):
    a = np.asarray(indexed)
    out = np.zeros(a.shape + (4,), np.uint8)
    for i, c in enumerate(palette):
        if i:
            out[a == i] = rgb(c) + (255,)
    return Image.fromarray(out, 'RGBA')


def opaque_box(im, cut=128):
    return im.getchannel('A').point(lambda v: 255 if v >= cut else 0).getbbox()


def fit(native, source):
    """The original fitted to the frame's opaque box at 4x, the frame's own pixels underneath.

    Returns the picture and the mean colour error of the original shrunk back to game
    size, which says whether this original really is the one the frame came from.
    """
    w, h = native.size
    nb, sb = opaque_box(native, 1), opaque_box(source)
    if not nb or not sb:
        return None, 1e9
    src = source.copy()
    src.putalpha(src.getchannel('A').point(lambda v: 0 if v < 48 else v))
    sx = (sb[2] - sb[0]) / (nb[2] - nb[0])
    sy = (sb[3] - sb[1]) / (nb[3] - nb[1])
    region = (sb[0] - nb[0] * sx, sb[1] - nb[1] * sy, sb[0] + (w - nb[0]) * sx, sb[1] + (h - nb[1]) * sy)
    fine = src.convert('RGBa').transform((w * SCALE * 4, h * SCALE * 4), Image.EXTENT, region, Image.BILINEAR)
    hd = fine.resize((w * SCALE, h * SCALE), Image.LANCZOS).convert('RGBA')
    small = np.asarray(fine.resize((w, h), Image.BOX).convert('RGBA')).astype(float)
    n = np.asarray(native).astype(float)
    m = n[..., 3] > 0
    err = np.abs(small[..., :3] - n[..., :3])[m].mean() if m.any() else 1e9
    big = native.resize((w * SCALE, h * SCALE), Image.NEAREST)
    big.alpha_composite(hd)
    return big, err


def grid_cells(source):
    cells = []
    for row in range(3):
        for col in range(3):
            box = (round(col * source.width / 3), round(row * source.height / 3),
                   round((col + 1) * source.width / 3), round((row + 1) * source.height / 3))
            cells.append(source.crop(box))
    return cells


def template(native):
    """Game pixels as RGB555, 0xFFFF where the sprite is transparent."""
    a = np.asarray(native).astype(np.uint16)
    v = ((a[..., 0] >> 3) << 10) | ((a[..., 1] >> 3) << 5) | (a[..., 2] >> 3)
    v[a[..., 3] == 0] = 0xFFFF
    return base64.b64encode(v.astype('<u2').tobytes()).decode()


def main():
    game, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    pictures, entries, report = [], [], []
    folders = [(folder, False) for folder in sorted(glob.glob(os.path.join(game, 'graphics/taichung/*/')))]
    # Wenyi's approved original/native pair uses the newer versioned character
    # directory. Append her without repacking the existing character cells.
    wenyi = os.path.join(game, 'graphics/taichung/characters/wenyi')
    if os.path.isfile(os.path.join(wenyi, 'overworld-v1.png')):
        folders.append((wenyi, True))
    for folder, versioned in folders:
        name = os.path.basename(folder.rstrip('/'))
        sources = sorted(glob.glob(os.path.join(folder if versioned else os.path.join(STORY, name), 'source', '*.png')))
        if not sources:
            continue
        for kind in ('overworld', 'battle'):
            stem = kind + ('-v1' if versioned else '')
            png, pal = os.path.join(folder, stem + '.png'), os.path.join(folder, stem + '.gbapal')
            if not os.path.exists(png) or not os.path.exists(pal):
                continue
            palette = gbapal(pal)
            sheet = to_rgba(Image.open(png), palette)
            candidates = [Image.open(s).convert('RGBA') for s in sources if os.path.basename(s).startswith(kind)]
            if kind == 'battle':
                frames = [(sheet, [c for c in candidates], False, 0)]
            else:
                count = sheet.width // 16
                frames = []
                for i in range(count):
                    cell = sheet.crop((i * 16, 0, i * 16 + 16, 32))
                    frames.append((cell, [grid_cells(c)[ORDER[i]] for c in candidates], False, i))
                    if i in WEST:
                        frames.append((cell.transpose(Image.FLIP_LEFT_RIGHT),
                                       [grid_cells(c)[ORDER[i]].transpose(Image.FLIP_LEFT_RIGHT) for c in candidates], True, i))
            for native, sources_for_frame, flipped, index in frames:
                best = min((fit(native, s) for s in sources_for_frame), key=lambda r: r[1], default=(None, 1e9))
                pic, err = best
                report.append({'character': name, 'kind': kind, 'frame': index, 'east': flipped, 'error': round(float(err), 1)})
                if pic is None or err > 40:
                    continue
                entries.append({'character': name, 'kind': kind, 'frame': index, 'east': flipped,
                                'w': native.width, 'h': native.height, 'pixels': template(native)})
                pictures.append(pic)

    # Pack the pictures into rows of an atlas no wider than 2048 px.
    x = y = row = 0
    for e, pic in zip(entries, pictures):
        if x + pic.width > 2048:
            x, y, row = 0, y + row, 0
        e['atlasX'], e['atlasY'] = x, y
        x += pic.width
        row = max(row, pic.height)
    atlas = Image.new('RGBA', (2048, y + row))
    for e, pic in zip(entries, pictures):
        atlas.paste(pic, (e['atlasX'], e['atlasY']))
    atlas = atlas.crop((0, 0, max(e['atlasX'] + e['w'] * SCALE for e in entries), y + row))
    atlas.save(os.path.join(out, 'atlas.png'), optimize=True)
    json.dump({'version': 1, 'scale': SCALE, 'atlas': 'atlas.png', 'sprites': entries}, open(os.path.join(out, 'sprites.json'), 'w'))
    skipped = [r for r in report if r['error'] > 40]
    print(f"{len(entries)} frames from {len({e['character'] for e in entries})} characters -> {out}")
    for r in skipped:
        print('  skipped (original does not match the game frame):', r)
    errs = sorted({(r['character'], r['kind']): max(q['error'] for q in report if (q['character'], q['kind']) == (r['character'], r['kind'])) for r in report}.items())
    for (c, k), e in errs:
        print(f'  {c:10} {k:9} worst frame error {e}')


if __name__ == '__main__':
    main()
