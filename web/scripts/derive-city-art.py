#!/usr/bin/env python3
"""Derive web art from the rendered city map (src/assets/landing/city-map.png, 16 px per tile).

- src/assets/landmarks/map/<id>.png: map-view art for each place with an `artRect`
  [x0, y0, x1, y1] (world tiles, end exclusive) in src/data/landmarks.json or sights.json.
- src/assets/minimap/city.png: the flat radar map for the live minimap, RADAR_TILE px per tile,
  with a RADAR_MARGIN-tile border of outside colour so the city's edge never lands on the
  image's own edge (keep both in step with RADAR_ART in src/minimap-model.ts).
  Every world tile is one of four classes, drawn in one flat colour each:
    outside  more than half the tile is transparent (no map there)
    road     asphalt (street #5a5a73 or highway #414a6a); see `classify_roads`
    water    more than half the tile is the still water blue #6aa4e6
    land     everything else: sidewalks, plazas, buildings, parks
  The dark outside against tan land and blue water is what draws the city's outline.

Re-run after re-rendering city-map.png.
"""
import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops

WEB = Path(__file__).resolve().parent.parent
TILE = 16
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

# --- Radar map ---------------------------------------------------------------
RADAR_TILE, RADAR_MARGIN = 1, 2
STREET, HIGHWAY, STILL_WATER = (0x5A, 0x5A, 0x73), (0x41, 0x4A, 0x6A), (0x6A, 0xA4, 0xE6)
# Strong road tiles are mostly asphalt. Weak ones (cars, zebra crossings, lane edges) are
# road only when they touch a long run of strong road; building roofs that reuse the
# asphalt greys form small islands and are dropped.
STRONG_ROAD, WEAK_ROAD, MIN_ROAD_RUN = .6, .25, 24
# A FireRed Town Map palette (every channel a multiple of 8, as on the GBA): grass-green
# land, cream roads, sea blue, slate beyond the city's edge.
COLOURS = {
    'outside': (0x38, 0x48, 0x58), 'land': (0x88, 0xC8, 0x70),
    'road': (0xF8, 0xF0, 0xC8), 'water': (0x50, 0x90, 0xE8),
}
WIDTH, HEIGHT = city.width // TILE, city.height // TILE
red, green, blue, alpha = city.split()


def tile_fraction(*colours, transparent=False):
    """Per-tile share (0..1) of pixels that are exactly one of `colours` (or fully transparent)."""
    if transparent:
        mask = alpha.point(lambda v: 255 if v == 0 else 0)
    else:
        mask = Image.new('L', city.size, 0)
        for r, g, b in colours:
            hit = ImageChops.multiply(red.point(lambda v, r=r: 255 if v == r else 0), green.point(lambda v, g=g: 255 if v == g else 0))
            hit = ImageChops.multiply(hit, blue.point(lambda v, b=b: 255 if v == b else 0))
            mask = ImageChops.lighter(mask, ImageChops.multiply(hit, alpha.point(lambda v: 255 if v == 255 else 0)))
    small = mask.reduce(TILE)
    return [[small.getpixel((x, y)) / 255 for x in range(WIDTH)] for y in range(HEIGHT)]


def tiles():
    return ((x, y) for y in range(HEIGHT) for x in range(WIDTH))


def neighbours(x, y):
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < WIDTH and 0 <= ny < HEIGHT:
            yield nx, ny


def components(cells):
    """4-connected groups of a set of (x, y) tiles."""
    left, groups = set(cells), []
    while left:
        queue, group = deque([left.pop()]), set()
        while queue:
            cell = queue.popleft()
            group.add(cell)
            for n in neighbours(*cell):
                if n in left:
                    left.remove(n)
                    queue.append(n)
        groups.append(group)
    return groups


def classify_roads(asphalt, blocked):
    strong = {(x, y) for x, y in tiles() if asphalt[y][x] >= STRONG_ROAD and (x, y) not in blocked}
    weak = {(x, y) for x, y in tiles() if asphalt[y][x] >= WEAK_ROAD and (x, y) not in blocked}
    runs = set().union(*(group for group in components(strong) if len(group) >= MIN_ROAD_RUN))
    road = set().union(*(group for group in components(weak) if group & runs))

    def close_gaps(road):
        # Fill one-tile gaps (a car on the kerb lane, a crossing) so roads read as continuous lines.
        for _ in range(2):
            road = road | {(x, y) for x, y in tiles() if (x, y) not in blocked and (
                {(x - 1, y), (x + 1, y)} <= road or {(x, y - 1), (x, y + 1)} <= road)}
        return road

    road = close_gaps(road)
    # Streets are at least two tiles wide: drop one-tile spurs (kerbs, lone roof tiles).
    road = {(x, y) for x, y in road if any(
        {(x + dx, y + dy), (x + dx + 1, y + dy), (x + dx, y + dy + 1), (x + dx + 1, y + dy + 1)} <= road
        for dx in (-1, 0) for dy in (-1, 0))}
    return close_gaps(road)


transparent = tile_fraction(transparent=True)
outside = {(x, y) for x, y in tiles() if transparent[y][x] > .5}
water_share = tile_fraction(STILL_WATER)
water = {(x, y) for x, y in tiles() if water_share[y][x] > .5} - outside
road = classify_roads(tile_fraction(STREET, HIGHWAY), outside | water)
kind = {cell: 'outside' if cell in outside else 'road' if cell in road else 'water' if cell in water else 'land' for cell in tiles()}

radar = Image.new('RGB', ((WIDTH + 2 * RADAR_MARGIN) * RADAR_TILE, (HEIGHT + 2 * RADAR_MARGIN) * RADAR_TILE), COLOURS['outside'])
for (x, y), name in kind.items():
    px, py = (x + RADAR_MARGIN) * RADAR_TILE, (y + RADAR_MARGIN) * RADAR_TILE
    radar.paste(COLOURS[name], (px, py, px + RADAR_TILE, py + RADAR_TILE))

minimap = WEB / 'src/assets/minimap'
minimap.mkdir(parents=True, exist_ok=True)
radar.quantize(colors=len(COLOURS), dither=Image.Dither.NONE).save(minimap / 'city.png', optimize=True)
counts = {name: sum(1 for value in kind.values() if value == name) for name in ('road', 'water', 'land', 'outside')}
print('minimap', radar.size, counts)
