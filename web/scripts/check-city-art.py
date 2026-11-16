#!/usr/bin/env python3
"""Read-only source/art proof; no native compiler, install, ROM or emulator.

Requires Pillow and the frozen Maps source checkout containing baseline-source.zip.
Checks browser RGB against actual registered banks and the twenty original facade
pieces (the Maps-approved old sign removal is already part of those pieces).
Use --output to save reproducible provenance; otherwise prints the receipt.
"""
import argparse
import hashlib
import json
import struct
import subprocess
import sys
from pathlib import Path

from PIL import Image

WEB = Path(__file__).resolve().parents[1]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def check(source):
    raw = (WEB / 'src/data/minimap-contract.json').read_bytes()
    assert raw == (source / 'data/taichung/minimap-contract.json').read_bytes(), 'Native/browser export bytes differ'
    contract = json.loads(raw)
    assert contract['geometryVersion'] == 'horizontal-v1'
    sys.path.insert(0, str(source / 'tools/taichung'))
    from approved_art import Bank
    from horizontal_city import City

    inputs = {}

    class Current:
        def read(self, path):
            data = (source / path).read_bytes()
            inputs[str(path)] = sha(data)
            return data

        def words(self, path, kind='H'):
            data = self.read(path)
            return struct.unpack('<' + kind * (len(data) // struct.calcsize(kind)), data)

    reader = Current()
    layouts = {l['id']: l for l in json.loads(reader.read('data/layouts/layouts.json'))['layouts'] if 'id' in l}
    city = Image.open(WEB / 'src/assets/landing/city-map.png').convert('RGBA')
    assert city.size == (contract['world']['width'] * 16, contract['world']['height'] * 16)
    assert city.getchannel('A').getextrema() == (255, 255), 'All twelve exteriors form one complete world'
    rgb = city.convert('RGB')
    cells = 0
    callbacks = {}
    for key, district in contract['mapsByNativeKey'].items():
        if district['kind'] != 'exterior':
            continue
        layout = layouts[district['layoutId']]
        bank = Bank(reader, layout['primary_tileset'], layout['secondary_tileset'])
        callbacks[key] = bank.callbacks
        assert bank.callbacks == ['InitTilesetAnim_TaichungApproved', 'NULL'], (key, 'Review renderer animation ownership')
        words = reader.words(layout['blockdata_filepath'])
        assert len(words) == district['width'] * district['height']
        for n, word in enumerate(words):
            x = district['worldOrigin'][0] + n % district['width']
            y = district['worldOrigin'][1] + n // district['width']
            assert rgb.crop((x*16, y*16, (x+1)*16, (y+1)*16)).tobytes() == bank.render(word & 1023).tobytes(), (key, x, y, 'Native RGB differs')
            cells += 1
    for relative, digest in contract['exteriorSourceSha256'].items():
        assert sha(reader.read(relative)) == digest, relative

    # Extract only the checked frozen baseline pieces. Do not build/install the city.
    baseline = City()
    assert baseline.src.archive is not None, 'Portable frozen source archive is required; do not fall back to hidden Git history'
    baseline.capture()
    facade_cells = 0
    for ident, piece in baseline.pieces.items():
        place = contract['placesById'][ident]
        x0, y0 = place['origin']
        width, height = place['size']
        assert piece['size'] == [width, height]
        for y in range(height):
            for x in range(width):
                word = piece['words'][y*width+x]
                expected = baseline.banks[piece['bank']].render(word & 1023)
                assert rgb.crop(((x0+x)*16, (y0+y)*16, (x0+x+1)*16, (y0+y+1)*16)).tobytes() == expected.tobytes(), (ident, x, y, 'Frozen facade RGB differs')
                facade_cells += 1
    archive = source / 'data/taichung/horizontal-city/baseline-source.zip'
    inputs[str(archive.relative_to(source))] = sha(archive.read_bytes())

    catalog = sum((json.loads((WEB / 'src/data' / name).read_text()) for name in ('landmarks.json', 'sights.json')), [])
    assert len(catalog) == 20 and {p['id'] for p in catalog} == set(baseline.pieces)
    outputs = {}
    for place in catalog:
        p = contract['placesById'][place['id']]
        assert p['artStatus'] == 'approved-baseline-source' and not p.get('interactionStatus', '').startswith('reserved')
        x, y = p['origin']
        w, h = p['size']
        assert place['world'] == p['worldAnchor'] and place['artRect'] == [x, y, x+w, y+h]
        path = WEB / 'src/assets/landmarks/map' / (place['id'] + '.png')
        crop = Image.open(path).convert('RGBA')
        assert crop.tobytes() == city.crop((x*16, y*16, (x+w)*16, (y+h)*16)).tobytes(), place['id']
        outputs[str(path.relative_to(WEB))] = sha(path.read_bytes())
    radar_path = WEB / 'src/assets/minimap/city.png'
    radar = Image.open(radar_path).convert('RGB')
    assert radar.size == (contract['world']['width']+4, contract['world']['height']+4)
    assert len(radar.getcolors(radar.width*radar.height)) <= 4
    for path in [WEB / 'src/assets/landing/city-map.png', radar_path]:
        outputs[str(path.relative_to(WEB))] = sha(path.read_bytes())
    commit = subprocess.run(['git', '-C', str(source), 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
    return dict(scope='read-only source pixels and catalog/art integrity; no ROM/runtime acceptance', nativeSourceCommit=commit,
                geometryFingerprintSha256=contract['geometryFingerprintSha256'], rawContractSha256=sha(raw),
                worldPixels=list(city.size), radarPixels=list(radar.size), registeredNativeCellsCompared=cells,
                originalFacadePlaces=len(baseline.pieces), originalFacadeCellsCompared=facade_cells,
                originalSignRemoval='Frozen Maps piece extraction removes the former signpost square, never facade pixels',
                callbacksByNativeKey=callbacks, nativeInputSha256=dict(sorted(inputs.items())), webOutputSha256=dict(sorted(outputs.items())))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    result = check(args.source.resolve())
    text = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text)
    print(json.dumps({k: v for k, v in result.items() if k not in ('callbacksByNativeKey', 'nativeInputSha256', 'webOutputSha256')}, indent=2))


if __name__ == '__main__':
    main()
