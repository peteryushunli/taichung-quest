#!/usr/bin/env python3
"""Export every placed building of a native city build, as its compiler holds it just before drawing.

    python3 scripts/export-city-placements.py <native checkout> <authoring inputs> <out.json>

Writes the world rectangle of each compiled map, every placement with the
game-size sprite it is drawn from, and, for every map of the Taichung group, the
maps one step away (connections and doors). scripts/complete-city-hd.py reads it.
"""
import json
import os
import sys
from pathlib import Path


class Taken(Exception):
    pass


def steps(game, group, city):
    """Maps one step apart: over a map edge or through a door, either way.

    The earlier districts are still in the build but cannot be reached; some gym
    exits name them in their data and are redirected while the game runs.
    """
    data = {name: json.loads((game / f'data/maps/{name}/map.json').read_text()) for name in group}
    live = {name: f'43.{i}' for i, name in enumerate(group) if name in city or not data[name].get('connections')}
    number = {data[name]['id']: key for name, key in live.items()}
    out = {key: [] for key in live.values()}
    for name, key in live.items():
        there = [c['map'] for c in data[name].get('connections') or []]
        there += [w['dest_map'] for w in data[name].get('warp_events') or []]
        for other in (number[t] for t in there if t in number):
            for a, b in ((key, other), (other, key)):
                if a != b and b not in out[a]:
                    out[a].append(b)
    return out


def main():
    game, authoring, out = (Path(a).resolve() for a in sys.argv[1:])
    os.environ['FILL_RAW'] = '1'
    sys.path.insert(0, str(authoring / 'src'))
    import events
    raw = json.loads((authoring / 'out/fill-raw.json').read_text())
    build = events.build

    def retained():
        world = build()
        world.objects = [dict(sprite=p['sprite'] + ('@flip' if p['mirrored'] else ''), kind=p['kind'],
                              x=p['x'], y=p['y'], w=p['tiles'][0], h=p['tiles'][1],
                              **({'solid': p['solidTiles']} if 'solidTiles' in p else {}))
                         for p in raw['placements']]
        return world
    events.build = retained
    sys.path.insert(0, str(game / 'tools/taichung/boulevard_city'))
    import build_city as city
    taken = {}
    prepare, load = city.prepare_maps, city.load_inputs

    def stop(book):
        taken['maps'], _ = prepare(book)
        raise Taken

    def watch(*args):
        loaded = load(*args)
        taken['fill'] = loaded[2]
        return loaded
    city.prepare_maps, city.load_inputs = stop, watch
    sys.argv = [city.__file__, str(authoring), '--report', str(out.parent / 'unused.json')]
    try:
        city.main()
    except Taken:
        pass
    group = json.loads((game / 'data/maps/map_groups.json').read_text())['gMapGroup_Taichung']
    out.write_text(json.dumps(dict(
        steps=steps(game, group, {m['nativeName'] for m in taken['maps']}),
        maps={f"43.{group.index(m['nativeName'])}": dict(rect=m['rect'], name=m['nativeName']) for m in taken['maps']},
        placements=[dict(p, native=str(city.sprite_path(authoring, p['sprite'])))
                    for p in taken['fill']['placements'] if p['kind'] in ('building', 'landmark')])) + '\n')


if __name__ == '__main__':
    main()
