#!/usr/bin/env python3
"""Pair a scoped native follow-up while preserving verified city artwork."""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import shutil

import numpy as np
from PIL import Image


def read(path):
    return json.loads(path.read_bytes())


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        raise SystemExit(message)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    for name in ('native', 'candidate', 'previous'):
        p.add_argument(name, type=Path)
    for name in ('map-report', 'source-proof', 'receipt'):
        p.add_argument('--' + name, type=Path, required=True)
    p.add_argument('--scope', choices=('painted-entrance', 'covered-flowers'), default='painted-entrance')
    args = p.parse_args()
    proof = read(args.source_proof)
    if args.scope == 'painted-entrance':
        cells = {tuple(v) for v in proof['visualChangesOnlyFormerWoodenDoorTiles']}
        require(proof['passed'] and cells == {(334, 35), (335, 35)} and
                not proof['newlyBlockedPreviouslyWalkableCells'] and proof['priorContinueTargetsRetained'] == 95,
                'Unexpected painted-entrance source scope.')
        expected_maps = {'43.69'}
        baseline_rom = '8516a68407cf50d2f0b7039a977998d2793c162a6115dc393d501d3b972ada8f'
    else:
        cells = {tuple(v) for v in proof['targetWorldCells']}
        require(proof['passed'] and cells == {(242, 137), (243, 137)} and
                proof['treeUpperLayerUnchanged'] and proof['collisionWarpsSignsActorsUnchanged'] and
                proof['newLowerAnimatedSlots'] == list(range(500, 504)) and
                proof['ordinaryFlowerSlotsRetained'] == list(range(508, 512)),
                'Unexpected covered-flower source scope.')
        expected_maps = set(proof['changedReferences'])
        require(expected_maps == {'43.59', '43.60', '43.63', '43.64'}, 'Unexpected flower map scope.')
        baseline_rom = 'd05cdd78e0a615f9354021d14b359e5a00053f44a54cde9ee6a9fbda14257cc3'
    report = read(args.map_report)
    maps = {f"43.{m['number']}": m for m in report['maps']}
    before, after = read(args.previous / 'pack.json'), read(args.candidate / 'pack.json')
    require(before['romSha256'] == baseline_rom,
            'The follow-up must use the verified combined review baseline.')
    require(after['romSha256'] == digest(args.native / 'pokefirered.gba') and
            (after['version'], after['group'], after['scale']) == (2, 43, 4), 'Unpaired HD pack.')
    require(set(before['maps']) == set(after['maps']), 'Map registry changed.')
    sites = {s['id']: s for s in read(args.native / 'data/taichung/named-xitun-bindings/anchors.json')['sites']
             if s['id'] != 'the-lin'}
    changed, pixels, coverage, changed_cells = [], 0, [], set()
    for key, old in before['maps'].items():
        new = after['maps'][key]
        require({k: v for k, v in old.items() if k != 'buildings'} ==
                {k: v for k, v in new.items() if k != 'buildings'}, f'Map envelope changed: {key}')
        a = np.asarray(Image.open(args.previous / old['ref']).convert('RGB'))
        b = np.asarray(Image.open(args.candidate / new['ref']).convert('RGB'))
        require(a.shape == b.shape, f'Reference dimensions changed: {key}')
        delta = np.any(a != b, axis=2)
        if delta.any():
            require(key in expected_maps, f'Unapproved reference changes: {key}')
            ys, xs = np.where(delta)
            ox, oy = maps[key]['worldRect'][:2]
            actual = set(zip((ox + xs // 16 - new['margin']).tolist(),
                             (oy + ys // 16 - new['margin']).tolist()))
            require(actual <= cells, 'Reference changes extend beyond the reviewed world cells.')
            changed_cells |= actual
            changed.append(key)
            pixels += int(delta.sum())
        def identity(item):
            return tuple(item[k] for k in ('sprite', 'mirrored', 'x', 'y', 'w', 'h', 'picture'))
        old_auto = {identity(v): v for v in old['buildings'] if v['sprite'] not in sites}
        new_auto = {identity(v): v for v in new['buildings']}
        require(not any(v['sprite'] in sites for v in new['buildings']), 'Unexpected automatic tower.')
        for ident in old_auto.keys() | new_auto.keys():
            if old_auto.get(ident) == new_auto.get(ident):
                continue
            require(key in expected_maps, f'Unapproved overlay changes: {key}')
            v = new_auto.get(ident) or old_auto[ident]
            ox, oy = maps[key]['worldRect'][:2]
            left, top = ox + v['x'] / 16 - new['margin'], oy + v['y'] / 16 - new['margin']
            require(any(left < x + 1 and left + v['w'] / 16 > x and
                        top < y + 1 and top + v['h'] / 16 > y for x, y in cells),
                    'Changed overlay does not touch the reviewed world cells.')
        for item in (v for v in old['buildings'] if v['sprite'] in sites):
            site = sites[item['sprite']]
            art = args.native / 'tools/taichung/boulevard_city/landmark-art' / (item['sprite'] + '.png')
            require(digest(art) == site['art']['nativeSpriteSha256'], 'Native tower artwork changed.')
            picture = args.previous / item['picture']
            require(digest(picture) == site['art']['approvedHdPictureSha256'], 'HD tower artwork changed.')
            x, y, w, h = (item[k] for k in ('x', 'y', 'w', 'h'))
            ox, oy = maps[key]['worldRect'][:2]
            l, t, r, bottom = site['game']['authoredWorldRect']
            require([x, y, w, h] == [(l - ox + new['margin']) * 16, (t - oy + new['margin']) * 16,
                                     (r - l) * 16, (bottom - t) * 16], 'Stale tower envelope.')
            sprite = np.asarray(Image.open(art).convert('RGBA')).astype(np.int16)
            require(sprite.shape[:2] == (h, w) and np.array_equal(a, b), 'Tower reference changed.')
            left, top, right, lower = max(0, x), max(0, y), min(b.shape[1], x + w), min(b.shape[0], y + h)
            sx, sy = left - x, top - y
            opaque = sprite[..., 3] > 0
            own = np.zeros((h, w), dtype=bool)
            own[sy:lower-y, sx:right-x] = opaque[sy:lower-y, sx:right-x] & (
                np.abs(b[top:lower, left:right].astype(np.int16) - sprite[sy:lower-y, sx:right-x, :3]).sum(axis=2) < 48)
            ring = np.zeros_like(own)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ring |= np.roll(np.roll(own, dy, 0), dx, 1)
            valid = np.zeros_like(own)
            valid[sy:lower-y, sx:right-x] = True
            covers = base64.b64encode(np.packbits(((own | (ring & ~opaque)) & valid).ravel(), bitorder='little').tobytes()).decode()
            require(own.any() and covers == item['covers'], 'Tower mask differs from verified fresh reference.')
            shutil.copyfile(picture, args.candidate / item['picture'])
            new['buildings'].append(dict(item, covers=covers))
            coverage.append(dict(nativeKey=key, sprite=item['sprite'], envelope=[x, y, w, h]))
    # The source compiler includes wider camera borders than this HD export;
    # a reviewed cell need not occur in every neighboring reference image.
    require(set(changed) <= expected_maps and changed_cells == cells and len(coverage) == 9,
            'Missing reviewed world-cell or tower coverage.')
    for picture in (args.candidate / 'pictures').glob('*.webp'):
        require(picture.read_bytes() == (args.previous / 'pictures' / picture.name).read_bytes(),
                f'Approved HD picture changed: {picture.name}')
    after['originals'] = sorted(set(after['originals']) | sites.keys())
    (args.candidate / 'pack.json').write_text(json.dumps(after) + '\n')
    result = dict(status='PASS', scope=args.scope, romSha256=after['romSha256'], maps=len(after['maps']),
                  changedReferenceMaps=changed, changedPixels=pixels, changedWorldCells=sorted(cells),
                  automaticPicturesByteExact=True, freshTowerMasksByteExact=True, coverage=coverage,
                  sourceProofSha256=digest(args.source_proof), compiledMapReportSha256=digest(args.map_report))
    args.receipt.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
