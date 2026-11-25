#!/usr/bin/env python3
"""Make every placed building and landmark crisp on every map it can be seen from.

    python3 scripts/complete-city-hd.py <placements.json> [web/public/hd/world]

Reads the placement list written by export-city-placements.py. The matching
builders skip a building that runs past its map's picture, and a landmark whose
original was never linked; this adds an entry for each such view, using the
picture the building already has elsewhere or its large original. It then
stores every picture at the 2x the game shows and lists, for each map, the maps
to prepare while the player is on it. It writes nothing if a building is left
out or a pixel that was crisp would be lost.
"""
import argparse
import base64
import glob
import io
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

SHOWN = 2            # hd-overlay.ts shows the city at twice the game's detail
CLOSE = 60           # summed RGB difference palette merging leaves between a sprite and the map
CRISP = .9           # share of a building's visible pixels that counts as crisp
LEAST = 64           # fewer visible pixels than this is not a view of the building
PROJECT = Path('/Users/peter/devday_hackathon')
ASSETS = PROJECT / 'assets'
STUDIES = PROJECT / 'artifacts/worktrees/c291d4842985/landmark-art'
NEW = ASSETS / 'city-development-20261116'
ORIGINALS = {
    'miyahara': STUDIES / 'miyahara-study-v1.png',
    'old-taichung-station': STUDIES / 'old-station-study-v1.png',
    'taichung-theater': STUDIES / 'theater-study-v1.png',
    'maple-garden': STUDIES / 'maple-garden-study-v1.png',
    'shen-ji-new-village': STUDIES / 'shen-ji-study-v1.png',
    'taichung-park': STUDIES / 'park-study-v1.png',
    'fine-arts-museum': PROJECT / 'artifacts/qa/2026-11-25-fine-arts-toned-sprite/imagegen-source.png',
    'tiger-city': NEW / 'new-locations/tiger-city/concept-v1.png',
    'city-hall': NEW / 'new-locations/city-hall/concept-v1.png',
    'jingming-street': NEW / 'new-locations/jingming-street/concept-v1.png',
    'rainbow-village': NEW / 'new-locations/rainbow-village/concept-v1.png',
    'folklore-park': NEW / 'beitun-landmarks-v1/folklore-park/source.png',
    'baseball-stadium': NEW / 'beitun-landmarks-v1/intercontinental-ballpark/source.png',
    'second-market': ASSETS / 'landmark-rework-20261110/detailed-facades-v1/buildings/second-market/source.png',
}


def decode(e):
    raw = np.frombuffer(base64.b64decode(e['covers']), np.uint8)
    return np.unpackbits(raw, count=e['w'] * e['h'], bitorder='little').reshape(e['h'], e['w']).astype(bool)


def encode(mask):
    return base64.b64encode(np.packbits(mask.ravel(), bitorder='little').tobytes()).decode()


def clip(shape, x, y, w, h):
    """The part of a box inside the map picture: its slice there, and its slice in the box."""
    a, b, c, d = max(0, x), max(0, y), min(shape[1], x + w), min(shape[0], y + h)
    return None if a >= c or b >= d else (np.s_[b:d, a:c], np.s_[b - y:d - y, a - x:c - x])


def sign(e):
    return e.get('kind') == 'sign'


