#!/usr/bin/env python3
"""Original integer-grid pixel art, not photo conversion. Writes only beside this file."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json,hashlib,struct,sys,importlib.util
sys.dont_write_bytecode=True
OUT=Path(__file__).resolve().parent
PAL=['000000','283840','384858','586878','8090a0','a89878','e0d8b8','f8f0d8','784840','b86848','d89060','284850','609098','d8b858','507850','80a868']
P=[n for h in PAL for n in bytes.fromhex(h)]+[0]*720
im=Image.new('P',(160,160),0);im.putpalette(P);im.info['transparency']=0;d=ImageDraw.Draw(im)
# Repeated brick/window bays keep material clusters coherent and native tile reuse possible.
def masonry(box):
 d.rectangle(box,fill=9)
 x0,y0,x1,y1=box
 for y in range(y0+3,y1,4):
  d.line((x0,y,x1,y),fill=8)
  for x in range(x0+((y//4)%2)*4,x1,8):d.line((x,y-2,x,y-1),fill=10)
def arch(x,y,w,h,frame=7):
 d.rectangle((x,y+3,x+w-1,y+h-1),fill=frame);d.arc((x,y,x+w-1,y+6),180,360,fill=frame,width=2)
 d.rectangle((x+2,y+3,x+w-3,y+h-2),fill=11);d.line((x+3,y+2,x+w-4,y+2),fill=11)
 d.line((x+3,y+4,x+3,y+h-3),fill=12);d.line((x+w//2,y+3,x+w//2,y+h-2),fill=6);d.line((x+2,y+h//2,x+w-3,y+h//2),fill=6)
 d.line((x-1,y+h,x+w,y+h),fill=5)
# Long red-brick wing, one upper arcade and one lower storey.
masonry((44,43,157,76))
for x in range(48,157,16):
 arch(x+3,44,9,14)
 d.rectangle((x+1,61,x+2,76),fill=7)
 d.rectangle((x+4,64,x+10,74),fill=7);d.rectangle((x+5,65,x+9,73),fill=11);d.line((x+6,66,x+6,72),fill=12);d.line((x+5,69,x+9,69),fill=6)
d.rectangle((44,59,157,62),fill=6);d.line((44,59,157,59),fill=7);d.line((44,62,157,62),fill=5)
d.rectangle((44,76,158,78),fill=6);d.line((44,79,158,79),fill=1)
# Mansard roof with regular slate courses, hipped end and round-headed dormers.
d.polygon([(45,17),(151,17),(158,23),(158,39),(43,39)],fill=1)
d.polygon([(47,18),(150,18),(156,24),(156,36),(45,36)],fill=2)
for y in range(21,36,4):
 d.line((46,y,155,y),fill=3)
 for x in range(48+(y%8),155,8):d.point((x,y+1),fill=4)
d.line((48,18,150,18),fill=4);d.line((150,19,156,25),fill=3)
for x in range(51,151,16):
 d.rectangle((x+1,25,x+8,33),fill=7);d.line((x+2,24,x+7,24),fill=6);d.line((x+3,23,x+6,23),fill=5)
 d.rectangle((x+3,26,x+6,32),fill=11);d.point((x+4,25),fill=11);d.line((x+4,27,x+4,31),fill=12);d.line((x,34,x+9,34),fill=1)
d.rectangle((43,37,158,40),fill=6);d.line((43,37,158,37),fill=7);d.line((43,41,158,41),fill=5)
# Pale corner entrance block: broad slate crown rather than a generic tower.
d.polygon([(5,13),(11,8),(35,8),(43,14),(46,30),(1,30)],fill=1)
d.polygon([(7,14),(12,9),(34,9),(41,15),(44,28),(3,28)],fill=2)
for y in (13,17,21,25):d.line((8 if y<17 else 5,y,40 if y<17 else 42,y),fill=3)
d.line((12,9,34,9),fill=4)
for x in (10,21,32):
 d.arc((x,17,x+6,24),180,360,fill=6,width=2);d.rectangle((x,20,x+6,25),fill=6);d.rectangle((x+2,20,x+4,24),fill=11)
# The central pediment/oculus and columned upper loggia.
d.rectangle((1,29,46,56),fill=6);d.rectangle((4,35,43,51),fill=5)
d.rectangle((2,29,45,32),fill=7);d.line((2,33,45,33),fill=5)
for x in (8,19,30):
 d.rectangle((x,38,x+5,50),fill=11);d.line((x+1,39,x+1,48),fill=12);d.line((x,44,x+5,44),fill=6)
for x in (4,15,27,39):
 d.rectangle((x,35,x+3,51),fill=6);d.line((x,35,x,51),fill=7);d.rectangle((x-1,34,x+4,35),fill=7);d.rectangle((x-1,51,x+4,52),fill=7)
d.polygon([(13,33),(15,29),(19,26),(28,26),(33,30),(35,33)],fill=6);d.line((16,29,20,27),fill=7);d.line((20,27,27,27),fill=7)
d.ellipse((21,29,26,33),fill=5);d.ellipse((22,29,25,32),fill=7)
# Balustrade: alternating lights rather than random decoration.
d.rectangle((1,52,46,56),fill=5);d.line((1,52,46,52),fill=7)
for x in range(4,45,3):d.line((x,53,x,55),fill=7)
d.line((1,57,46,57),fill=7)
# Rusticated ground floor with arched entrances, retained door at x24,y72.
d.rectangle((1,58,46,77),fill=6)
for y in (61,65,69,73):d.line((2,y,45,y),fill=5)
for x in (5,19,34):
 d.ellipse((x,61,x+9,70),fill=5);d.rectangle((x,66,x+9,77),fill=5)
 d.ellipse((x+1,62,x+8,70),fill=11);d.rectangle((x+1,66,x+8,77),fill=11)
 d.line((x+2,67,x+2,76),fill=12)
# Projecting entrance porch and curved ornamented hood.
d.arc((15,52,33,64),180,360,fill=7,width=3);d.rectangle((13,59,35,62),fill=6);d.line((13,59,35,59),fill=7);d.polygon([(14,59),(24,54),(34,59)],fill=7);d.ellipse((22,56,26,59),fill=13)
for x in (14,32):d.rectangle((x,63,x+2,77),fill=6);d.line((x,63,x,76),fill=7);d.rectangle((x-1,62,x+3,63),fill=7)
d.line((0,78,47,78),fill=7);d.line((0,79,47,79),fill=1)
# Small finials are architecture accents, not emblems or clocks.
d.line((23,2,23,7),fill=1);d.point((23,1),fill=13);d.line((21,6,25,6),fill=5)
# Dark side reveal separates pale corner from repeated brick wing.
d.line((47,33,47,77),fill=5);d.line((158,43,158,77),fill=1)

# Honor actual audited native clear cells; no new collision or overhang assumption.
constraints=json.loads((OUT/'constraints.json').read_text())
for cy,row in enumerate(constraints['conservativeClearRows']):
 for cx,value in enumerate(row):
  if value=='1':d.rectangle((cx*16,cy*16,cx*16+15,cy*16+15),fill=0)

# Self-contained exports and native budget accounting.
def export():
 im.save(OUT/'native.png',bits=4,transparency=0)
 rgba=im.convert('RGBA');back=Image.new('RGB',im.size,'#b8c8a0');back.paste(rgba,mask=rgba.getchannel('A'))
 back.resize((640,640),Image.Resampling.NEAREST).save(OUT/'preview-4x.png')
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
 meta={'id':'prefectural-hall','status':'native-art-review-draft; exact2362263-footprint-clear-mask-bound','nativePixels':list(im.size),'metatileFootprint':[10,10],'worldRectHalfOpen':[93,84,103,94],'paletteOpaqueCount':len(set(im.tobytes())-{0}),'paletteIndex0':'transparent','rgb555Exact':True,'occupiedPixels':sum(bool(v) for v in im.tobytes()),'pixelOccupancyRatio':sum(bool(v) for v in im.tobytes())/(im.width*im.height),'native8x8':{'totalCells':len(keys),'occupiedCells':active,'uniqueExactIncludingTransparent':len(atlas),'uniqueWithHVFlipsIncludingTransparent':len(set(can)),'uniqueTileBytes4bpp':len(raw)},'opaqueBounds':list(mask.getbbox()),'doorVisualAnchorPx':[24,72],'preservedApproach':'Art stays within top5 metatile rows; lower half and original forecourt/approach remain transparent. No collision or warp edits.','sourceNativeReadOnly':'2362263510dfa38987c36b6cc40dca8d9372fc3c; read-only audit source','sources':[{'page':'https://travel.taichung.gov.tw/en/attractions/intro/1367','photo':'https://www.taichung.gov.tw/media/468752/台中州廳.jpg','observed':'pale corner portico; slate mansard; columned loggia; red brick wings'},{'page':'https://english.taichung.gov.tw/3390771/post','photo':'https://english.taichung.gov.tw/media/1477198/由南翼俯視臺中州廳建築_0.jpg','observed':'repeated arched wing windows; horizontal pale bands; round-headed dormers'}]}
 meta['nativeBinding']=constraints
 meta['conservativeClearOpaquePixels']=sum(1 for y in range(im.height) for x in range(im.width) if constraints['conservativeClearRows'][y//16][x//16]=='1' and im.getpixel((x,y)))
 assert meta['conservativeClearOpaquePixels']==0
 (OUT/'metrics.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(meta['native8x8']))
export()

