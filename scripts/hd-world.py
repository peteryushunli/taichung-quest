#!/usr/bin/env python3
"""Build the high-resolution building pack for every Taichung map of a native build.

For each map this renders the picture the game draws: the map, the seven-cell
strip the engine copies from connected maps (drawn with this map's own tiles,
as the game does), and the layout border beyond. The browser uses that picture
to find where the screen is. It then finds every building whose original art
we keep (assets/**/source.png beside a native.png) by matching the game-size
sprite against the picture, and writes a 4x picture of each one.

    python3 scripts/hd-world.py <native game checkout> <out dir> [--group 43]

Writes <out>/maps/<group>.<map>.png, <out>/atlas.png and <out>/pack.json.
"""
import argparse
import base64
import glob
import hashlib
import importlib.util
import json
import os
import struct

import numpy as np
from PIL import Image

SCALE = 4
MARGIN = 8          # cells past each edge in the picture (the screen shows up to ~8.5 when walking)
STRIP = 7           # MAP_OFFSET: connected-map cells the engine copies into its grid
ASSETS = '/Users/peter/devday_hackathon/assets'


def words(path):
    data = open(path, 'rb').read()
    return list(struct.unpack(f'<{len(data) // 2}H', data))


def load_renderer(game):
    spec = importlib.util.spec_from_file_location('render_maps', os.path.join(game, 'tools/taichung/render_maps.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def render_metatiles(renderer, game, primary, secondary):
    """The native renderer's metatiles; a stock tileset whose metatiles name tiles past
    the end of its sheet (unused ones) gets those drawn in colour 0 instead of failing."""
    from pathlib import Path
    original = Image.Image.getpixel
    def getpixel(self, xy):
        if xy[0] >= self.width or xy[1] >= self.height:
            return 0
        return original(self, xy)
    checked = renderer.render_metatiles.__code__
    try:
        return renderer.render_metatiles(Path(game), primary, secondary)
    except ValueError:
        pass
    # Re-run with the bounds check disabled: patch the module's source.
    src = open(renderer.__file__).read().replace('raise ValueError(f"Metatile {n:#x} references missing graphic {tile_n:#x}")', 'continue')
    namespace = {}
    exec(compile(src, renderer.__file__, 'exec'), namespace)
    return namespace['render_metatiles'](Path(game), primary, secondary)


class Layouts:
    def __init__(self, game):
        self.game = game
        self.by_id = {l['id']: l for l in json.load(open(os.path.join(game, 'data/layouts/layouts.json')))['layouts'] if 'id' in l}

    def cells(self, layout_id):
        l = self.by_id[layout_id]
        return l['width'], l['height'], words(os.path.join(self.game, l['blockdata_filepath']))

    def border(self, layout_id):
        l = self.by_id[layout_id]
        return l.get('border_width', 2), l.get('border_height', 2), words(os.path.join(self.game, l['border_filepath']))


def map_grid(game, layouts, maps, name):
    """Metatile ids the engine holds for this map, with MARGIN cells around it."""
    m = maps[name]
    w, h, cells = layouts.cells(m['layout'])
    bw, bh, border = layouts.border(m['layout'])
    W, H = w + 2 * MARGIN, h + 2 * MARGIN
    grid = np.zeros((H, W), np.int32)
    for gy in range(H):
        for gx in range(W):
            x, y = gx - MARGIN, gy - MARGIN
            grid[gy, gx] = border[(x % bw) + (y % bh) * bw] & 0x3FF
    for c in m.get('connections') or []:
        other = maps[MAP_IDS[c['map']]]
        ow, oh, ocells = layouts.cells(other['layout'])
        off = c['offset']
        for oy in range(oh):
            for ox in range(ow):
                if c['direction'] == 'up':
                    x, y = ox + off, oy - oh
                elif c['direction'] == 'down':
                    x, y = ox + off, h + oy
                elif c['direction'] == 'left':
                    x, y = ox - ow, oy + off
                elif c['direction'] == 'right':
                    x, y = w + ox, oy + off
                else:
                    continue
                if -STRIP <= x < w + STRIP and -STRIP <= y < h + STRIP and -MARGIN <= x < w + MARGIN and -MARGIN <= y < h + MARGIN:
                    grid[y + MARGIN, x + MARGIN] = ocells[ox + oy * ow] & 0x3FF
    for y in range(h):
        for x in range(w):
            grid[y + MARGIN, x + MARGIN] = cells[x + y * w] & 0x3FF
    return grid, (w, h)


def render(grid, tiles):
    H, W = grid.shape
    image = Image.new('RGB', (W * 16, H * 16))
    for gy in range(H):
        for gx in range(W):
            n = int(grid[gy, gx])
            if n < len(tiles):
                image.paste(tiles[n], (gx * 16, gy * 16))
    return image


def library():
    """Every game-size sprite that has its original kept beside it, once per picture."""
    seen, out = set(), []
    for native in sorted(glob.glob(os.path.join(ASSETS, '**', 'native.png'), recursive=True)):
        source = os.path.join(os.path.dirname(native), 'source.png')
        if not os.path.exists(source):
            continue
        im = Image.open(native).convert('RGBA')
        key = hashlib.sha256(im.tobytes()).hexdigest()
        if key in seen:
            continue
        seen.add(key)
        out.append({'name': os.path.relpath(os.path.dirname(native), ASSETS), 'native': im, 'source': source})
    return out


def find(ref_arr, sprite, step=16):
    """Places on the 16-px grid where the sprite's opaque pixels match the picture.

    The game merges palettes, so colours may move a little: a match is a small
    average difference with nearly every pixel close.
    """
    s = np.asarray(sprite).astype(np.int16)
    mask = s[..., 3] > 0
    if mask.sum() < 64:
        return []
    sh, sw = mask.shape
    H, W, _ = ref_arr.shape
    found = []
    # Cheap first pass on a sparse set of opaque pixels.
    ys, xs = np.nonzero(mask)
    pick = np.linspace(0, len(ys) - 1, min(48, len(ys))).astype(int)
    py, px = ys[pick], xs[pick]
    want = s[py, px, :3]
    for oy in range(0, H - sh + 1, step):
        for ox in range(0, W - sw + 1, step):
            d = np.abs(ref_arr[oy + py, ox + px] - want).sum(axis=1)
            if (d < 48).mean() < 0.8:
                continue
            region = ref_arr[oy:oy + sh, ox:ox + sw]
            diff = np.abs(region - s[..., :3]).sum(axis=2)[mask]
            if diff.mean() < 24 and (diff < 48).mean() > 0.9:
                found.append((ox, oy, float(diff.mean())))
    return found


def hd_picture(native, source):
    w, h = native.size
    big = native.resize((w * SCALE, h * SCALE), Image.NEAREST)
    src = source.convert('RGBA')
    src.putalpha(src.getchannel('A').point(lambda v: 0 if v < 48 else v))
    sb = src.getchannel('A').point(lambda v: 255 if v >= 128 else 0).getbbox()
    nb = native.getchannel('A').getbbox()
    sx = (sb[2] - sb[0]) / (nb[2] - nb[0])
    sy = (sb[3] - sb[1]) / (nb[3] - nb[1])
    region = (sb[0] - nb[0] * sx, sb[1] - nb[1] * sy, sb[0] + (w - nb[0]) * sx, sb[1] + (h - nb[1]) * sy)
    fine = src.convert('RGBa').transform((w * SCALE * 4, h * SCALE * 4), Image.EXTENT, region, Image.BILINEAR)
    big.alpha_composite(fine.resize((w * SCALE, h * SCALE), Image.LANCZOS).convert('RGBA'))
    return big


def cover_mask(sprite, region):
    """Pixels the 4x picture may cover: the sprite as the map shows it, plus a 1-px ring."""
    s = np.asarray(sprite).astype(np.int16)
    opaque = s[..., 3] > 0
    own = opaque & (np.abs(region - s[..., :3]).sum(axis=2) < 48)
    ring = np.zeros_like(own)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            ring |= np.roll(np.roll(own, dy, 0), dx, 1)
    covers = (own | (ring & ~opaque)).astype(np.uint8).ravel()
    return base64.b64encode(np.packbits(covers, bitorder='little').tobytes()).decode()


MAP_IDS = {}


class Streamed:
    """Metatiles of Codex's tile-streaming Boulevard maps, decoded as tile_stream.c draws them.

    Each map has its own metatile table (8 entries: layer 0 then layer 1) and a
    bank byte per entry: tile number bits 10-15 in the low six bits, palette bits
    4-5 in the top two. Tiles below 640 come from the primary sheet, the rest
    from the shared tiles.bin; palettes below 7 are the primary's, the rest come
    from the shared palettes.bin. Grid words carry metatile id bit 10 in bit 11.
    """
    def __init__(self, game):
        sec = os.path.join(game, 'data/tilesets/secondary/taichung_boulevard')
        pri = os.path.join(game, 'data/tilesets/primary/taichung_approved_old_city_north')
        # The streamed city isolates its animated flower graphics from the
        # legacy primary while retaining that primary's palettes/metatiles.
        city_tiles = os.path.join(game, 'data/tilesets/primary/taichung_boulevard/tiles.4bpp')
        primary_tiles = city_tiles if os.path.isfile(city_tiles) else os.path.join(pri, 'tiles.4bpp')
        self.sec = sec
        self.tiles = [open(primary_tiles, 'rb').read(), open(os.path.join(sec, 'tiles.bin'), 'rb').read()]
        pal = words(os.path.join(sec, 'palettes.bin'))
        self.palettes = [pal[i * 16:(i + 1) * 16] for i in range(len(pal) // 16)]
        for i in range(7):
            self.palettes[i] = words(os.path.join(pri, 'palettes', f'{i:02}.gbapal'))[:16]
        self.primary = words(os.path.join(pri, 'metatiles.bin'))
        self.tile_cache = {}

    def tile(self, n):
        if n not in self.tile_cache:
            data, base = (self.tiles[0], n) if n < 640 else (self.tiles[1], n - 640)
            raw = data[base * 32:(base + 1) * 32]
            if len(raw) < 32:
                raw = bytes(32)
            px = np.zeros((8, 8), np.uint8)
            for i, b in enumerate(raw):
                px[i // 4, (i % 4) * 2] = b & 15
                px[i // 4, (i % 4) * 2 + 1] = b >> 4
            self.tile_cache[n] = px
        return self.tile_cache[n]

    def color(self, pal, index):
        p = self.palettes[pal] if pal < len(self.palettes) else self.palettes[0]
        c = p[index] & 0x7FFF
        return ((c & 31) << 3, (c >> 5 & 31) << 3, (c >> 10 & 31) << 3)

    def metatiles(self, num):
        table = words(os.path.join(self.sec, f'map_{num:02}_metatiles.bin'))
        banks = open(os.path.join(self.sec, f'map_{num:02}_banks.bin'), 'rb').read()
        count = len(table) // 8
        cache = {}

        def draw(key):
            if key in cache:
                return cache[key]
            if key < 640:
                entries = [(self.primary[key * 8 + i], 0) for i in range(8)]
            else:
                k = key - 640
                if k >= count:
                    k = 0
                entries = [(table[k * 8 + i], banks[k * 8 + i]) for i in range(8)]
            img = np.zeros((16, 16, 3), np.uint8)       # backdrop: the map loader keeps it black
            for i, (raw, bank) in enumerate(entries):
                tile = ((bank & 0x3F) << 10) | (raw & 0x3FF)
                if tile == 0:
                    continue
                pal = (raw >> 12) | ((bank >> 6) << 4)
                px = self.tile(tile)
                if raw & 0x400:
                    px = px[:, ::-1]
                if raw & 0x800:
                    px = px[::-1, :]
                q = i % 4
                oy, ox = (q // 2) * 8, (q % 2) * 8
                for y in range(8):
                    for x in range(8):
                        v = px[y, x]
                        if v:
                            img[oy + y, ox + x] = self.color(pal, v)
            cache[key] = Image.fromarray(img, 'RGB')
            return cache[key]
        return draw


def streamed_grid(game, layouts, maps, name):
    m = maps[name]
    l = layouts.by_id[m['layout']]
    w, h = l['width'], l['height']
    cells = words(os.path.join(game, l['blockdata_filepath']))
    bw, bh = l['border_width'], l['border_height']
    border = words(os.path.join(game, l['border_filepath']))
    key = lambda v: (v & 0x3FF) | ((v >> 1) & 0x400)
    grid = np.zeros((h + 2 * MARGIN, w + 2 * MARGIN), np.int32)
    for gy in range(grid.shape[0]):
        for gx in range(grid.shape[1]):
            x, y = gx - MARGIN, gy - MARGIN
            if 0 <= x < w and 0 <= y < h:
                grid[gy, gx] = key(cells[x + y * w])
            else:
                grid[gy, gx] = key(border[(x % bw) + (y % bh) * bw])
    return grid, (w, h)


def render_fn(grid, draw):
    H, W = grid.shape
    image = Image.new('RGB', (W * 16, H * 16))
    for gy in range(H):
        for gx in range(W):
            image.paste(draw(int(grid[gy, gx])), (gx * 16, gy * 16))
    return image


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('game'); ap.add_argument('out'); ap.add_argument('--group', type=int, default=43)
    ap.add_argument('--map-number', type=int, action='append',
                    help='Render only these map numbers in the selected group.')
    args = ap.parse_args()
    game, out = args.game, args.out
    os.makedirs(os.path.join(out, 'maps'), exist_ok=True)
    renderer = load_renderer(game)
    layouts = Layouts(game)
    groups = json.load(open(os.path.join(game, 'data/maps/map_groups.json')))
    maps = {}
    for g in groups['group_order']:
        for n in groups[g]:
            m = json.load(open(os.path.join(game, 'data/maps', n, 'map.json')))
            maps[n] = m
            MAP_IDS[m['id']] = n
    tile_cache = {}
    streamed = None
    lib = library()
    entries, pictures, pack_maps = [], {}, {}
    group_maps = groups[groups['group_order'][args.group]]
    selected = sorted(set(args.map_number)) if args.map_number else range(len(group_maps))
    if any(index not in range(len(group_maps)) for index in selected):
        ap.error('Map number is outside the selected group.')
    for index in selected:
        name = group_maps[index]
        m = maps[name]
        layout = layouts.by_id[m['layout']]
        key = (layout['primary_tileset'], layout['secondary_tileset'])
        if key[1].startswith('gTileset_Boulevard'):
            streamed = streamed or Streamed(game)
            grid, (w, h) = streamed_grid(game, layouts, maps, name)
            ref = render_fn(grid, streamed.metatiles(int(key[1].removeprefix('gTileset_Boulevard'))))
        else:
            if key not in tile_cache:
                try:
                    tile_cache[key] = render_metatiles(renderer, game, *key)
                except ValueError as error:
                    tile_cache[key] = None
                    print(f'{args.group}.{index:<3} {name:34} skipped: {error}')
            if tile_cache[key] is None:
                continue
            grid, (w, h) = map_grid(game, layouts, maps, name)
            ref = render(grid, tile_cache[key])
        file = f'maps/{args.group}.{index}.png'
        ref.save(os.path.join(out, file), optimize=True)
        arr = np.asarray(ref).astype(np.int16)
        buildings = []
        for item in lib:
            for mirrored in (False, True):
                sprite = item['native'].transpose(Image.FLIP_LEFT_RIGHT) if mirrored else item['native']
                for ox, oy, err in find(arr, sprite):
                    pk = (item['name'], mirrored)
                    if pk not in pictures:
                        pic = hd_picture(item['native'], Image.open(item['source']))
                        pictures[pk] = pic.transpose(Image.FLIP_LEFT_RIGHT) if mirrored else pic
                    region = arr[oy:oy + sprite.height, ox:ox + sprite.width]
                    buildings.append({'sprite': item['name'], 'mirrored': mirrored, 'x': ox, 'y': oy,
                                      'w': sprite.width, 'h': sprite.height, 'error': round(err, 1),
                                      'covers': cover_mask(sprite, region)})
        # A symmetric sprite matches both ways round: keep one.
        unique = {}
        for b in sorted(buildings, key=lambda b: b['error']):
            unique.setdefault((b['x'], b['y'], b['sprite']), b)
        buildings = list(unique.values())
        pack_maps[f'{args.group}.{index}'] = {'name': name, 'ref': file, 'width': ref.width, 'height': ref.height,
                                               'margin': MARGIN, 'cells': [w, h], 'buildings': buildings}
        print(f'{args.group}.{index:<3} {name:34} {w}x{h}  {len(buildings)} buildings: ' +
              ', '.join(sorted({b["sprite"].split("/")[-1] for b in buildings})))

    # One picture file per building design, so the browser only fetches what a map shows.
    os.makedirs(os.path.join(out, 'pictures'), exist_ok=True)
    files = {}
    for (name, mirrored), pic in sorted(pictures.items()):
        file = f"pictures/{name.replace('/', '--')}{'-mirrored' if mirrored else ''}.webp"
        pic.save(os.path.join(out, file), 'WEBP', quality=92, method=6)
        files[(name, mirrored)] = file
    for m in pack_maps.values():
        for b in m['buildings']:
            b['picture'] = files[(b['sprite'], b['mirrored'])]
    rom = os.path.join(game, 'pokefirered.gba')
    json.dump({'version': 2, 'scale': SCALE, 'group': args.group,
               'romSha256': hashlib.sha256(open(rom, 'rb').read()).hexdigest() if os.path.exists(rom) else None,
               'maps': pack_maps, 'originals': sorted({k[0] for k in pictures})},
              open(os.path.join(out, 'pack.json'), 'w'))
    print(f'{sum(len(m["buildings"]) for m in pack_maps.values())} buildings, {len(pictures)} pictures -> {out}')


if __name__ == '__main__':
    main()
