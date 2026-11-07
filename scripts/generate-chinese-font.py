#!/usr/bin/env python3
"""Build the native Traditional Chinese subset and runtime translations.

Font source: Google Fonts Noto Sans TC, SIL Open Font License 1.1.
The generated subset uses 12px advance in a 14px cell. FC19 + two base240
digits avoids every delimiter used by FireRed's original encoded strings.
"""
import hashlib
import json
import os
import re
import subprocess
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
GAME = Path(os.environ.get('TAICHUNG_GAME_SOURCE', ROOT / 'vendor/pokefirered')).resolve()
BASE = 'ce6406d8c2eaf46d543c8a2606de0c3cb1951982'
FONT = ROOT / '.tools/fonts/NotoSansTC.ttf'
ARTIFACTS = ROOT / 'artifacts'
if GAME != (ROOT / 'vendor/pokefirered').resolve():
    ARTIFACTS = ARTIFACTS / 'worktrees' / hashlib.sha256(str(GAME).encode()).hexdigest()[:12]
URL = 'https://raw.githubusercontent.com/google/fonts/86aced91de05cd4f96a06838124cca45be337b2b/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf'
SHA256 = '864727d210d54f2537bbe23b3a839436c3992af72de9322af5270897246bd44f'
CONFIG = json.loads(Path(os.environ.get('TAICHUNG_TRANSLATION_CONFIG', ROOT / 'scripts/map-content/taichung-zh.json')).read_text())


def c_string(value):
    return '"' + value.replace('"', '\\"').replace('\n', r'\n') + '"'


def is_chinese(character):
    n = ord(character)
    return 0x3400 <= n <= 0x9FFF or 0x3000 <= n <= 0x303F or n == 0x30FB or 0xFF00 <= n <= 0xFFEF


def write_changed(path, content):
    if not path.exists() or path.read_text() != content:
        path.write_text(content)


def apply_language_menus():
    """Keep the prototype's generated native menus in sync with its scripts."""
    def upstream(path):
        return subprocess.check_output(['git', '-C', str(GAME), 'show', f'{BASE}:{path}'], text=True)
    constants = upstream('include/constants/menu.h')
    constants = constants.replace('#define MULTICHOICE_NONE', '#define MULTICHOICE_TAICHUNG_STARTERS                          65\n#define MULTICHOICE_TAICHUNG_LANGUAGE                          66\n\n#define MULTICHOICE_NONE', 1)
    write_changed(GAME / 'include/constants/menu.h', constants)
    source = upstream('src/script_menu.c')
    source = source.replace('#include "global.h"', '#include "global.h"\n#include "taichung_language.h"', 1)
    block = ''
    en_names = ['CHARMANDER', 'BULBASAUR', 'SQUIRTLE', 'PIKACHU']
    for index, name in enumerate(en_names):
        block += f'static const u8 sText_TaichungStarterEn{index}[] = _({c_string(name)});\n'
    for index, name in enumerate(CONFIG['menus']['starters']):
        block += f'static const u8 sText_TaichungStarterZh{index}[] = _({c_string(name)});\n'
    for index, name in enumerate(CONFIG['menus']['language']):
        block += f'static const u8 sText_TaichungLanguage{index}[] = _({c_string(name)});\n'
    for label, count in [('Starters', 4), ('StartersZh', 4), ('Language', 2)]:
        prefix = 'StarterEn' if label == 'Starters' else 'StarterZh' if label == 'StartersZh' else 'Language'
        block += f'static const struct MenuAction sMultichoiceList_Taichung{label}[] = {{\n'
        block += ''.join(f'    {{ sText_Taichung{prefix}{index} }},\n' for index in range(count))
        block += '};\n'
    marker = 'static const struct MultichoiceListStruct sMultichoiceLists[] = {'
    source = source.replace(marker, block + '\n' + marker, 1)
    source = source.replace(marker, marker + '\n    [MULTICHOICE_TAICHUNG_STARTERS] = MULTICHOICE(sMultichoiceList_TaichungStarters),\n    [MULTICHOICE_TAICHUNG_LANGUAGE] = MULTICHOICE(sMultichoiceList_TaichungLanguage),', 1)
    source = source.replace('        list = sMultichoiceLists[mcId].list;', '        list = sMultichoiceLists[mcId].list;\n        if (mcId == MULTICHOICE_TAICHUNG_STARTERS && TaichungIsChinese())\n            list = sMultichoiceList_TaichungStartersZh;', 1)
    write_changed(GAME / 'src/script_menu.c', source)


