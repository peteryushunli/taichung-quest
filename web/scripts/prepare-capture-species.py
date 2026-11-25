"""Write web/src/data/capture-species.json: which Pokémon the game keeps at each capture site.

The landing map shows that Pokémon on a landmark's pin. The list is read from the game's own encounter
registry (data/taichung/encounters/sites.json) as carried in patches/taichung.patch, so it follows the
build the site ships. A site's number is the marker's captureBit in boulevard-preview.json.

    python3 web/scripts/prepare-capture-species.py [game source folder]

With a game source folder, any icon the map needs and the site lacks is copied, unchanged, from
graphics/pokemon/<species>/icon.png.
"""
import hashlib
import json
import shutil
import sys
from pathlib import Path

WEB = Path(__file__).resolve().parent.parent
REGISTRY = 'data/taichung/encounters/sites.json'


def registry_from_patch(patch_path):
    lines = patch_path.read_text(errors='replace').split('\n')
    start = next((i for i, line in enumerate(lines) if line.startswith('diff --git') and REGISTRY in line), None)
    if start is None:
        raise SystemExit(f'{patch_path} does not carry {REGISTRY}.')
    body = []
    for line in lines[start + 1:]:
        if line.startswith('diff --git'):
            break
        if line.startswith('+') and not line.startswith('+++'):
            body.append(line[1:])
    return json.loads('\n'.join(body))


def main():
    registry = registry_from_patch(WEB.parent / 'patches/taichung.patch')
    sites = sorted(registry['sites'], key=lambda site: site['stableSiteId'])
    if [site['stableSiteId'] for site in sites] != list(range(len(sites))):
        raise SystemExit('The encounter registry has a gap in its site numbers.')
    species = [site['species'].lower() if site['species'] is not None else None for site in sites]
    out = WEB / 'src/data/capture-species.json'
    out.write_text(json.dumps({'source': f'{REGISTRY} in patches/taichung.patch', 'species': species}, indent=2) + '\n')
    print(f'wrote {out.relative_to(WEB.parent)}: {len(species)} sites')

    city = json.loads((WEB / 'src/data/boulevard-preview.json').read_text())
    needed = set()
    for marker in city['markersById'].values():
        bit = marker.get('captureBit')
        if bit is not None:
            if not 0 <= bit < len(species) or species[bit] is None:
                raise SystemExit(f"{marker['id']} does not bind to an active capture species.")
            needed.add(species[bit])
    icons = WEB / 'src/assets/pokemon/icon'
    missing = [name for name in sorted(needed) if not (icons / f'{name}.png').exists()]
    game = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    for name in missing:
        if game is None:
            continue
        source = game / 'graphics/pokemon' / name / 'icon.png'
        shutil.copyfile(source, icons / f'{name}.png')
        print(f'icon/{name}.png {hashlib.sha256(source.read_bytes()).hexdigest()}')
    still = [name for name in missing if not (icons / f'{name}.png').exists()]
    if still:
        raise SystemExit(f'Missing icons (pass the game source folder to copy them): {", ".join(still)}')
    print(f'{len(needed)} landmark Pokémon, every icon present')


if __name__ == '__main__':
    main()
