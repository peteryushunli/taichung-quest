#!/usr/bin/env python3
"""Read native cells for an honest comparison; validate own exports. No game writes."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib,sys,importlib.util,struct
sys.dont_write_bytecode=True
OUT=Path(__file__).resolve().parent;b=json.loads((OUT/'constraints.json').read_text());c=b['constraints'];S=Path(b['nativeSource'])
spec=importlib.util.spec_from_file_location('readonly_civic_render',S/'tools/taichung/render_maps.py');native=importlib.util.module_from_spec(spec);spec.loader.exec_module(native)
layouts=json.loads((S/'data/layouts/layouts.json').read_text())['layouts'];lid=c['mapId'].replace('MAP_','LAYOUT_',1);layout=next(x for x in layouts if x.get('id')==lid)
assert hashlib.sha256((S/layout['blockdata_filepath']).read_bytes()).hexdigest()==c['currentMapSha256'], 'Native map changed since the audit'
mts=native.render_metatiles(S,c['primaryTileset'],c['secondaryTileset']);data=native.words(S/layout['blockdata_filepath']);w,h=c['size'];ox,oy=c['origin'];before=Image.new('RGB',(w*16,h*16))
for y in range(h):
 for x in range(w):before.paste(mts[data[(oy+y)*layout['width']+ox+x]&0x3ff],(x*16,y*16))
before.save(OUT/'current-native-reference.png');after=before.copy();ground={'prefectural-hall':0x175,'second-market':0x1c1,'cultural-heritage-park':1}[c['id']]
signs={'prefectural-hall':[(9,6)],'second-market':[],'cultural-heritage-park':[(5,17)]}[c['id']]
for y,row in enumerate(c['currentCollisionRows']):
 for x,v in enumerate(row):
  if v=='1' and (x,y) not in signs:after.paste(mts[ground],(x*16,y*16))
im=Image.open(OUT/'native.png');rgba=im.convert('RGBA');after.paste(rgba,mask=rgba.getchannel('A'));after.save(OUT/'context-native.png');after.resize((after.width*4,after.height*4),Image.Resampling.NEAREST).save(OUT/'context-preview-4x.png')
# Original indexed art constraints and exact tile decode checks.
assert im.mode=='P' and im.size==(w*16,h*16) and im.info['transparency']==0
assert (OUT/'native.png').read_bytes()[24]==4 and len(set(im.tobytes())-{0})<=15
for y in range(im.height):
 for x in range(im.width):
  if b['conservativeClearRows'][y//16][x//16]=='1':assert im.getpixel((x,y))==0
raw=(OUT/'tiles.4bpp').read_bytes();tilemap=(OUT/'tilemap-u16.bin').read_bytes();decoded=Image.new('P',im.size);offset=0
for ty in range(im.height//8):
 for tx in range(im.width//8):
  tid=struct.unpack_from('<H',tilemap,offset)[0];offset+=2;tile=raw[tid*32:(tid+1)*32]
  for p,v in enumerate(tile):
   yy=p//4;xx=(p%4)*2;decoded.putpixel((tx*8+xx,ty*8+yy),v&15);decoded.putpixel((tx*8+xx+1,ty*8+yy),v>>4)
assert decoded.tobytes()==im.tobytes()
for (x,y) in signs:assert before.crop((x*16,y*16,x*16+16,y*16+16)).tobytes()==after.crop((x*16,y*16,x*16+16,y*16+16)).tobytes()
# Labelled exact-size before/after, each at3x; no stretching or photo synthesis.
scale=3;pw=after.width*scale;ph=after.height*scale;board=Image.new('RGB',(pw*2+80,ph+166),'#e8e0c8');d=ImageDraw.Draw(board);font='/System/Library/Fonts/Menlo.ttc';f=ImageFont.truetype(font,20);sm=ImageFont.truetype(font,12)
title={'prefectural-hall':'PREFECTURAL HALL','second-market':'SECOND MARKET','cultural-heritage-park':'CULTURAL HERITAGE PARK'}[c['id']]
d.text((24,20),title+' / NATIVE ART DRAFT',font=f,fill='#283840');d.text((24,57),'CURRENT SOURCE / 2362263',font=sm,fill='#586878');d.text((pw+56,57),f'REDRAW / {after.width} x {after.height}',font=sm,fill='#586878');board.paste(before.resize((pw,ph),Image.Resampling.NEAREST),(24,82));board.paste(after.resize((pw,ph),Image.Resampling.NEAREST),(pw+56,82))
m=json.loads((OUT/'metrics.json').read_text());d.text((24,ph+101),f"{m['paletteOpaqueCount']} opaque colors + transparency / {m['native8x8']['uniqueExactIncludingTransparent']} exact unique 8px tiles",font=sm,fill='#283840');d.text((24,ph+126),'Audited clear cells and signs retained. Artwork draft; no native source/map edits.',font=sm,fill='#586878');board.save(OUT/'comparison.png')
checks={'passed':True,'nativeBinding':b['nativeHead'],'checks':['native dimensions','4bpp indexed <=15 opaque + transparent0','zero opaque pixels in conservatively retained existing clear native cells','raw tiles/tilemap pixel-exact decode','existing sign crops unchanged'],'files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(OUT.iterdir()) if p.is_file() and p.name!='validation.json'}}
(OUT/'validation.json').write_text(json.dumps(checks,indent=2)+'\n');print(c['id'],m['native8x8'],'PASS')