class City:
    def __init__(self, world, placements):
        self.world, self.maps, self.placed = world, placements['maps'], placements['placements']
        self.sprites, self.refs = {}, {}

    def sprite(self, p):
        key = p['native'], p['mirrored']
        if key not in self.sprites:
            im = Image.open(p['native']).convert('RGBA')
            self.sprites[key] = ImageOps.mirror(im) if p['mirrored'] else im
        return self.sprites[key]

    def ref(self, pack, key):
        if key not in self.refs:
            self.refs[key] = np.asarray(Image.open(self.world / pack['maps'][key]['ref']).convert('RGB')).astype(int)
        return self.refs[key]

    def views(self, pack):
        """Every map picture a building shows in, with the pixels there that are its own."""
        for key, m in pack['maps'].items():
            if key not in self.maps:
                continue
            ref, (x0, y0, _, _) = self.ref(pack, key), self.maps[key]['rect']
            for n, p in enumerate(self.placed):
                s = np.asarray(self.sprite(p)).astype(int)
                x, y = (p['x'] - x0 + m['margin']) * 16, (p['y'] - y0 + m['margin']) * 16
                c = clip(ref.shape[:2], x, y, s.shape[1], s.shape[0])
                if not c:
                    continue
                own = np.zeros(s.shape[:2], bool)
                own[c[1]] = (s[c[1]][..., 3] >= 128) & (np.abs(ref[c[0]] - s[c[1]][..., :3]).sum(2) < CLOSE)
                if own.sum() >= LEAST:
                    yield dict(n=n, map=key, p=p, x=x, y=y, own=own, clip=c)

    def crisp(self, pack, key):
        """What the overlay leaves crisp on this map, following its own passes."""
        shape = self.ref(pack, key).shape[:2]
        drawn, restored, signs = np.zeros(shape, bool), np.zeros(shape, bool), np.zeros(shape, bool)
        for e in pack['maps'][key]['buildings']:
            c = clip(shape, e['x'], e['y'], e['w'], e['h'])
            if not c:
                continue
            mask = decode(e)[c[1]]
            if sign(e):
                signs[c[0]] |= mask
            else:
                drawn[c[0]] |= mask
                restored[c[0]] |= ~mask
        return (drawn & ~restored) | signs

    def survey(self, pack):
        """Each view with its crisp share, and each map's crisp pixels."""
        crisp = {key: self.crisp(pack, key) for key in self.maps}
        views = []
        for v in self.views(pack):
            v['share'] = (v['own'][v['clip'][1]] & crisp[v['map']][v['clip'][0]]).sum() / v['own'].sum()
            views.append(v)
        return views, crisp


def worst(views):
    """Every building's least crisp view."""
    out = {}
    for v in views:
        out[v['n']] = min(out.get(v['n'], 1), v['share'])
    return out


def pictures_in_use(city, pack, views):
    """The picture each sprite already has, and where it sits on the game-size sprite."""
    have = {}
    for v in views:
        key = v['p']['sprite'], v['p']['mirrored']
        if v['share'] <= CRISP or key in have:
            continue
        h, w = v['own'].shape
        best = None
        for e in pack['maps'][v['map']]['buildings']:
            ox = min(v['x'] + w, e['x'] + e['w']) - max(v['x'], e['x'])
            oy = min(v['y'] + h, e['y'] + e['h']) - max(v['y'], e['y'])
            if sign(e) or ox <= 0 or oy <= 0:
                continue
            fit = ox * oy - abs(e['w'] * e['h'] - w * h) * .3
            if best is None or fit > best[0]:
                best = fit, e
        if best:
            e = best[1]
            dx, dy = e['x'] - v['x'], e['y'] - v['y']
            if abs(dx) <= 48 and abs(dy) <= 96:
                have[key] = e['picture'], dx, dy, e['w'], e['h']
    return have


def from_original(city, p):
    """The large original fitted over its game-size sprite at the shown detail."""
    source = ORIGINALS.get(p['sprite'])
    if not source:
        found = sorted(glob.glob(str(ASSETS / f"**/{p['sprite']}/source.png"), recursive=True))
        if not found:
            sys.exit(f"no large original for {p['sprite']}")
        source = found[0]
    art = Image.open(source).convert('RGBA')
    art.putalpha(art.getchannel('A').point(lambda v: v if v > 40 else 0))
    art = art.crop(art.getbbox())
    x0, y0, x1, y1 = city.sprite(dict(p, mirrored=False)).getchannel('A').getbbox()
    art = art.resize(((x1 - x0) * SHOWN, (y1 - y0) * SHOWN), Image.LANCZOS)
    if p['mirrored']:
        art = ImageOps.mirror(art)
    x0, y0, x1, y1 = city.sprite(p).getchannel('A').getbbox()
    name = f"pictures/{'landmark' if p['kind'] == 'landmark' else 'building'}--{p['sprite']}{'-m' if p['mirrored'] else ''}.webp"
    return (name, x0, y0, x1 - x0, y1 - y0), art


