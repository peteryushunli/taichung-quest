#!/usr/bin/env python3
"""Derive web art from the rendered city map (src/assets/landing/city-map.png, 16 px per tile).

- src/assets/landmarks/map/<id>.png: map-view art for each place with an `artRect`
  [x0, y0, x1, y1] (world tiles, end exclusive) in src/data/landmarks.json or sights.json.
- src/assets/minimap/city.png: the whole city at 4 px per tile for the live minimap.

Re-run after re-rendering city-map.png.
"""
import json
from pathlib import Path

from PIL import Image

WEB = Path(__file__).resolve().parent.parent
TILE = 16
MINIMAP_TILE = 4
city = Image.open(WEB / 'src/assets/landing/city-map.png').convert('RGBA')

crops = WEB / 'src/assets/landmarks/map'
crops.mkdir(parents=True, exist_ok=True)
for catalog in ('landmarks.json', 'sights.json'):
    for place in json.loads((WEB / 'src/data' / catalog).read_text()):
        rect = place.get('artRect')
        if not rect:
            continue
        x0, y0, x1, y1 = rect
        city.crop((x0 * TILE, y0 * TILE, x1 * TILE, y1 * TILE)).save(crops / f"{place['id']}.png", optimize=True)
        print(place['id'], f'{x1 - x0}x{y1 - y0} tiles')

minimap = WEB / 'src/assets/minimap'
minimap.mkdir(parents=True, exist_ok=True)
# Box-average each 4x4 block so streets and roofs read as clean colour at small sizes.
# Areas outside every map are transparent; show them as the landing map's meadow canvas.
small = city.reduce(TILE // MINIMAP_TILE)
canvas = Image.new('RGBA', small.size, (0xDC, 0xE1, 0xB2, 255))
canvas.alpha_composite(small)
small = canvas.convert('RGB').quantize(colors=96, dither=Image.Dither.NONE)
small.save(minimap / 'city.png', optimize=True)
print('minimap', small.size)
