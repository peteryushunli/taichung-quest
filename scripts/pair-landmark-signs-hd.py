#!/usr/bin/env python3
"""Install the approved sign foregrounds over their compiled Boulevard references."""
import argparse
import base64
from collections import Counter, defaultdict
from hashlib import sha256
import json
from pathlib import Path

import numpy as np
from PIL import Image


def read(path):
    return json.loads(path.read_text())


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        raise SystemExit(message)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('native', 'pack', 'report', 'proof', 'receipt'):
        parser.add_argument(name, type=Path)
    args = parser.parse_args()
    report, proof = read(args.report), read(args.proof)
    family = report['landmarkSignArt']
    sites = {site['id']: site for site in family['placements']}
    counts = Counter(site['style'] for site in sites.values())
    require(counts == {'wood': 7, 'bronze-plaque': 9, 'slate-information-sign': 10,
                       'enamel-directory': 5}, 'Unexpected 31-sign art assignment.')
    require(proof['assets'] == family['assets'] and proof['placements'] == family['placements'],
            'The sign proof differs from the compiled sign placements.')
    pack_path = args.pack / 'pack.json'
    pack = read(pack_path)
    require((pack['version'], pack['group'], pack['scale']) == (2, 43, 4) and
            pack['romSha256'] == digest(args.native / 'pokefirered.gba'), 'Unpaired HD world pack.')
    maps = {f"43.{entry['number']}": entry for entry in report['maps']}
    for ref in proof['changedReferences']:
        path = args.pack / pack['maps'][ref['nativeKey']]['ref']
        require(digest(path) == ref['sha256'], f"Unverified native reference for {ref['nativeKey']}.")

    pictures, alpha_masks, dimensions = {}, {}, {}
    for style, spec in family['assets'].items():
        source = args.native / spec['file']
        require(digest(source) == spec['sha256'], f'Approved source hash differs for {style}.')
        image = Image.open(source).convert('RGBA')
        width, height = spec['nativeSize']
        scale = spec['sourceScale']
        require(image.size == (width * scale, height * scale), f'Invalid sign art dimensions for {style}.')
        alpha = image.getchannel('A')
        native = np.asarray(alpha.resize((width, height), Image.Resampling.NEAREST)) > 0
        detail = (np.asarray(alpha).reshape(height, scale, width, scale) > 0).any(axis=(1, 3))
        alpha_masks[style] = (native, native | detail)
        dimensions[style] = (width, height)
        pictures[style] = image.resize((width * 4, height * 4), Image.Resampling.NEAREST)

    updates = defaultdict(list)
    placements = set()
    home_maps = set()
    for overlay in proof['signOverlays']:
        key, site_id, style = overlay['nativeKey'], overlay['id'], overlay['asset']
        require((key, site_id) not in placements, f'Duplicate overlay for {key}/{site_id}.')
        placements.add((key, site_id))
        site = sites[site_id]
        require(site['style'] == style and style in pictures, f'Incorrect artwork for {site_id}.')
        entry = pack['maps'][key]
        ox, oy = maps[key]['worldRect'][:2]
        sx, sy = site['worldSign']
        dx, dy = site['nativeSpriteOffset']
        w, h = dimensions[style]
        x, y = (sx - ox + entry['margin']) * 16 + dx, (sy - oy + entry['margin']) * 16 + dy
        require(overlay['envelope'] == [x, y, w, h], f'Stale overlay at {key}/{site_id}.')
        left, top = max(0, x), max(0, y)
        right, bottom = min(entry['width'], x + w), min(entry['height'], y + h)
        require(overlay['clipped'] == [left, top, right, bottom],
                f'Invalid sign clipping at {key}/{site_id}.')
        visible = np.zeros((h, w), dtype=bool)
        visible[top-y:bottom-y, left-x:right-x] = True
        for label, mask in zip(('nativeOpaqueMask', 'sharpUnionMask'), alpha_masks[style]):
            expected = np.packbits((mask & visible).ravel(), bitorder='little').tobytes()
            require(base64.b64decode(overlay[label], validate=True) == expected,
                    f'Sign mask does not match its approved alpha at {key}/{site_id}.')
        if key.replace('.', ':') == site['nativeKey']:
            home_maps.add(site_id)
        updates[key].append(dict(sprite=f'landmark-sign/{site_id}', kind='sign', mirrored=False,
                                 x=x, y=y, w=w, h=h, picture=f'pictures/landmark-sign--{style}.png',
                                 covers=overlay['sharpUnionMask']))
    require(home_maps == {s['id'] for s in sites.values() if s['style'] != 'wood'},
            'A sharp sign is missing from its home map.')
    require(not any(item.get('kind') == 'sign' for entry in pack['maps'].values() for item in entry['buildings']),
            'Sharp signs are already present in this pack.')
    for style, image in pictures.items():
        image.save(args.pack / f'pictures/landmark-sign--{style}.png', optimize=True)
    for key, overlays in updates.items():
        pack['maps'][key]['buildings'].extend(overlays)
    pack['originals'] = sorted(set(pack['originals']) | {item['sprite'] for rows in updates.values() for item in rows})
    pack_path.write_text(json.dumps(pack) + '\n')
    receipt = dict(status='PASS', romSha256=pack['romSha256'], styleCounts=dict(counts),
                   sharpSiteCount=len(home_maps), clippedAndFullOverlayCount=len(placements),
                   assets={s: digest(args.pack / f'pictures/landmark-sign--{s}.png') for s in pictures},
                   verifiedProofSha256=digest(args.proof))
    args.receipt.write_text(json.dumps(receipt, indent=2) + '\n')
    print(f'Paired {len(placements)} sign envelopes for the {len(home_maps)} sharp sign sites.')


if __name__ == '__main__':
    main()