def add(city, pack, views):
    """One entry for every view that is not crisp yet; returns the pictures it needs."""
    have, art, added = pictures_in_use(city, pack, views), {}, 0
    for v in views:
        if v['share'] > CRISP:
            continue
        p = v['p']
        key = p['sprite'], p['mirrored']
        if key not in have:
            have[key], image = from_original(city, p)
            art[have[key][0]] = image
        name, dx, dy, w, h = have[key]
        x, y = v['x'] + dx, v['y'] + dy
        mask = np.zeros((h, w), bool)
        sh, sw = v['own'].shape
        a, b, c, d = max(0, dx), max(0, dy), min(sw, dx + w), min(sh, dy + h)
        mask[b - dy:d - dy, a - dx:c - dx] = v['own'][b:d, a:c]
        listed, keep = pack['maps'][v['map']]['buildings'], []
        for e in listed:
            if not sign(e) and (e['picture'], e['x'], e['y']) == (name, x, y):
                mask |= decode(e)          # an earlier part of this same view
            else:
                keep.append(e)
        at = next((i for i, e in enumerate(keep) if sign(e)), len(keep))
        keep.insert(at, dict(sprite=p['sprite'], mirrored=p['mirrored'], x=x, y=y, w=w, h=h, picture=name, covers=encode(mask)))
        listed[:] = keep
        added += 1
    return art, added


def nearby(pack, steps):
    """Maps to have ready on each map: one step away, and from a room also the street past the next room."""
    for key, m in pack['maps'].items():
        near = list(steps.get(key, []))
        if not m['buildings']:
            near += [k for room in near for k in steps.get(room, []) if k != key and k not in near and not pack['maps'][room]['buildings']]
        m['near'] = [k for k in near if k in pack['maps']]


def store(world, pack, art):
    """Every picture at the shown size: sign art pixel for pixel, the rest smoothly."""
    size, flat = {}, set()
    for m in pack['maps'].values():
        for e in m['buildings']:
            size.setdefault(e['picture'], (e['w'] * SHOWN, e['h'] * SHOWN))
            if sign(e):
                flat.add(e['picture'])
    out, named = {}, {}
    for name, wanted in size.items():
        image = art[name] if name in art else Image.open(world / name).convert('RGBA')
        named[name] = str(Path(name).with_suffix('.webp'))
        if name not in art and image.size == wanted and named[name] == name:
            out[name] = (world / name).read_bytes()
            continue
        if image.size != wanted:
            image = image.resize(wanted, Image.NEAREST if name in flat else Image.LANCZOS)
        data = io.BytesIO()
        image.save(data, 'WEBP', method=6, **(dict(lossless=True) if name in flat else dict(quality=90)))
        out[named[name]] = data.getvalue()
    for m in pack['maps'].values():
        for e in m['buildings']:
            e['picture'] = named[e['picture']]
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('placements', type=Path)
    ap.add_argument('world', type=Path, nargs='?', default=Path(__file__).resolve().parents[1] / 'web/public/hd/world')
    args = ap.parse_args()
    placements = json.loads(args.placements.read_text())
    city = City(args.world, placements)
    pack = json.loads((args.world / 'pack.json').read_text())
    before, was = city.survey(pack)
    art, added = add(city, pack, before)
    after, now = city.survey(pack)
    total = len(city.placed)
    count = lambda views: sum(s > CRISP for s in worst(views).values())
    print(f'crisp wherever they are seen: {count(before)} of {total}, now {count(after)}; views added {added}, pictures added {len(art)}')
    lost = {key: int((was[key] & ~now[key]).sum()) for key in was}
    if count(after) != total:
        sys.exit(f"left out: {sorted({city.placed[n]['sprite'] for n, s in worst(after).items() if s <= CRISP})}")
    if any(lost.values()):
        sys.exit(f'would lose crisp pixels: { {k: v for k, v in lost.items() if v} }')
    nearby(pack, placements['steps'])
    pictures = store(args.world, pack, art)
    pack['originals'] = sorted(set(pack['originals']) | {Path(n).stem.split('--', 1)[1] for n in art})
    for old in (args.world / 'pictures').iterdir():
        if f'pictures/{old.name}' not in pictures:
            old.unlink()
    for name, data in pictures.items():
        (args.world / name).write_bytes(data)
    (args.world / 'pack.json').write_text(json.dumps(pack, separators=(',', ':')) + '\n')
    print(f'{len(pictures)} pictures, {sum(map(len, pictures.values())) / 1e6:.2f} MB')


if __name__ == '__main__':
    main()
