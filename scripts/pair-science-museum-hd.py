#!/usr/bin/env python3
"""Pair the enlarged original Science Museum with the compiled camera references."""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import runpy

import numpy as np
from PIL import Image


SPRITE = 'natural-science-museum'
PICTURE = 'pictures/science-museum-original.webp'
NATIVE_ART = Path('tools/taichung/boulevard_city/landmark-art') / (SPRITE + '.png')


def read(path):
    return json.loads(path.read_text())


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def covered_sprite(native_art, reference, x, y):
    """Match the authored opaque pixels present in the camera reference."""
    height, width = native_art.shape[:2]
    left, top = max(0, x), max(0, y)
    right, bottom = min(reference.shape[1], x + width), min(reference.shape[0], y + height)
    if left >= right or top >= bottom:
        return None
    clip = np.s_[top-y:bottom-y, left-x:right-x]
    art_opaque = native_art[clip][:, :, 3] > 0
    if not art_opaque.any():
        return None
    source = native_art[clip][:, :, :3]
    pixels = reference[top:bottom, left:right]
    own = art_opaque & np.all((pixels >> 3) == (source >> 3), axis=2)
    if int(own.sum()) < int(art_opaque.sum()) * 0.97:
        return None
    mask = np.zeros((height, width), dtype=bool)
    mask[clip] = own
    return mask, int(own.sum())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('native', 'baseline', 'output', 'map_report', 'art_receipt', 'sharp_art', 'hd_handoff', 'receipt'):
        parser.add_argument(name, type=Path)
    args = parser.parse_args()
    report = read(args.map_report)
    art = read(args.art_receipt)
    handoff = read(args.hd_handoff)
    expected_coverage = {row['nativeKey']:row for row in handoff['coverage']}
    museum = report['scienceMuseumExterior']
    assert museum['worldRect'] == art['afterWorldRect']
    assert museum['previousWorldRect'] == art['beforeWorldRect']
    assert sorted(museum['doorTiles']) == sorted(art['doors'])
    assert digest(args.sharp_art) == art['assetHashes']['science-museum-4x.png']
    assert digest(args.native / NATIVE_ART) == report['spriteSha256'][SPRITE] == art['assetHashes']['science-museum-native.png']
    native_art = np.asarray(Image.open(args.native / NATIVE_ART).convert('RGBA')).astype(np.int16)
    art_height, art_width = native_art.shape[:2]
    left, top, right, bottom = museum['worldRect']
    assert [art_width, art_height] == [(right-left)*16, (bottom-top)*16] == art['nativeCanvas']
    with Image.open(args.sharp_art) as picture:
        sharp = picture.convert('RGBA')
    assert sharp.size == (art_width*4, art_height*4)

    pack = read(args.baseline / 'pack.json')
    renderer = runpy.run_path(str(Path(__file__).with_name('hd-world.py')))
    native = str(args.native)
    layouts = renderer['Layouts'](native)
    tilesets = renderer['Streamed'](native)
    rows = {f'43.{m["number"]}':m for m in report['maps']}
    source_maps = {m['name']:read(args.native/'data/maps'/m['name']/'map.json') for m in report['maps']}
    # The source compiler moves the two plaza lamps south by two cells.
    # Include their old and new sprite footprints when checking visual scope.
    changed_rects = [museum['worldRect']]
    for x, y in museum['plazaLampHeads']:
        changed_rects.append([x, y-2, x+1, y+2])

    changed_refs, placements = [], []
    checked_cells = set()
    for key, row in rows.items():
        item = pack['maps'][key]
        origin_x, origin_y = row['worldRect'][:2]
        padded_x, padded_y = origin_x-item['margin'], origin_y-item['margin']
        grid, _ = renderer['streamed_grid'](native, layouts, source_maps, row['name'])
        current_image = renderer['render_fn'](grid, tilesets.metatiles(row['number']))
        before = np.asarray(Image.open(args.baseline/item['ref']).convert('RGB'))
        after = np.asarray(current_image)
        assert before.shape == after.shape == (item['height'], item['width'], 3)
        delta = np.any(before != after, axis=2)
        if delta.any():
            ys, xs = np.nonzero(delta)
            affected = set(zip((xs//16+padded_x).tolist(), (ys//16+padded_y).tolist()))
            outside = {(x,y) for x,y in affected if not any(a<=x<c and b<=y<d for a,b,c,d in changed_rects)}
            assert not outside, (key, outside)
            checked_cells |= affected
            destination = args.output/item['ref']
            destination.parent.mkdir(parents=True, exist_ok=True)
            current_image.save(destination, optimize=True)
            changed_refs.append(dict(map=key, changedPixels=int(delta.sum()), sha256=digest(destination)))
        else:
            # The assembly starts with the previous complete HD pack.
            destination = args.output/item['ref']
            assert destination.is_file() and digest(destination) == digest(args.baseline/item['ref'])

        x, y = (left-padded_x)*16, (top-padded_y)*16
        coverage = covered_sprite(native_art, after, x, y)
        if coverage is None:
            continue
        mask, opaque_covered = coverage
        expected = expected_coverage[key]
        covers = base64.b64encode(np.packbits(mask.ravel(), bitorder='little')).decode()
        assert [x,y,art_width,art_height] == expected['fullEnvelope'], key
        assert opaque_covered == expected['matchedPixels'] and covers == expected['covers'], key
        ref = next(row for row in changed_refs if row['map']==key)
        assert ref['sha256'] == expected['refSha256'], key
        assert all(entry['sprite'] != SPRITE for entry in item['buildings'])
        # Preserve the existing sign pass and its foreground ordering.
        insertion = next((i for i, entry in enumerate(item['buildings']) if entry.get('kind')=='sign'),
                         len(item['buildings']))
        item['buildings'].insert(insertion, {
            'sprite': SPRITE, 'mirrored': False, 'x': x, 'y': y, 'w': art_width, 'h': art_height,
            'picture': PICTURE, 'covers': covers,
        })
        placements.append(dict(map=key, envelope=[x,y,art_width,art_height], opaquePixels=opaque_covered,
                               totalMaskPixels=int(mask.sum()), clipped=x<0 or y<0 or x+art_width>before.shape[1] or y+art_height>before.shape[0]))

    assert set(p['map'] for p in placements) == {'43.58', '43.62'}, placements
    assert checked_cells, 'No compiled Museum changes'
    assert len(rows) == 54, 'Incomplete city reference check'
    assert {r['map'] for r in changed_refs} == set(expected_coverage), changed_refs
    sharp.save(args.output / PICTURE, format='WEBP', lossless=True, exact=True)
    with Image.open(args.output / PICTURE) as output_picture:
        assert output_picture.convert('RGBA').tobytes() == sharp.tobytes()
    assert digest(args.output / PICTURE) == handoff['webPictureSha256']
    pack['originals'] = sorted(set(pack['originals']) | {SPRITE})
    pack['romSha256'] = digest(args.native/'pokefirered.gba')
    (args.output/'pack.json').write_text(json.dumps(pack,separators=(',',':'))+'\n')
    value = dict(status='PASS', romSha256=pack['romSha256'], allExteriorReferencesChecked=len(rows),
                 changedReferences=changed_refs, placements=placements, changedWorldCells=sorted(checked_cells),
                 webPictureSha256=digest(args.output/PICTURE), sharpMasterSha256=digest(args.sharp_art),
                 approvedSourceSha256=art['artworkSourceSha256'])
    args.receipt.write_text(json.dumps(value,indent=2)+'\n')
    print(f'Museum: {len(placements)} overlays, {len(changed_refs)} changed references across {len(rows)} checked exterior references.')


if __name__ == '__main__':
    main()
