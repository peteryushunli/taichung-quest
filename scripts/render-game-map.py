#!/usr/bin/env python3
"""Render source metatiles for map QA; this is not the browser game renderer."""
import argparse
import json
import os
import struct
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
GAME = Path(os.environ.get('TAICHUNG_GAME_SOURCE', ROOT / 'vendor/pokefirered')).resolve()


def words(path):
    data = path.read_bytes()
    return struct.unpack('<' + 'H' * (len(data) // 2), data)


def render_metatiles():
    base = GAME / 'data/tilesets'
    primary = base / 'primary/general'
    secondary = base / 'secondary/pallet_town'
    sources = [Image.open(p / 'tiles.png') for p in (primary, secondary)]
    palettes = []
    for p in range(16):
        folder = primary if p < 7 else secondary
        lines = (folder / 'palettes' / f'{p:02}.pal').read_text().splitlines()[3:]
        palettes.append([tuple(map(int, line.split())) for line in lines])
    metatiles = [words(p / 'metatiles.bin') for p in (primary, secondary)]
    images = []
    for n in range(640 + len(metatiles[1]) // 8):
        data = metatiles[0] if n < 640 else metatiles[1]
        pos = n if n < 640 else n - 640
        image = Image.new('RGB', (16, 16), (0, 0, 0))
        for layer in range(2):
            for quadrant in range(4):
                value = data[pos * 8 + layer * 4 + quadrant]
                tile_n = value & 0x3ff
                tile_source = sources[0] if tile_n < 640 else sources[1]
                tile_n = tile_n if tile_n < 640 else tile_n - 640
                sx, sy = (tile_n % 16) * 8, (tile_n // 16) * 8
                palette = palettes[value >> 12]
                for y in range(8):
                    for x in range(8):
                        tx, ty = (7-x if value & 0x400 else x), (7-y if value & 0x800 else y)
                        index = tile_source.getpixel((sx + tx, sy + ty))
                        if index or layer == 0:
                            image.putpixel(((quadrant % 2) * 8 + x, (quadrant // 2) * 8 + y), palette[index])
        images.append(image)
    return images


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default=str(ROOT / 'docs/taichung-map.png'))
    parser.add_argument('--atlas', action='store_true')
    parser.add_argument('--grid', action='store_true')
    args = parser.parse_args()
    tiles = render_metatiles()
    if args.atlas:
        image = Image.new('RGB', (16 * 44, ((len(tiles)+15)//16) * 48), '#f0f0dd')
        draw = ImageDraw.Draw(image)
        for n, tile in enumerate(tiles):
            x, y = n % 16 * 44, n // 16 * 48
            image.paste(tile.resize((32,32), Image.Resampling.NEAREST), (x,y))
            draw.text((x,y+32), f'{n:03x}', fill='#222222')
    else:
        layouts = json.loads((GAME / 'data/layouts/layouts.json').read_text())['layouts']
        layout = next(l for l in layouts if l.get('id') == 'LAYOUT_PALLET_TOWN')
        data = words(GAME / layout['blockdata_filepath'])
        image = Image.new('RGB', (layout['width']*16, layout['height']*16))
        for n, value in enumerate(data):
            image.paste(tiles[value & 0x3ff], (n % layout['width'] * 16, n // layout['width'] * 16))
        image = image.resize((image.width*3, image.height*3), Image.Resampling.NEAREST)
        if args.grid:
            draw = ImageDraw.Draw(image)
            for y in range(layout['height']):
                for x in range(layout['width']):
                    blocked = bool(data[y*layout['width']+x] & 0xC00)
                    draw.rectangle((x*48, y*48, x*48+47, y*48+47), outline='#ee6666' if blocked else '#444444')
                    draw.text((x*48+1,y*48+1), f'{x},{y}', fill='#ffffff', stroke_width=1, stroke_fill='#000000')
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output)
    print(output)

if __name__ == '__main__':
    main()
