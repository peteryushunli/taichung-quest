#!/usr/bin/env python3
"""Write the landing map's "Real Taichung" view: src/assets/boulevard/real.webp and src/data/real-map.json.

    python3 web/scripts/prepare-real-map.py <realmap folder>

The realmap folder is the map study that draws real Taichung from OpenStreetMap and matches it to the
game map (kept beside the Boulevard plan, outside this repository; its README lists the steps). It holds:

    out/real-wide.png, out/real-wide.json   real Taichung at real distances on a sheet the shape of the
                                            landing map, turned so Taiwan Blvd lies flat and centred so the
                                            boulevard sits where the game map has it
    control.json, src/warp.py               the matching points and the smooth bend fitted through them
    extra-places.json                       real coordinates of places added to the game since the plan was drawn

This script only repackages those for the site: the picture as WebP, and for every corner of a grid over
the game map the spot of the real sheet it comes from, so the page can fold one map into the other.
All positions are fractions of the map frame (0..1 across, 0..1 down).
"""
import hashlib, json, sys
from pathlib import Path

import numpy as np
from PIL import Image

WEB = Path(__file__).resolve().parents[1]
STEP = 8                      # tiles between grid corners
BOULEVARD_ROW = 108.5         # the centre row of Taiwan Blvd on the game map, in tiles


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    study = Path(sys.argv[1]).resolve()
    sys.path.insert(0, str(study / 'src'))
    import warp

    city = json.loads((WEB / 'src/data/boulevard-preview.json').read_text())
    wide, tall = city['world']['width'], city['world']['height']
    sheet = json.loads((study / 'out/real-wide.json').read_text())
    u0, v0, u1, v1 = sheet['box']
    _, _, to_real = warp.load(str(study / 'control.json'))

    def on_sheet(tiles):
        km = to_real(np.asarray(tiles, float))
        return [[round(float((u - u0) / (u1 - u0)), 5), round(float((v - v0) / (v1 - v0)), 5)] for u, v in km]

    def flat(points):
        return [value for point in points for value in point]

    columns = sorted(set(range(0, wide, STEP)) | {wide})
    rows = sorted(set(range(0, tall, STEP)) | {tall})
    grid = [(x, y) for y in rows for x in columns]
    along = [(x, BOULEVARD_ROW) for x in np.linspace(0, wide, 61)]
    anchor = on_sheet([(wide / 2, BOULEVARD_ROW)])[0]
    # The sheet is drawn so the middle of the game's boulevard keeps its place: that is what the fold turns on.
    if abs(anchor[0] - .5) > .003 or abs(anchor[1] - BOULEVARD_ROW / tall) > .003:
        sys.exit(f'The real sheet is not centred on Taiwan Blvd (its middle falls at {anchor}). Redraw it first.')

    places = {}
    for place_id, marker in city['markersById'].items():
        if place_id in sheet['places']:
            x, y = sheet['places'][place_id]['px']
            places[place_id] = [round(x / sheet['width'], 5), round(y / sheet['height'], 5)]
    # Places added to the game since the plan was drawn: their real coordinates, turned into the sheet's frame.
    extra = study / 'extra-places.json'
    if extra.exists():
        sys.path.insert(0, str(study.parent / 'src'))
        import frame
        for place_id, at in json.loads(extra.read_text())['places'].items():
            if place_id in city['markersById'] and place_id not in places:
                u, v = frame.uv(at['lat'], at['lon'])
                places[place_id] = [round((u - u0) / (u1 - u0), 5), round((v - v0) / (v1 - v0), 5)]
    missing = sorted(set(city['markersById']) - set(places) - {'guest-house'})
    if missing:
        sys.exit(f'No real position for: {", ".join(missing)}. Add them to the study and redraw.')

    picture = WEB / 'src/assets/boulevard/real.webp'
    Image.open(study / 'out/real-wide.png').convert('RGB').save(picture, quality=84, method=6)
    data = {
        'schemaVersion': 1,
        'about': 'Real Taichung behind the landing map. Written by web/scripts/prepare-real-map.py; do not edit by hand.',
        'source': {
            'cityGeometryFingerprintSha256': city['geometryFingerprintSha256'],
            'pictureSha256': hashlib.sha256(picture.read_bytes()).hexdigest(),
            'mapData': 'OpenStreetMap contributors, ODbL',
        },
        'sheet': {'kmWide': round(u1 - u0, 2), 'kmTall': round(v1 - v0, 2), 'turnedDegrees': 34.4},
        'anchor': [round(.5, 5), round(BOULEVARD_ROW / tall, 5)],
        'mesh': {'columns': len(columns), 'rows': len(rows),
                 'game': flat([round(x / wide, 5), round(y / tall, 5)] for x, y in grid), 'real': flat(on_sheet(grid))},
        'boulevard': {'game': flat([round(float(x) / wide, 5), round(y / tall, 5)] for x, y in along), 'real': flat(on_sheet(along))},
        'places': places,
    }
    target = WEB / 'src/data/real-map.json'
    target.write_text(json.dumps(data, separators=(',', ':')) + '\n')
    print(f'{picture.relative_to(WEB)}: {picture.stat().st_size // 1024} KB; {target.relative_to(WEB)}: {target.stat().st_size // 1024} KB; '
          f'{len(places)} places; grid {len(columns)} x {len(rows)}; sheet {data["sheet"]["kmWide"]} x {data["sheet"]["kmTall"]} km')


if __name__ == '__main__':
    main()
