#!/usr/bin/env python3
"""Build an art-only review sheet and validate the ten isolated native exports."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parent
ITEMS=[
    ('wanhe-temple','Wanhe Temple','temples','native-overlay-indexed.png'),
    ('wenchang-temple','Wenchang Temple','temples','native-overlay-indexed.png'),
    ('botanical-garden','Botanical Garden','parks-street','native.png'),
    ('confucius-temple','Confucius Temple','temples','native-overlay-indexed.png'),
    ('yizhong-street','Yizhong Street','parks-street','native.png'),
    ('prefectural-hall','Prefectural Hall','civic','native.png'),
    ('second-market','Second Market','civic','native.png'),
    ('cultural-heritage-park','Cultural Heritage Park','civic','native.png'),
    ('fengle-sculpture-park','Fengle Sculpture Park','parks-street','native.png'),
    ('wenxin-forest-park','Wenxin Forest Park','parks-street','native.png'),
]
audit=json.loads((ROOT/'temples/native-footprint-audit.json').read_text())
audited={x['id']:x for x in audit['landmarks']}
overrides={}
for revision_number in (2,3,4):
    revisions=ROOT/f'revisions-v{revision_number}/manifest.json'
    if revisions.exists():
        for item in json.loads(revisions.read_text())['landmarks']:
            overrides[item['id']]={**item,'revision':revision_number}
font_path='/System/Library/Fonts/Supplemental/Arial.ttf'
font=lambda n:ImageFont.truetype(font_path,n)
board=Image.new('RGB',(1408,1640),'#f3f0e5'); d=ImageDraw.Draw(board)
d.text((32,22),'TAICHUNG / LANDMARK REDRAWS',font=font(28),fill='#203838')
d.text((32,61),'Art review  ·  13 / 16 / 17 / 18: centered camera v4  ·  Not installed',font=font(18),fill='#61736a')
entries=[]
for n,(ident,title,group,name) in enumerate(ITEMS):
    p=ROOT/group/ident/name
    revision=overrides.get(ident)
    if revision:p=ROOT/revision['nativeFile']
    im=Image.open(p)
    expected=tuple(v*16 for v in audited[ident]['size'])
    assert im.mode=='P',(ident,im.mode)
    assert im.size==(tuple(revision['nativeSize']) if revision else expected),(ident,im.size,expected)
    assert im.width%16==0 and im.height%16==0,ident
    assert im.info.get('transparency')==0,ident
    used=set(im.get_flattened_data())
    assert max(used)<16,(ident,used)
    pal=im.getpalette()
    assert all(pal[i*3+c]%8==0 for i in used for c in range(3)),ident
    rgba=im.convert('RGBA'); crop=rgba.crop(rgba.getbbox())
    col,row=n%3,n//3; x=32+col*448; y=106+row*376
    d.rounded_rectangle((x,y,x+432,y+358),radius=12,fill='#e3e9d9',outline='#c9d3bf')
    # Integer enlargements only: every game pixel stays a square.
    scale=min(3,400//crop.width,294//crop.height)
    scale=max(scale,1)
    art=crop.resize((crop.width*scale,crop.height*scale),Image.Resampling.NEAREST)
    board.paste(art,(x+(432-art.width)//2,y+12+(294-art.height)//2),art)
    d.line((x+12,y+314,x+420,y+314),fill='#c9d3bf')
    d.text((x+14,y+324),f'{n+11:02d}  {title}'+(f" / v{revision['revision']}" if revision else ''),font=font(18),fill='#203838')
    entries.append({'id':ident,'title':title,'nativeFile':str(p.relative_to(ROOT)),
      'nativePixels':list(im.size),'opaqueColorCount':len(used-{0}),
      'rgb555Exact':True,'dimensionsMatchAuditedMap':im.size==expected,
      'revision':revision['revision'] if revision else 1,'placementUpdateRequired':bool(revision and revision['requiresPlacementUpdate']),
      'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),
      'nativeMap':audited[ident]['mapId'],'priorLocalOrigin':audited[ident]['origin']})
board.save(ROOT/'review-all-ten.png')
(ROOT/'art-manifest.json').write_text(json.dumps({'status':'ART_REVIEW_NOT_INSTALLED',
    'sourceNativeHead':audit['nativeHead'],'sourcePointer':'native-source-pointer.json',
    'validation':'10 indexed native PNGs; <=15 opaque colors; RGB555 aligned;16px grid aligned. Latest market and brewery intentionally have new footprints and require placement/collision changes.',
    'landmarks':entries},indent=2)+'\n')
print(json.dumps({'validatedNativeArt':len(entries),'reviewSheet':str(ROOT/'review-all-ten.png')},indent=2))
