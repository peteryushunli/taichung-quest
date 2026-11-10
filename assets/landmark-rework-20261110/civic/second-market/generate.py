#!/usr/bin/env python3
"""Original integer-grid pixel art, not photo conversion. Writes only beside this file."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json,hashlib,struct,sys,importlib.util
sys.dont_write_bytecode=True
OUT=Path(__file__).resolve().parent
PAL=['000000','283840','384858','586878','8090a0','a89878','e0d8b8','f8f0d8','784840','b86848','d89060','284850','609098','d8b858','507850','80a868']
P=[n for h in PAL for n in bytes.fromhex(h)]+[0]*720
im=Image.new('P',(112,144),0);im.putpalette(P);im.info['transparency']=0;d=ImageDraw.Draw(im)
# Three roof wings preserve current footprint and leave the south-center passage open.
for side in (0,1):
 for y in range(80,144):
  for x0 in range(56):
   rel=x0+y-124
   if 0<=rel<16:
    x=x0 if side==0 else 111-x0
    d.point((x,y),fill=1 if rel in (0,15) else 4 if rel==1 else 2 if rel<13 else 3)
    if 2<rel<13 and (x0-y)%8==0:d.point((x,y),fill=3)
# Long north wing and small colored awnings, clipped to existing bay positions.
d.rectangle((32,0,79,55),fill=1);d.rectangle((33,1,78,54),fill=2)
for x in range(36,79,8):
 d.line((x,1,x,54),fill=3);d.line((x+1,1,x+1,54),fill=4)
d.line((55,0,55,54),fill=1);d.line((56,0,56,54),fill=4)
for y in (8,24,40):
 for x in (24,80):
  d.rectangle((x,y,x+7,y+7),fill=1)
  for xx in range(x+1,x+7):d.line((xx,y+1,xx,y+5),fill=6 if (xx-x)//2%2 else 9)
  d.line((x+1,y+6,x+6,y+6),fill=8)
# Six-sided top mass: two oblique side facets around the main brick front.
d.polygon([(33,56),(43,50),(68,50),(78,56),(82,66),(78,73),(33,73),(29,66)],fill=1)
d.polygon([(34,56),(44,51),(67,51),(77,56),(80,66),(77,71),(34,71),(31,66)],fill=3)
d.line((44,52,67,52),fill=4);d.line((34,57,31,66),fill=4)
# Brick hall with side facets, piers and a prominent stepped gable.
d.rectangle((32,62,79,103),fill=8);d.rectangle((40,61,71,102),fill=9)
for y in range(65,101,4):
 d.line((33,y,78,y),fill=8)
 for x in range(34+(y%8),78,8):d.point((x,y-2),fill=10)
for x in (33,39,70,76):
 d.rectangle((x,62,x+2,101),fill=6);d.line((x,62,x,100),fill=7)
# Curved/stepped plaster parapet is the real market's recognition feature.
d.polygon([(39,60),(39,53),(43,53),(43,50),(48,50),(48,47),(52,47),(52,45),(59,45),(59,47),(64,47),(64,50),(68,50),(68,53),(72,53),(72,60)],fill=1)
d.polygon([(40,59),(40,54),(44,54),(44,51),(49,51),(49,48),(53,48),(53,46),(58,46),(58,48),(63,48),(63,51),(67,51),(67,54),(71,54),(71,59)],fill=6)
d.line((44,54,48,52),fill=7);d.line((49,51,52,49),fill=7);d.line((53,47,58,47),fill=7);d.line((63,52,67,54),fill=5)
# Arched upper window and offset narrow flank windows.
d.ellipse((49,56,62,65),fill=5);d.rectangle((49,60,62,74),fill=5);d.ellipse((50,57,61,65),fill=11);d.rectangle((50,61,61,73),fill=11)
d.line((51,61,51,72),fill=12);d.line((55,58,55,73),fill=6);d.line((50,65,61,65),fill=6)
for x in (35,73):
 d.rectangle((x,65,x+3,74),fill=11);d.line((x,66,x,72),fill=12)
# Balcony/stone lintel and unlettered native-localization signboard.
d.rectangle((39,75,72,77),fill=5);d.line((39,75,72,75),fill=7)
for x in range(42,71,4):d.line((x,76,x,78),fill=6)
d.rectangle((32,79,79,85),fill=6);d.line((32,79,79,79),fill=7)
d.rectangle((47,80,64,84),fill=5);d.line((48,81,63,81),fill=13)
# Broad open market passage remains centered at x56. The passage is visual, not a warp.
d.rectangle((47,86,64,103),fill=5);d.rectangle((49,87,62,103),fill=11);d.line((50,88,50,101),fill=12)
for x in (34,71):
 d.rectangle((x,88,x+5,99),fill=11);d.line((x+1,89,x+1,97),fill=12);d.line((x,101,x+5,101),fill=6)
d.line((32,103,79,103),fill=1)

# Honor actual audited native clear cells; no new collision or overhang assumption.
constraints=json.loads((OUT/'constraints.json').read_text())
for cy,row in enumerate(constraints['conservativeClearRows']):
 for cx,value in enumerate(row):
  if value=='1':d.rectangle((cx*16,cy*16,cx*16+15,cy*16+15),fill=0)

# Self-contained exports and native budget accounting.
def export():
 im.save(OUT/'native.png',bits=4,transparency=0)
 rgba=im.convert('RGBA');back=Image.new('RGB',im.size,'#b8c8a0');back.paste(rgba,mask=rgba.getchannel('A'))
 back.resize((im.width*4,im.height*4),Image.Resampling.NEAREST).save(OUT/'preview-4x.png')
 pal=bytearray()
 for h in PAL:
  r,g,b=bytes.fromhex(h);assert all(v%8==0 for v in (r,g,b));pal+=struct.pack('<H',(r>>3)|((g>>3)<<5)|((b>>3)<<10))
 (OUT/'palette-rgb555.bin').write_bytes(pal)
 keys=[];can=[];active=0;atlas=[]
 for y in range(0,im.height,8):
  for x in range(0,im.width,8):
   a=im.crop((x,y,x+8,y+8));key=a.tobytes();keys.append(key)
   if any(key):active+=1
   canon=min(key,a.transpose(Image.Transpose.FLIP_LEFT_RIGHT).tobytes(),a.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes(),a.transpose(Image.Transpose.ROTATE_180).tobytes());can.append(canon)
   if key not in atlas:atlas.append(key)
 # Deduplicated atlas stores raw8x8 tiles; a tile map uses plain tile indices.
 tiles=Image.new('P',(128,((len(atlas)+15)//16)*8));tiles.putpalette(P)
 raw=bytearray();tilemap=[]
 for i,key in enumerate(atlas):
  tile=Image.frombytes('P',(8,8),key);tiles.paste(tile,((i%16)*8,(i//16)*8))
  for k in range(0,64,2):raw.append(key[k]|(key[k+1]<<4))
 for key in keys:tilemap.append(atlas.index(key))
 tiles.save(OUT/'tiles.png',bits=4,transparency=0);(OUT/'tiles.4bpp').write_bytes(raw);(OUT/'tilemap-u16.bin').write_bytes(b''.join(struct.pack('<H',v) for v in tilemap))
 mask=rgba.getchannel('A');mask.save(OUT/'occupancy-mask.png')
 meta={'id':'second-market','status':'native-art-review-draft; exact2362263-footprint-clear-mask-bound','nativePixels':list(im.size),'metatileFootprint':[7,9],'worldRectHalfOpen':[98,20,105,29],'paletteOpaqueCount':len(set(im.tobytes())-{0}),'paletteIndex0':'transparent','rgb555Exact':True,'occupiedPixels':sum(bool(v) for v in im.tobytes()),'pixelOccupancyRatio':sum(bool(v) for v in im.tobytes())/(im.width*im.height),'native8x8':{'totalCells':len(keys),'occupiedCells':active,'uniqueExactIncludingTransparent':len(atlas),'uniqueWithHVFlipsIncludingTransparent':len(set(can)),'uniqueTileBytes4bpp':len(raw)},'opaqueBounds':list(mask.getbbox()),'doorVisualAnchorPx':[56,100],'preservedApproach':'North roof32..79px; tower within original center envelope; diagonal wing bands retain their original x+y124..139 alignment. South center approach remains transparent. No collision/warp edits.','sourceNativeReadOnly':'2362263510dfa38987c36b6cc40dca8d9372fc3c; read-only audit source','sources':[{'page':'https://travel.taichung.gov.tw/en/attractions/intro/1366','photo':'https://taichung.travel/content/images/attractions/25567/1024x768_image_cover636602457033830486.jpg','observed':'brick observation hall; stepped plaster pediment; concrete-banded portals; actual flat parapet, not a pagoda roof'}]}
 meta['nativeBinding']=constraints
 meta['conservativeClearOpaquePixels']=sum(1 for y in range(im.height) for x in range(im.width) if constraints['conservativeClearRows'][y//16][x//16]=='1' and im.getpixel((x,y)))
 assert meta['conservativeClearOpaquePixels']==0
 (OUT/'metrics.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(meta['native8x8']))
export()