def main():
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    if not FONT.exists():
        FONT.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(URL, FONT)
    if hashlib.sha256(FONT.read_bytes()).hexdigest() != SHA256:
        raise SystemExit('Noto Sans TC checksum mismatch')
    corpus = json.dumps(CONFIG, ensure_ascii=False)
    # Include project-owned native labels while leaving legacy Japanese text alone.
    native_label_sources = [GAME / 'src/start_menu.c', *sorted((GAME / 'src').glob('taichung*.c'))]
    for source in native_label_sources:
        corpus += '\n'.join(re.findall(r'_(\("[^"\n]*"\))', source.read_text()))
    original_charmap = subprocess.check_output(['git', '-C', str(GAME), 'show', f'{BASE}:charmap.txt'], text=True)
    existing_chars = set(re.findall(r"^'(.)'\s*=", original_charmap, flags=re.MULTILINE))
    # Retain original Japanese punctuation encodings: fixed-size legacy player
    # names depend on them. These marks use the existing readable punctuation.
    chars = sorted(set(filter(is_chinese, corpus)) - existing_chars)
    font = ImageFont.truetype(str(FONT), 12)
    try:
        font.set_variation_by_name('Medium')
    except (OSError, ValueError):
        pass
    rows = []
    for index, char in enumerate(chars):
        bitmap = Image.new('L', (12, 14), 0)
        draw = ImageDraw.Draw(bitmap)
        bbox = font.getbbox(char)
        draw.text((-bbox[0], 1-bbox[1]), char, font=font, fill=255)
        masks = [sum(1 << x for x in range(12) if bitmap.getpixel((x, y)) >= 96) for y in range(14)]
        if not any(masks):
            raise SystemExit(f'Blank glyph: {char}')
        rows.append('    {' + ', '.join(f'0x{value:03x}' for value in masks) + f'}}, // {index}: {char}')
    header = '// Generated by scripts/generate-chinese-font.py. SIL OFL 1.1; see assets/fonts/OFL.txt.\n'
    header += 'static const u16 sTaichungChineseGlyphs[][14] = {\n' + '\n'.join(rows) + '\n};\n'
    write_changed(GAME / 'src/data/taichung_glyphs.h', header)
    charmap = original_charmap.rstrip() + '\n\n@ TAICHUNG CHINESE SUBSET\n'
    for index, char in enumerate(chars):
        charmap += f"'{char}' = FC 19 {index % 240 + 1:02X} {index // 240 + 1:02X}\n"
    write_changed(GAME / 'charmap.txt', charmap)

    translations = CONFIG['translations']
    lines = ['#include "global.h"', '#include "event_data.h"', '#include "taichung_language.h"', '']
    for symbol, text in translations.items():
        lines.extend([f'extern const u8 {symbol}[];', f'static const u8 sZh_{symbol}[] = _({c_string(text)});'])
    lines.extend(['', 'bool8 TaichungIsChinese(void)', '{', '    // A quest-log replay must not replace the current saved preference.', '    return gSaveBlock1Ptr != NULL && gSaveBlock1Ptr->vars[TAICHUNG_LANGUAGE_VAR - VARS_START] == TAICHUNG_LANGUAGE_ZH;', '}', '', 'const u8 *TaichungText(const u8 *english, const u8 *chinese)', '{', '    return TaichungIsChinese() ? chinese : english;', '}', '', 'const u8 *TaichungTranslate(const u8 *text)', '{', '    if (!TaichungIsChinese())', '        return text;'])
    for symbol in translations:
        lines.extend([f'    if (text == {symbol})', f'        return sZh_{symbol};'])
    lines.extend(['    return text;', '}', ''])
    write_changed(GAME / 'src/taichung_language.c', '\n'.join(lines))
    apply_language_menus()
    (ARTIFACTS / 'chinese-glyphs.json').write_text(json.dumps({'glyphCount': len(chars), 'advance': 12, 'height': 14, 'encoding': 'FC 19 (index%240+1) (index//240+1)', 'characters': ''.join(chars)}, ensure_ascii=False, indent=2)+'\n')
    # A contact sheet is useful for pixel-size legibility review.
    sheet = Image.new('RGB', (24*16, ((len(chars)+23)//24)*20), '#fffdf5')
    painter = ImageDraw.Draw(sheet)
    for index, char in enumerate(chars):
        bbox=font.getbbox(char)
        painter.text(((index%24)*16-bbox[0]+2, (index//24)*20-bbox[1]+2), char, font=font, fill='#172d29')
    sheet.save(ARTIFACTS / 'chinese-font-proof.png')
    print(f'Generated {len(chars)} native Chinese glyphs and {len(translations)} runtime translations.')


if __name__ == '__main__':
    main()
