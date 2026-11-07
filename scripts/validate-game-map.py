#!/usr/bin/env python3
"""Check actual FireRed map data for bad tiles, inaccessible events and broken doors."""
import json
import os
import re
import struct
import subprocess
import sys
from collections import deque
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GAME = Path(os.environ.get('TAICHUNG_GAME_SOURCE', ROOT / 'vendor/pokefirered')).resolve()


def require(condition, message):
    if not condition:
        raise SystemExit('MAP VALIDATION FAILED: ' + message)


def main():
    city_contract = GAME / 'docs/taichung-city-contract.json'
    if city_contract.exists():
        # The native source owns the multi-district collision/warp contract.
        # Keep the original prototype validator available for older checkouts.
        subprocess.run([sys.executable, str(GAME / 'tools/taichung/validate_city.py'),
                        '--source', str(GAME), '--baseline',
                        'ce6406d8c2eaf46d543c8a2606de0c3cb1951982', '--json'], check=True)
        return
    layouts = {item['id']: item for item in json.loads((GAME/'data/layouts/layouts.json').read_text())['layouts'] if 'id' in item}
    data = json.loads((GAME/'data/maps/PalletTown/map.json').read_text())
    layout = layouts[data['layout']]
    width, height = layout['width'], layout['height']
    raw = (GAME/layout['blockdata_filepath']).read_bytes()
    require(len(raw)==width*height*2, 'map.bin byte size disagrees with layout dimensions')
    cells = struct.unpack('<'+'H'*(width*height),raw)
    primary_count = (GAME/'data/tilesets/primary/general/metatiles.bin').stat().st_size//16
    secondary_count = (GAME/'data/tilesets/secondary/pallet_town/metatiles.bin').stat().st_size//16
    for i,cell in enumerate(cells):
        metatile = cell & 0x3ff
        require(metatile < primary_count or 640 <= metatile < 640+secondary_count,
                f'undefined metatile {metatile:#x} at ({i%width},{i//width})')
    objects = {(o['x'],o['y']) for o in data['object_events'] if o.get('flag')=='0'}
    def in_bounds(p):
        return 0 <= p[0] < width and 0 <= p[1] < height
    def can_walk(p):
        return in_bounds(p) and not (cells[p[1]*width+p[0]] & 0x0c00)
    def adjacent(p):
        return [(p[0]+dx,p[1]+dy) for dx,dy in ((1,0),(-1,0),(0,1),(0,-1))]
    spawn_match = re.search(r'SetWarpDestination\(MAP_GROUP\(MAP_PALLET_TOWN\), MAP_NUM\(MAP_PALLET_TOWN\), -1, (\d+), (\d+)\)', (GAME/'src/new_game.c').read_text())
    require(spawn_match, 'new-game outdoor spawn was not found')
    spawn = tuple(map(int,spawn_match.groups()))
    require(can_walk(spawn) and spawn not in objects, 'new-game spawn is obstructed')
    distance = {spawn:0}
    queue = deque([spawn])
    while queue:
        p=queue.popleft()
        for n in adjacent(p):
            if can_walk(n) and n not in objects and n not in distance:
                distance[n]=distance[p]+1
                queue.append(n)
    checks=[]
    for obj in data['object_events']:
        if obj.get('flag')!='0':
            continue
        p=(obj['x'],obj['y'])
        require(can_walk(p), f"NPC {obj['local_id']} stands on an obstructed tile")
        require((cells[p[1]*width+p[0]] >> 12)==obj['elevation'], f"NPC {obj['local_id']} has inconsistent elevation")
        approaches=[n for n in adjacent(p) if n in distance]
        require(approaches, f"NPC {obj['local_id']} cannot be reached")
        checks.append({'event':obj['script'],'position':p,'steps_to_interact':min(distance[n] for n in approaches)})
    maps={}
    for path in (GAME/'data/maps').glob('*/map.json'):
        entry=json.loads(path.read_text())
        maps[entry['id']]=entry
    for i,warp in enumerate(data['warp_events']):
        p=(warp['x'],warp['y'])
        require(in_bounds(p),f'warp {i} is outside map')
        # These are north-facing building doors: approach immediately from south.
        approach=(p[0],p[1]+1)
        require(approach in distance, f'warp {i} has no reachable entrance approach')
        require(warp['dest_map'] in maps, f'warp {i} destination map does not exist')
        dest=maps[warp['dest_map']]
        dest_index=int(warp['dest_warp_id'])
        require(0 <= dest_index < len(dest['warp_events']), f'warp {i} destination index is invalid')
        returning=dest['warp_events'][dest_index]
        require(returning['dest_map']=='MAP_PALLET_TOWN', f'warp {i} interior entrance does not return to the town')
        checks.append({'event':'door '+str(i),'position':p,'steps_to_interact':distance[approach]})
    for event in data['bg_events']:
        p=(event['x'],event['y'])
        require(in_bounds(p), f"sign {event['script']} is outside map")
        require(any(n in distance for n in adjacent(p)),f"sign {event['script']} is inaccessible")
    require(any(c['direction']=='up' and c['map']=='MAP_ROUTE1' for c in data['connections']), 'northern encounter route is disconnected')
    require((12,0) in distance or (13,0) in distance, 'north exit to Route 1 is obstructed')
    require(not any(c['direction']=='down' for c in data['connections']), 'legacy south-ocean connection remains on the park map')
    require(all(cells[y*width+x]&0xc00 for y in (height-2,height-1) for x in range(width)), 'south tree wall has a walkable hole')
    print(json.dumps({'result':'pass','dimensions':[width,height],'reachable_tiles':len(distance),'spawn':spawn,'checks':checks,'north_route_reachable':True},indent=2))

if __name__=='__main__':
    main()
