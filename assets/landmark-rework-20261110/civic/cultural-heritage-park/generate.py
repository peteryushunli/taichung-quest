#!/usr/bin/env python3
"""Original integer-grid pixel art, not photo conversion. Writes only beside this file."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json,hashlib,struct,sys,importlib.util
sys.dont_write_bytecode=True
OUT=Path(__file__).resolve().parent
PAL=['000000','283840','384858','586878','8090a0','a89878','e0d8b8','f8f0d8','784840','b86848','d89060','284850','609098','d8b858','507850','80a868']
P=[n for h in PAL for n in bytes.fromhex(h)]+[0]*720
im=Image.new('P',(176,288),0);im.putpalette(P);im.info['transparency']=0;d=ImageDraw.Draw(im)
def brick(box):
 d.rectangle(box,fill=9);x0,y0,x1,y1=box
 for y in range(y0+3,y1,4):
  d.line((x0,y,x1,y),fill=8)
  for x in range(x0+((y//4)%2)*4,x1,8):d.point((x,y-2),fill=10)
def window(x,y,w=12,h=18):
 d.rectangle((x,y,x+w-1,y+h-1),fill=14);d.rectangle((x+2,y+2,x+w-3,y+h-3),fill=11)
 d.line((x+2,y+2,x+w-3,y+2),fill=15);d.line((x+w//2,y+2,x+w//2,y+h-3),fill=14)
 for yy in range(y+6,y+h-2,5):d.line((x+2,yy,x+w-3,yy),fill=14)
 d.line((x,y+h,x+w-1,y+h),fill=5)
def roll_door(x,y,w=12,h=15):
 d.rectangle((x,y,x+w-1,y+h-1),fill=1);d.rectangle((x+1,y+1,x+w-2,y+h-1),fill=14)
 for yy in range(y+3,y+h-1,3):d.line((x+2,yy,x+w-3,yy),fill=15)
 d.line((x+2,y+1,x+2,y+h-1),fill=12)
def roof(box,saw=False):
 x0,y0,x1,y1=box
 if saw:
  d.rectangle((x0,y0+12,x1,y1),fill=1)
  for x in range(x0,x1,16):
   d.polygon([(x,y0+12),(x+12,y0),(min(x+15,x1),y0),(min(x+15,x1),y0+12)],fill=1)
   d.polygon([(x+2,y0+12),(x+12,y0+2),(min(x+14,x1),y0+2),(min(x+14,x1),y0+12)],fill=3)
   d.line((x+12,y0+3,x+12,y0+10),fill=12)
 else:
  mid=(x0+x1)//2;d.polygon([(x0,y0+16),(mid,y0),(x1,y0+16),(x1,y1),(x0,y1)],fill=1)
  d.polygon([(x0+2,y0+17),(mid,y0+2),(x1-2,y0+17),(x1-2,y1-2),(x0+2,y1-2)],fill=2)
  d.line((x0+3,y0+17,mid,y0+3),fill=4)
 for y in range(y0+20,y1-2,4):d.line((x0+3,y,x1-3,y),fill=3)
 d.line((x0,y1,x1,y1),fill=1)
# North block, original9x4-cell envelope: plaster gable + chimney + brick brewhouse.
d.rectangle((16,46,95,78),fill=6);brick((16,68,95,78));roof((16,16,95,47))
# Pale gable face and real circular attic vent.
d.polygon([(20,32),(55,18),(91,32),(91,45),(20,45)],fill=6);d.line((21,32,55,19),fill=7)
d.ellipse((51,24,60,35),fill=5);d.ellipse((53,25,58,33),fill=11);d.line((55,26,55,32),fill=6)
for x in (22,40,58):window(x,49,15,17)
roll_door(82,64,10,15);d.line((16,79,95,79),fill=1)
# Metal chimney stays entirely inside the north warehouse envelope.
d.rectangle((100,17,109,73),fill=1);d.rectangle((101,18,108,70),fill=3);d.line((102,18,102,69),fill=6);d.line((104,19,104,69),fill=4)
for y in range(22,69,9):d.line((100,y,109,y),fill=2);d.point((102,y+1),fill=7)
d.rectangle((99,16,110,18),fill=4);d.line((100,16,109,16),fill=7);d.rectangle((98,71,111,78),fill=5);d.line((98,79,111,79),fill=1)
# Distinct red-brick gabled brewhouse on the right.
brick((112,47,159,78));d.polygon([(112,47),(135,31),(159,47)],fill=1);d.polygon([(115,46),(135,34),(156,46)],fill=9);d.line((115,46,135,34),fill=6);d.line((135,34,156,46),fill=5)
d.arc((131,38,140,48),180,360,fill=6,width=2);d.rectangle((132,43,139,47),fill=11);d.line((135,42,135,47),fill=6)
for x in (116,130,144):window(x,51,11,23)
d.line((112,79,159,79),fill=1)
# Middle west: sawtooth daylighting roof, broad green factory windows, retained door.
brick((16,128,95,158));roof((16,96,95,127),saw=True)
for x in (22,70):window(x,132,19,19)
roll_door(50,144,12,15);d.line((16,159,95,159),fill=1)
# Middle east: flat industrial annex, a pipe bank and rectangular factory fenestration.
brick((112,116,159,158));d.rectangle((112,98,159,115),fill=2);d.rectangle((112,96,159,99),fill=6);d.line((113,96,158,96),fill=7)
for x in (115,125,135,145):d.rectangle((x,103,x+6,113),fill=3);d.line((x,103,x,113),fill=4)
for x in (116,144):window(x,120,11,18)
roll_door(130,144,12,15);d.line((112,159,159,159),fill=1)
# South west: long goods shed, vented roof and double loading openings.
brick((16,224,95,254));roof((16,192,95,223))
for x in (30,62):
 d.rectangle((x,209,x+11,217),fill=1);d.rectangle((x+1,210,x+10,216),fill=3)
 for xx in range(x+2,x+10,3):d.line((xx,211,xx,215),fill=4)
window(22,228,17,22);window(72,228,17,22);roll_door(50,240,12,15);d.line((16,255,95,255),fill=1)
# Four painted storage vessels, confined to the exact original barrel cells.
for j,(x,y) in enumerate([(128,192),(144,208),(128,224),(144,240)]):
 d.ellipse((x+2,y+1,x+13,y+6),fill=1);d.rectangle((x+2,y+4,x+13,y+13),fill=1);d.ellipse((x+2,y+10,x+13,y+15),fill=1)
 d.rectangle((x+3,y+4,x+12,y+12),fill=12 if j%2 else 14);d.ellipse((x+3,y+2,x+12,y+6),fill=6)
 d.line((x+4,y+3,x+10,y+3),fill=7);d.line((x+3,y+8,x+12,y+8),fill=13);d.line((x+3,y+12,x+12,y+12),fill=2)

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
 meta={'id':'cultural-heritage-park','status':'native-art-review-draft; exact2362263-footprint-clear-mask-bound','nativePixels':list(im.size),'metatileFootprint':[11,18],'worldRectHalfOpen':[60,121,71,139],'paletteOpaqueCount':len(set(im.tobytes())-{0}),'paletteIndex0':'transparent','rgb555Exact':True,'occupiedPixels':sum(bool(v) for v in im.tobytes()),'pixelOccupancyRatio':sum(bool(v) for v in im.tobytes())/(im.width*im.height),'native8x8':{'totalCells':len(keys),'occupiedCells':active,'uniqueExactIncludingTransparent':len(atlas),'uniqueWithHVFlipsIncludingTransparent':len(set(can)),'uniqueTileBytes4bpp':len(raw)},'opaqueBounds':list(mask.getbbox()),'doorVisualAnchorPx':[88,72],'preservedApproach':'All architecture remains in original four warehouse envelopes and four barrel cells. East spine x96..111px and cross-aisles y80..95,160..175,256..271px remain transparent. Existing doors retained; no collision/warp edits.','sourceNativeReadOnly':'2362263510dfa38987c36b6cc40dca8d9372fc3c; read-only audit source','sources':[{'page':'https://travel.taichung.gov.tw/en/Attractions/Intro/1053','photo':'https://taichung.travel/content/images/attractions/3718/1024x768_Filedata635186402486052109.jpg','observed':'factory gables, red brick base, green window ribbons and tall metal chimney'},{'page':'https://travel.taichung.gov.tw/en/Attractions/Intro/1053','photo':'https://taichung.travel/content/images/attractions/50403/1024x768_image637714406033891192.jpg','observed':'industrial yard context; historic brewery complex'}]}
 meta['nativeBinding']=constraints
 meta['conservativeClearOpaquePixels']=sum(1 for y in range(im.height) for x in range(im.width) if constraints['conservativeClearRows'][y//16][x//16]=='1' and im.getpixel((x,y)))
 assert meta['conservativeClearOpaquePixels']==0
 (OUT/'metrics.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(meta['native8x8']))
export()

