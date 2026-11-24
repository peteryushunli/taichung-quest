#!/usr/bin/env python3
"""Qualify fresh HD references and derive tower overlays from Maps' new proof."""
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
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('native', type=Path)
    parser.add_argument('candidate', type=Path)
    parser.add_argument('previous', type=Path)
    parser.add_argument('--map-report', type=Path, required=True)
    parser.add_argument('--receipt', type=Path, required=True)
    args = parser.parse_args()
    proof = read(args.native / 'docs/named-xitun-bindings/tower-hd-handoff.json')
    anchors = read(args.native / 'data/taichung/named-xitun-bindings/anchors.json')
    temple = read(args.native / 'data/taichung/confucius-map-bindings/anchors.json')['gym']['exterior']
    door_key = temple['nativeKey'].replace(':','.')
    door_cells = {tuple(point) for point in temple['doors']}
    allowed_rects = [(75,113,95,126), *[(x,y,x+1,y+1) for x,y in door_cells]]
    sites = {site['id']: site for site in anchors['sites'] if site['id'] != 'the-lin'}
    compiled_maps = {f"43.{entry['number']}": entry for entry in read(args.map_report)['maps']}
    before = read(args.previous / 'pack.json')
    after = read(args.candidate / 'pack.json')
    require(before['romSha256'] == '634c0fcbfa35c31b0995014e8cbce41e975f1eb4ccbad1e9ce05928e95055648',
            'Previous HD pack is not the verified live baseline.')
    require(after['romSha256'] == digest(args.native / 'pokefirered.gba'), 'HD pack is paired to another cartridge.')
    require((after['version'], after['group'], after['scale']) == (2, 43, 4), 'Unexpected HD pack contract.')
    require(set(after['maps']) - set(before['maps']) == {'43.79'} and set(before['maps']) <= set(after['maps']),
            'Only the appended Confucius room may change the HD map registry.')
    expected = {item['nativeKey']: item for item in proof['changedReferences']}
    changed = []
    temple_door_pixels = 0
    overlay_changes = 0
    for key, old in before['maps'].items():
        new = after['maps'][key]
        require({k:v for k,v in old.items() if k != 'buildings'} == {k:v for k,v in new.items() if k != 'buildings'},
                f'Existing HD map envelope changed: {key}')
        a = np.asarray(Image.open(args.previous / old['ref']).convert('RGB'))
        b = np.asarray(Image.open(args.candidate / new['ref']).convert('RGB'))
        require(a.shape == b.shape, f'Reference dimensions changed: {key}')
        delta = np.any(a != b, axis=2)
        if delta.any():
            ys, xs = np.where(delta)
            bounds = [int(xs.min()), int(ys.min()), int(xs.max()+1), int(ys.max()+1)]
            if key in expected:
                item = expected[key]
                require(int(delta.sum()) == item['changedPixels'] and bounds == item['changedReferencePixelBounds'],
                        f'Reference delta differs from Maps proof: {key}')
                require(digest(args.candidate / new['ref']) == item['freshReferenceSha256'],
                        f'Fresh reference differs from Maps output: {key}')
            else:
                require(key == door_key, f'Unapproved reference pixel changes: {key}')
                ox,oy = compiled_maps[key]['worldRect'][:2]
                cells = set(zip((ox+xs//16-new['margin']).tolist(),(oy+ys//16-new['margin']).tolist()))
                require(cells == door_cells and int(delta.sum()) == len(door_cells)*256,
                        'Temple reference changes extend beyond the two authored door tiles.')
                temple_door_pixels = int(delta.sum())
            changed.append(key)
        def identity(item):
            return tuple(item[field] for field in ('sprite','mirrored','x','y','w','h','picture'))
        old_auto = {identity(item):item for item in old['buildings'] if item['sprite'] not in sites}
        new_auto = {identity(item):item for item in new['buildings']}
        for ident in old_auto.keys() | new_auto.keys():
            if old_auto.get(ident) == new_auto.get(ident):
                continue
            require(key in compiled_maps, f'Existing interior overlay changed: {key}')
            item = new_auto.get(ident, old_auto.get(ident))
            ox, oy = compiled_maps[key]['worldRect'][:2]
            left = ox + item['x']/16 - new['margin']
            top = oy + item['y']/16 - new['margin']
            require(any(left < r and left+item['w']/16 > l and top < b and top+item['h']/16 > t
                        for l,t,r,b in allowed_rects),
                    f'Automatic overlay changed outside the tower lot or temple doors: {key}/{ident}')
            overlay_changes += 1
    require(set(changed) == set(expected) | {door_key}, 'A Maps reference change is missing.')
    # Existing automatic artwork must remain the approved bytes. Replacing a
    # cartridge does not authorize silently replacing its source pictures.
    for picture in (args.candidate / 'pictures').glob('*.webp'):
        old = args.previous / 'pictures' / picture.name
        require(old.is_file() and picture.read_bytes() == old.read_bytes(), f'Automatic artwork changed: {picture.name}')

    # Maps' committed new envelopes also include the clipped seam references.
    # Full-sized images can extend outside a reference; covers outside it stay
    # zero, so the renderer's existing native foreground restoration still owns
    # every character, dialogue box and unrelated tile.
    coverage = []
    require(not any(b['sprite'] in sites for entry in after['maps'].values() for b in entry['buildings']),
            'Fresh automatic pack already contains a manual tower.')
    require(len({(item['nativeKey'],item['sprite']) for item in proof['perReferenceTowerCoverage']}) == 9,
            'Missing or duplicate tower seam coverage records.')
    for item in proof['perReferenceTowerCoverage']:
        key, sprite_id = item['nativeKey'], item['sprite']
        site = sites[sprite_id]
        native_art = args.native / 'tools/taichung/boulevard_city/landmark-art' / (sprite_id + '.png')
        require(digest(native_art) == site['art']['nativeSpriteSha256'], f'Native tower art changed: {sprite_id}')
        sprite = np.asarray(Image.open(native_art).convert('RGBA')).astype(np.int16)
        x, y, w, h = item['fullReferencePixelEnvelope']
        require(sprite.shape[:2] == (h, w), f'Tower scale changed: {sprite_id}')
        entry = after['maps'][key]
        ox, oy = compiled_maps[key]['worldRect'][:2]
        wx, wy, right_world, bottom_world = site['game']['authoredWorldRect']
        require(item['worldRect'] == [wx,wy,right_world,bottom_world] and
                [x,y,w,h] == [(wx-ox+entry['margin'])*16,(wy-oy+entry['margin'])*16,
                             (right_world-wx)*16,(bottom_world-wy)*16],
                f'Tower envelope does not derive from the current compiled map: {key}/{sprite_id}')
        ref = np.asarray(Image.open(args.candidate / entry['ref']).convert('RGB')).astype(np.int16)
        left, top, right, bottom = item['visibleReferencePixelRect']
        require([max(0,x), max(0,y), min(ref.shape[1],x+w), min(ref.shape[0],y+h)] == [left,top,right,bottom],
                f'Invalid clipped tower reference: {key}/{sprite_id}')
        sx, sy = left-x, top-y
        require([sx,sy,right-x,bottom-y] == item['visibleSpritePixelRect'], 'Invalid sprite crop proof.')
        own = np.zeros((h,w), dtype=bool)
        opaque = sprite[...,3] > 0
        own[sy:bottom-y,sx:right-x] = opaque[sy:bottom-y,sx:right-x] & (
            np.abs(ref[top:bottom,left:right] - sprite[sy:bottom-y,sx:right-x,:3]).sum(axis=2) < 48)
        ring = np.zeros_like(own)
        for dy in (-1,0,1):
            for dx in (-1,0,1):
                ring |= np.roll(np.roll(own,dy,0),dx,1)
        valid = np.zeros_like(own)
        valid[sy:bottom-y,sx:right-x] = True
        mask = (own | (ring & ~opaque)) & valid
        require(own.any(), f'Tower does not match the fresh native reference: {key}/{sprite_id}')
        picture = f'pictures/{sprite_id}.webp'
        old_picture = args.previous / picture
        require(digest(old_picture) == site['art']['approvedHdPictureSha256'], f'Approved HD picture mismatch: {sprite_id}')
        with Image.open(old_picture) as art:
            require(art.size == (w*4,h*4), f'HD tower scale changed: {sprite_id}')
        shutil.copyfile(old_picture, args.candidate / picture)
        entry['buildings'].append(dict(sprite=sprite_id, mirrored=False, x=x, y=y, w=w, h=h, error=0,
            picture=picture, covers=base64.b64encode(np.packbits(mask.ravel(),bitorder='little').tobytes()).decode()))
        coverage.append(dict(nativeKey=key,sprite=sprite_id,envelope=[x,y,w,h],coveredPixels=int(mask.sum()),
                             clipped=not item['fullSpriteFitsReference']))
    require(len(coverage) == 9, 'Missing tower seam coverage proof.')
    after['originals'] = sorted(set(after['originals']) | sites.keys())
    (args.candidate / 'pack.json').write_text(json.dumps(after)+'\n')
    result = dict(status='PASS',romSha256=after['romSha256'],maps=len(after['maps']),
                  changedReferenceMaps=changed,automaticPicturesByteExact=True,
                  templeDoorChangedPixels=temple_door_pixels,templeChangesOnlyAtAuthoredDoorTiles=True,
                  scopedAutomaticOverlayChanges=overlay_changes,
                  towerCoordinatesAndMasksFresh=True,coverage=coverage,
                  compiledMapReportSha256=digest(args.map_report),
                  anchorsSha256=digest(args.native / 'data/taichung/named-xitun-bindings/anchors.json'),
                  proofSha256=digest(args.native / 'docs/named-xitun-bindings/tower-hd-handoff.json'))
    args.receipt.parent.mkdir(parents=True,exist_ok=True)
    args.receipt.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))


if __name__ == '__main__':
    main()
