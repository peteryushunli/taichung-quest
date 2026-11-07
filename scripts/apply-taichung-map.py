#!/usr/bin/env python3
"""Apply the initial Taichung map to the pinned upstream FireRed checkout.

This is an initial content generator, not part of normal incremental builds.
Re-running it deliberately restores these map files to the prototype design.
"""
import json
import os
import struct
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GAME = Path(os.environ.get('TAICHUNG_GAME_SOURCE', ROOT / 'vendor/pokefirered')).resolve()
CONTENT = ROOT / 'scripts/map-content'
BASE = 'ce6406d8c2eaf46d543c8a2606de0c3cb1951982'


def upstream(path, binary=False):
    data = subprocess.check_output(['git', 'show', f'{BASE}:{path}'], cwd=GAME)
    return data if binary else data.decode()


def save_json(path, data):
    (GAME / path).write_text(json.dumps(data, indent=2) + '\n')


def main():
    if (GAME / 'docs/taichung-city-contract.json').exists():
        raise SystemExit('This legacy prototype generator would overwrite the integrated city. '
                         'Edit the native city source instead; see docs/taichung-mapping.md.')
    layouts = json.loads(upstream('data/layouts/layouts.json'))
    layout = next(l for l in layouts['layouts'] if l.get('id') == 'LAYOUT_PALLET_TOWN')
    width, height = 24, 28
    layout['height'] = height
    save_json('data/layouts/layouts.json', layouts)
    original = struct.unpack('<480H', upstream('data/layouts/PalletTown/map.bin', True))
    grid = [[0x3001] * width for _ in range(height)]
    for y in range(9):
        grid[y] = list(original[y*width:(y+1)*width])
    for y in range(9, height):
        # Tree wall continues around the town with no ocean exit.
        grid[y][0:2] = [0x041c, 0x041d] if y % 2 == 0 else [0x0414, 0x0415]
        grid[y][22:24] = [0x041c, 0x041d] if y % 2 == 0 else [0x0414, 0x0415]
    # Preserve the original field station and its exterior door and footprint.
    for y in range(9, 15):
        for x in range(12,22):
            grid[y][x] = original[y*width+x]
    # A quiet lawn in place of the original fenced flower bed.
    for y in range(10,18):
        for x in range(3,11):
            grid[y][x] = 0x3001
    # Warm paving links three small plazas with the north/south Greenway.
    for y in range(8,26):
        for x in (10,11):
            grid[y][x] = 0x31c4
    for y in range(9,11):
        for x in range(3,21):
            if not (x >= 13 and y >= 9):
                grid[y][x] = 0x31c4
    for y in range(12,17):
        for x in range(4,10):
            grid[y][x] = 0x31c4
    for y in range(18,24):
        for x in range(4,20):
            grid[y][x] = 0x31c4
    # Secondary garden loops and grass islands make the larger park legible.
    for y in range(19,22):
        for x in range(5,9):
            grid[y][x] = 0x3001
        for x in range(15,19):
            grid[y][x] = 0x3001
    for y in (19,21):
        for x in (5,6,7,8,15,16,17,18):
            grid[y][x] = 0x3004
    # Benches are solid; their surrounding paving remains traversable.
    for x,y in ((5,17),(15,17),(5,24),(15,24)):
        for dx, tile in enumerate((0x139,0x13a,0x13b)):
            grid[y][x+dx] = 0x3400 | tile
        for dx, tile in enumerate((0x149,0x14a,0x14b)):
            grid[y+1][x+dx] = 0x3400 | tile
    # Small shrub islands frame the field station and lower Greenway.
    for x,y in ((4,11),(9,11),(4,16),(9,16),(14,15),(19,15),(4,25),(19,25)):
        grid[y][x] = 0x3405
    # Three new signs replace the garden fence and retain the two house signs.
    for x,y in ((9,11),(5,14),(16,16)):
        grid[y][x] = 0x3402
    # Close the south border with matching full trees. North route is preserved.
    for y in (26,27):
        for x in range(width):
            grid[y][x] = (0x041c if x%2==0 else 0x041d) if y%2==0 else (0x0414 if x%2==0 else 0x0415)
    (GAME/'data/layouts/PalletTown/map.bin').write_bytes(struct.pack('<'+'H'*(width*height), *(v for row in grid for v in row)))
    data = json.loads(upstream('data/maps/PalletTown/map.json'))
    data['connections'] = [c for c in data['connections'] if c['direction']=='up']
    data['coord_events'] = []
    guide, vendor, oak = data['object_events']
    guide.update(x=6,y=22,movement_type='MOVEMENT_TYPE_FACE_DOWN',movement_range_x=0,movement_range_y=0)
    vendor.update(x=16,y=8,movement_type='MOVEMENT_TYPE_FACE_DOWN',movement_range_x=0,movement_range_y=0)
    # Keep legacy local IDs for the linked object template on Route21_North.
    data['object_events'] = [guide,vendor,oak]
    save_json('data/maps/PalletTown/map.json', data)
    (GAME/'data/maps/PalletTown/scripts.inc').write_text((CONTENT/'taichung-scripts.inc').read_text())
    (GAME/'data/maps/PalletTown/text.inc').write_text((CONTENT/'taichung-text.inc').read_text())
    tea_house = upstream('data/maps/PalletTown_RivalsHouse/scripts.inc')
    tea_house = tea_house.replace('PalletTown_RivalsHouse_EventScript_Daisy::\n',
        'PalletTown_RivalsHouse_EventScript_Daisy::\n\tgoto PalletTown_EventScript_FatMan @ Share the tea errand indoors and outdoors.\n\tend\n')
    (GAME/'data/maps/PalletTown_RivalsHouse/scripts.inc').write_text(tea_house)
    sections = json.loads(upstream('src/data/region_map/region_map_sections.json'))
    # This file uses 'map_sections' in the upstream source.
    for group in sections.values():
        if isinstance(group,list):
            for section in group:
                if isinstance(section,dict) and section.get('id')=='MAPSEC_PALLET_TOWN':
                    section['name']='TAICHUNG GREENWAY'
    save_json('src/data/region_map/region_map_sections.json', sections)
    game = upstream('src/new_game.c')
    old = 'SetWarpDestination(MAP_GROUP(MAP_PALLET_TOWN_PLAYERS_HOUSE_2F), MAP_NUM(MAP_PALLET_TOWN_PLAYERS_HOUSE_2F), -1, 6, 6);'
    assert old in game
    game = game.replace(old, 'SetWarpDestination(MAP_GROUP(MAP_PALLET_TOWN), MAP_NUM(MAP_PALLET_TOWN), -1, 10, 9);')
    (GAME/'src/new_game.c').write_text(game)
    speech = upstream('src/oak_speech.c')
    old = '''void StartNewGameScene(void)
{
    gPlttBufferUnfaded[0] = RGB_BLACK;
    gPlttBufferFaded[0]   = RGB_BLACK;
    CreateTask(Task_NewGameScene, 0);
    SetMainCallback2(CB2_NewGameScene);
}'''
    new = '''void StartNewGameScene(void)
{
    // The hack-day demo starts on the Greenway rather than in Oak's tutorial.
    static const u8 sDemoPlayerName[] = _("WALKER");
    static const u8 sDemoRivalName[] = _("BLUE");
    gSaveBlock2Ptr->playerGender = MALE;
    StringCopy(gSaveBlock2Ptr->playerName, sDemoPlayerName);
    StringCopy(gSaveBlock1Ptr->rivalName, sDemoRivalName);
    gSaveBlock2Ptr->optionsTextSpeed = OPTIONS_TEXT_SPEED_FAST;
    gPlttBufferUnfaded[0] = RGB_BLACK;
    gPlttBufferFaded[0] = RGB_BLACK;
    SetMainCallback2(CB2_NewGame);
}'''
    assert old in speech
    (GAME/'src/oak_speech.c').write_text(speech.replace(old,new))
    # Add a native in-ROM four-option list without changing existing menu IDs.
    menus = upstream('include/constants/menu.h')
    menus = menus.replace('#define MULTICHOICE_NONE', '#define MULTICHOICE_TAICHUNG_STARTERS                          65\n\n#define MULTICHOICE_NONE', 1)
    (GAME/'include/constants/menu.h').write_text(menus)
    menu_source = upstream('src/script_menu.c')
    list_code = '''static const u8 sText_TaichungCharmander[] = _("CHARMANDER");
static const u8 sText_TaichungBulbasaur[] = _("BULBASAUR");
static const u8 sText_TaichungSquirtle[] = _("SQUIRTLE");
static const u8 sText_TaichungPikachu[] = _("PIKACHU");

static const struct MenuAction sMultichoiceList_TaichungStarters[] = {
    { sText_TaichungCharmander },
    { sText_TaichungBulbasaur },
    { sText_TaichungSquirtle },
    { sText_TaichungPikachu }
};

'''
    marker = 'static const struct MultichoiceListStruct sMultichoiceLists[] = {'
    assert marker in menu_source
    menu_source = menu_source.replace(marker, list_code + marker, 1)
    menu_source = menu_source.replace(marker, marker + '\n    [MULTICHOICE_TAICHUNG_STARTERS] = MULTICHOICE(sMultichoiceList_TaichungStarters),', 1)
    (GAME/'src/script_menu.c').write_text(menu_source)
    # Restore bilingual menus and the compact font after the original map/menu
    # template pass. This does not alter the independently maintained Start menu.
    subprocess.run(['python3', str(ROOT / 'scripts/generate-chinese-font.py')], check=True)
    print('Applied Taichung Greenway: four real starters, optional tea errand, plaza spawn.')

if __name__ == '__main__':
    main()
