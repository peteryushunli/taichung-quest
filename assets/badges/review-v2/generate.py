#!/usr/bin/env python3
"""Deterministic repo-native pixel artwork. No game state or external assets."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, hashlib
ROOT=Path(__file__).resolve().parent
COLORS=['#000000','#283848','#587088','#f8f0d0','#f8c858','#c88838','#e87858','#a84850','#40a8a0','#90d8b0','#68a8d8','#406898','#609858','#e8d8a8','#8870b0','#d8a0b0']
PALETTE=[v for h in COLORS for v in tuple(bytes.fromhex(h[1:]))]+[0]*(768-48)
NAMES=[('old-taichung-station','Departure','Old Station','啟程徽章'),('taichung-park','Pavilion','Taichung Park','湖亭徽章'),('miyahara','Chill','Miyahara','沁涼徽章'),('natural-science-museum','Discovery','Science Museum','發現徽章'),('calligraphy-greenway','Brush','Greenway','筆意徽章'),('shen-ji-new-village','Craft','Shen Ji','巧作徽章'),('fine-arts-museum','Palette','Fine Arts Museum','調色徽章'),('fengjia-night-market','Feast','Fengjia Market','豐味徽章'),('maple-garden','Habitat','Maple Garden','棲地徽章'),('taichung-theater','Encore','Taichung Theater','謝幕徽章')]
def canvas():
 im=Image.new('P',(16,16),0);im.putpalette(PALETTE);im.info['transparency']=0;return im,ImageDraw.Draw(im)
def line(d,pts,c,w=1):d.line(pts,fill=c,width=w)
icons=[]
# 0: clock with a bright bezel; rails extend beyond round silhouette.
im,d=canvas();d.rectangle((3,11,12,14),fill=1);d.rectangle((4,11,5,14),fill=2);d.rectangle((10,11,11,14),fill=2);d.rectangle((2,12,13,12),fill=5);d.rectangle((1,14,14,14),fill=4);d.ellipse((2,1,13,12),fill=1);d.ellipse((3,2,12,11),fill=5);d.ellipse((4,2,11,9),fill=4);d.ellipse((5,3,10,8),fill=3);line(d,[(7,4),(7,6),(9,6)],1);d.point((4,4),fill=3);icons.append(im)
# 1: upturned pavilion roof, pillars and water.
im,d=canvas();d.polygon([(1,6),(4,5),(6,3),(7,1),(8,1),(9,3),(11,5),(14,6),(14,8),(1,8)],fill=1);line(d,[(2,6),(5,5),(7,3),(8,3),(10,5),(13,6)],6);line(d,[(2,7),(13,7)],7);d.rectangle((4,8,5,11),fill=5);d.rectangle((10,8,11,11),fill=5);d.rectangle((3,11,12,12),fill=1);line(d,[(2,13),(6,13),(7,14),(11,14),(13,13)],10);line(d,[(4,15),(11,15)],8);icons.append(im)
# 2: a single pink ice-cream scoop and a clearly tapered waffle cone.
im,d=canvas();d.polygon([(3,7),(12,7),(9,14),(7,15),(5,12)],fill=1);d.polygon([(4,8),(11,8),(8,14),(6,11)],fill=5);d.polygon([(4,8),(9,8),(7,12),(6,11)],fill=4);line(d,[(5,9),(8,11)],5);line(d,[(6,8),(9,10)],5);d.ellipse((2,0,13,10),fill=1);d.ellipse((3,1,12,8),fill=15);d.rectangle((4,6,11,8),fill=15);line(d,[(4,3),(5,2),(8,2)],3);line(d,[(5,9),(10,9)],7);icons.append(im)
# 3: one large blue planet encircled by an unbroken diagonal gold ring.
im,d=canvas();d.ellipse((3,2,12,12),fill=1);d.ellipse((4,3,11,11),fill=11);d.ellipse((4,3,10,9),fill=10);line(d,[(5,5),(6,4),(8,4)],3);line(d,[(1,11),(0,10),(1,8),(4,6),(10,3),(13,3),(15,4),(15,6),(12,8),(5,12),(2,12),(1,11)],1,2);line(d,[(1,10),(1,9),(4,7)],4);line(d,[(11,4),(13,4),(14,5),(13,7),(10,9),(5,11),(2,11),(1,10)],4);d.point((13,4),fill=3);icons.append(im)
# 4: legible long calligraphy brush, dark nib, and a separate bright leaf.
im,d=canvas();line(d,[(12,1),(5,8)],1,4);line(d,[(12,2),(6,8)],5,2);line(d,[(11,2),(6,7)],4);line(d,[(6,7),(8,9)],1,2);line(d,[(6,8),(7,9)],2);d.polygon([(5,8),(7,10),(5,13),(1,15),(2,11)],fill=1);line(d,[(5,10),(3,13)],2);d.polygon([(9,8),(14,7),(15,8),(14,12),(11,14),(8,14),(8,11)],fill=1);d.polygon([(10,9),(14,8),(13,11),(10,13),(9,13),(9,11)],fill=12);line(d,[(9,13),(12,10),(13,10)],9);icons.append(im)
# 5: offset fabric patches and three bright seam stitches.
im,d=canvas();d.polygon([(2,1),(9,1),(9,4),(14,4),(14,14),(6,14),(6,11),(1,11),(1,3)],fill=1);d.rectangle((2,3,8,10),fill=6);d.rectangle((3,2,8,3),fill=15);d.rectangle((7,5,13,13),fill=8);line(d,[(8,6),(12,6),(12,11)],9);line(d,[(3,4),(3,8)],7);line(d,[(6,5),(8,5)],3);line(d,[(6,8),(8,8)],3);line(d,[(6,11),(8,11)],3);icons.append(im)
# 6: palette with thumb hole and unmistakable paint dots.
im,d=canvas();d.polygon([(5,1),(10,1),(13,3),(14,5),(14,8),(12,10),(10,10),(10,12),(8,14),(4,14),(1,11),(1,6),(3,3)],fill=1);d.polygon([(5,2),(10,2),(12,4),(13,6),(13,8),(11,9),(9,9),(9,12),(7,13),(4,13),(2,10),(2,6)],fill=5);d.polygon([(5,2),(9,2),(12,5),(12,7),(9,8),(8,11),(4,12),(2,9),(3,5)],fill=4);d.rectangle((4,4,5,5),fill=6);d.rectangle((8,3,9,4),fill=10);d.rectangle((10,6,11,7),fill=12);d.rectangle((3,8,4,9),fill=14);d.rectangle((6,9,7,11),fill=1);d.point((6,9),fill=3);icons.append(im)
# 7: diagonal grilled street-food skewer, with exposed wooden ends.
im,d=canvas();line(d,[(2,15),(14,0)],1,3);line(d,[(2,15),(14,0)],5);d.ellipse((2,7,8,13),fill=1);d.ellipse((3,8,7,12),fill=6);line(d,[(4,8),(5,8)],4);line(d,[(4,11),(6,11)],7);d.ellipse((5,4,11,10),fill=1);d.ellipse((6,5,10,9),fill=4);line(d,[(7,5),(8,5)],3);line(d,[(7,8),(9,8)],5);d.ellipse((8,1,14,7),fill=1);d.ellipse((9,2,13,6),fill=6);line(d,[(10,2),(11,2)],4);line(d,[(10,5),(12,5)],7);icons.append(im)
# 8: a single clean water drop; no overlapping leaf or jewel-like center.
im,d=canvas();d.polygon([(7,0),(8,0),(10,3),(13,7),(14,10),(13,13),(11,15),(4,15),(2,13),(1,10),(2,7),(5,3)],fill=1);d.polygon([(7,2),(8,2),(11,7),(12,10),(11,13),(4,13),(3,11),(3,8)],fill=11);d.polygon([(7,2),(8,3),(10,7),(11,10),(9,12),(4,12),(3,10),(4,7)],fill=10);line(d,[(4,8),(5,6),(6,5)],3);line(d,[(5,12),(9,12)],8);icons.append(im)
# 9: asymmetric theatre masks under a curved architectural stage arch.
im,d=canvas();line(d,[(1,6),(1,4),(3,2),(5,1),(10,1),(12,2),(14,4),(14,6)],1,2);line(d,[(2,5),(4,3),(6,2),(10,2),(12,3),(13,5)],5);d.polygon([(2,5),(8,6),(8,10),(6,13),(4,12),(2,9)],fill=1);d.polygon([(3,6),(7,7),(7,10),(6,12),(4,11),(3,9)],fill=3);d.point((4,8),fill=1);d.point((6,8),fill=1);line(d,[(4,10),(5,11),(6,10)],7);d.polygon([(8,5),(14,4),(14,9),(12,12),(9,11),(8,9)],fill=1);d.polygon([(9,6),(13,5),(13,9),(12,11),(10,10),(9,9)],fill=14);d.point((10,7),fill=1);d.point((12,7),fill=1);line(d,[(10,9),(11,8),(12,9)],3);d.rectangle((3,14,12,15),fill=1);line(d,[(4,14),(11,14)],4);icons.append(im)

def rgba(im):return im.convert('RGBA')
def save_svg(im,path):
 rects=[]
 for y in range(im.height):
  for x in range(im.width):
   v=im.getpixel((x,y))
   if v:rects.append(f'<rect x="{x}" y="{y}" width="1" height="1" fill="{COLORS[v]}"/>')
 path.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {im.width} {im.height}" width="{im.width}" height="{im.height}" shape-rendering="crispEdges">'+''.join(rects)+'</svg>\n')
# Authored 5x7 review lettering; Gameplay should use its own native font renderer.
GLYPHS={}
rows={'A':'01110/10001/10001/11111/10001/10001/10001','B':'11110/10001/10001/11110/10001/10001/11110','C':'01111/10000/10000/10000/10000/10000/01111','D':'11110/10001/10001/10001/10001/10001/11110','E':'11111/10000/10000/11110/10000/10000/11111','F':'11111/10000/10000/11110/10000/10000/10000','G':'01111/10000/10000/10111/10001/10001/01111','H':'10001/10001/10001/11111/10001/10001/10001','I':'111/010/010/010/010/010/111','J':'00111/00010/00010/00010/10010/10010/01100','K':'10001/10010/10100/11000/10100/10010/10001','L':'10000/10000/10000/10000/10000/10000/11111','M':'10001/11011/10101/10101/10001/10001/10001','N':'10001/11001/11001/10101/10011/10011/10001','O':'01110/10001/10001/10001/10001/10001/01110','P':'11110/10001/10001/11110/10000/10000/10000','Q':'01110/10001/10001/10001/10101/10010/01101','R':'11110/10001/10001/11110/10100/10010/10001','S':'01111/10000/10000/01110/00001/00001/11110','T':'11111/00100/00100/00100/00100/00100/00100','U':'10001/10001/10001/10001/10001/10001/01110','V':'10001/10001/10001/10001/10001/01010/00100','W':'10001/10001/10001/10101/10101/10101/01010','X':'10001/10001/01010/00100/01010/10001/10001','Y':'10001/10001/01010/00100/00100/00100/00100','Z':'11111/00001/00010/00100/01000/10000/11111','0':'01110/10001/10011/10101/11001/10001/01110','1':'010/110/010/010/010/010/111','2':'01110/10001/00001/00010/00100/01000/11111','3':'11110/00001/00001/01110/00001/00001/11110','4':'00010/00110/01010/10010/11111/00010/00010','5':'11111/10000/10000/11110/00001/00001/11110','6':'01110/10000/10000/11110/10001/10001/01110','7':'11111/00001/00010/00100/01000/01000/01000','8':'01110/10001/10001/01110/10001/10001/01110','9':'01110/10001/10001/01111/00001/00001/01110','!':'1/1/1/1/1/0/1','/':'00001/00001/00010/00100/01000/10000/10000',':':'0/1/0/0/1/0/0','-':'000/000/000/111/000/000/000','.' :'0/0/0/0/0/0/1'}
GLYPHS={k:v.split('/') for k,v in rows.items()}
def text(im,xy,s,c=1):
 d=ImageDraw.Draw(im);x,y=xy
 for char in s.upper():
  if char==' ':x+=4;continue
  g=GLYPHS[char]
  for yy,row in enumerate(g):
   for xx,p in enumerate(row):
    if p=='1':d.point((x+xx,y+yy),fill=c)
  x+=len(g[0])+1
 return x

def frame(im,box):
 d=ImageDraw.Draw(im);x,y,r,b=box
 d.rectangle((x+3,y,r-3,b),fill=2);d.rectangle((x,y+3,r,b-3),fill=2)
 d.rectangle((x+3,y+2,r-3,b-2),fill=10);d.rectangle((x+2,y+3,r-2,b-3),fill=10)
 d.rectangle((x+4,y+4,r-4,b-4),fill=3)

def native_bg():
 im=Image.new('P',(240,160),13);im.putpalette(PALETTE);return im
awards=[]
for i,im in enumerate(icons):
 slug,name,landmark,zh=NAMES[i];stem=f'{i:02d}-{slug}'
 im.save(ROOT/f'{stem}-16.png',bits=4,transparency=0);save_svg(im,ROOT/f'{stem}-16.svg')
 big=im.resize((32,32),Image.Resampling.NEAREST)
 # One-pixel enamel glints refine the 32px award variant without changing silhouette.
 bd=ImageDraw.Draw(big)
 for y in range(2,29):
  for x in range(2,29):
   if big.getpixel((x,y))==4 and big.getpixel((x-1,y))==4 and big.getpixel((x,y-1)) not in (0,4):
    bd.point((x,y),fill=3);break
  else:continue
  break
 big.save(ROOT/f'{stem}-32.png',bits=4,transparency=0);save_svg(big,ROOT/f'{stem}-32.svg');awards.append(big)
# Indexed horizontal sheets: stable gym index is x//iconWidth.
for sz,ims in [(16,icons),(32,awards)]:
 sheet=Image.new('P',(sz*10,sz),0);sheet.putpalette(PALETTE)
 for i,im in enumerate(ims):sheet.paste(im,(i*sz,0))
 sheet.save(ROOT/f'landmark-badges-{sz}-sheet.png',bits=4,transparency=0)
# Award mockup: actual 240x160 pixel coordinates, no scaled text or vector smoothing.
award=native_bg();d=ImageDraw.Draw(award);d.rectangle((0,0,239,22),fill=11);text(award,(12,8),'LANDMARK BADGE',3)
d.rectangle((8,27,231,111),fill=2);d.rectangle((10,29,229,109),fill=11)
for x,y in [(77,53),(158,50),(84,80),(151,80)]:
 line(d,[(x-2,y),(x+2,y)],4);line(d,[(x,y-2),(x,y+2)],4)
award.paste(awards[0],(104,45),icons[0].resize((32,32)).point(lambda v:255 if v else 0,'1'))
text(award,(76,90),'DEPARTURE BADGE',3);frame(award,(5,116,234,156));text(award,(14,125),'YOU EARNED THE');text(award,(14,139),'DEPARTURE BADGE!');d.polygon([(219,144),(225,144),(222,147)],fill=6)
award.save(ROOT/'award-mockup-240x160.png',bits=4)
# Collection: ten stable slots, explicit earned/uneared treatment. Review sample only.
for full in [False,True]:
 col=native_bg();d=ImageDraw.Draw(col);d.rectangle((0,0,239,23),fill=11);text(col,(10,8),'CITY PASS',3);text(col,(168,8),'10 / 10' if full else '4 / 10',3)
 for i,icon in enumerate(icons):
  x=12+(i%5)*45;y=29+(i//5)*39
  d.rectangle((x,y,x+35,y+32),fill=5 if i==0 else 2);d.rectangle((x+1,y+1,x+34,y+31),fill=4 if i==0 else 13)
  if full or i in [0,2,4,6]:col.paste(icon,(x+10,y+4),icon.point(lambda v:255 if v else 0,'1'))
  else:
   # Native-size embossed silhouette; no hue-only distinction.
   ghost=icon.point(lambda v:2 if v else 0);col.paste(ghost,(x+10,y+4),icon.point(lambda v:255 if v else 0,'1'))
   line(d,[(x+14,y+11),(x+21,y+11)],13)
  text(col,(x+15,y+24),str(i+1),1)
 frame(col,(5,111,234,155));text(col,(13,119),'DEPARTURE BADGE');text(col,(13,131),'OLD STATION');text(col,(13,143),'A: DETAILS    B: BACK',2)
 col.save(ROOT/('city-pass-all-earned-240x160.png' if full else 'city-pass-partial-240x160.png'),bits=4)
# Labelled design board: native 16/32px samples and integer enlarged award art.
fontpath='/System/Library/Fonts/Menlo.ttc'
fonts={n:ImageFont.truetype(fontpath,n) for n in [12,14,16,20,28]}
board=Image.new('RGB',(1440,848),'#e8e0c8');b=ImageDraw.Draw(board)
b.text((32,24),'TAICHUNG / LANDMARK BADGES',font=fonts[28],fill=COLORS[1]);b.text((32,69),'REVIEW V2  ·  10 DISTINCT SILHOUETTES  ·  ONE SHARED 4BPP PALETTE',font=fonts[14],fill=COLORS[2])
for i,im in enumerate(icons):
 x=32+(i%5)*280;y=108+(i//5)*268
 b.rectangle((x,y,x+263,y+249),fill='#f8f0d0',outline='#b0b0a0',width=1)
 b.text((x+14,y+12),f'{i+1:02d} / {NAMES[i][1].upper()}',font=fonts[16],fill=COLORS[1]);b.text((x+14,y+36),NAMES[i][2],font=fonts[12],fill=COLORS[2])
 board.paste(rgba(awards[i]).resize((128,128),Image.Resampling.NEAREST),(x+68,y+64),rgba(awards[i]).resize((128,128),Image.Resampling.NEAREST))
 board.paste(rgba(im),(x+17,y+211),rgba(im));board.paste(rgba(awards[i]),(x+73,y+203),rgba(awards[i]));b.text((x+119,y+213),'16px / 32px',font=fonts[12],fill=COLORS[2])
b.text((32,663),'NATIVE MOCKUPS / 240 x 160',font=fonts[20],fill=COLORS[1]);b.text((32,697),'Award: 32px emblem. City Pass: 16px slots. Earned state is illustrative.',font=fonts[14],fill=COLORS[2]);b.text((32,724),'Names and artwork are proposals. IDs 0-9 are fixed. No progress or save writes.',font=fonts[14],fill=COLORS[2])
for i,h in enumerate(COLORS[1:]):b.rectangle((32+i*34,767,59+i*34,794),fill=h)
b.text((567,773),'15 opaque colors + index 0 transparent / RGB555-aligned',font=fonts[12],fill=COLORS[2]);board.save(ROOT/'badge-board.png')
# Presentation of two untouched pixel mockups at 3x integer scale.
preview=Image.new('RGB',(1512,628),'#e8e0c8');p=ImageDraw.Draw(preview);p.text((24,20),'AWARD / NATIVE PIXEL MOCKUP',font=fonts[20],fill=COLORS[1]);p.text((780,20),'CITY PASS / SAMPLE COLLECTION',font=fonts[20],fill=COLORS[1]);preview.paste(award.convert('RGB').resize((720,480),Image.Resampling.NEAREST),(24,62));partial=Image.open(ROOT/'city-pass-partial-240x160.png');preview.paste(partial.convert('RGB').resize((720,480),Image.Resampling.NEAREST),(780,62));p.text((24,566),'240 x 160 native canvas / shown at 3x / review illustration, not game capture',font=fonts[14],fill=COLORS[2]);preview.save(ROOT/'award-and-city-pass-board.png')
records=[]
for i,(slug,name,landmark,zh) in enumerate(NAMES):
 records.append({'gymIndex':i,'displayNumber':i+1,'completionBit':i,'landmarkId':slug,'badgeId':'badge.'+slug,'proposedName':{'en':name+' Badge','zh-TW':zh},'collectionPng':f'{i:02d}-{slug}-16.png','awardPng':f'{i:02d}-{slug}-32.png','status':'artwork-for-user-review'})
(ROOT/'badge-assets.json').write_text(json.dumps({'status':'review-v2-after-user-clarity-feedback','displayNumbering':'1-10; gymIndex and completionBit remain 0-9','base':'9c32da1','palette':{'transparentIndex':0,'opaqueColors':COLORS[1:],'maxBpp':4,'rgb555Aligned':True},'badges':records,'previewProgress':'illustrative only; does not read or write game memory or saves'},ensure_ascii=False,indent=2)+'\n')
# Complete, deterministic native-friendly palette and tile payloads for later integration.
(ROOT/'landmark-badges.pal').write_text('JASC-PAL\n0100\n16\n'+'\n'.join(' '.join(map(str,bytes.fromhex(h[1:])) ) for h in COLORS)+'\n')
for sz,ims in [(16,icons),(32,awards)]:
 payload=bytearray()
 for im in ims:
  for ty in range(0,sz,8):
   for tx in range(0,sz,8):
    for y in range(8):
     for x in range(0,8,2):payload.append(im.getpixel((tx+x,ty+y)) | im.getpixel((tx+x+1,ty+y))<<4)
 (ROOT/f'landmark-badges-{sz}.4bpp').write_bytes(payload)
(ROOT/'palette-rgb555.bin').write_bytes(b''.join((((int(h[1:3],16)>>3)|((int(h[3:5],16)>>3)<<5)|((int(h[5:7],16)>>3)<<10))).to_bytes(2,'little') for h in COLORS))
print('Generated 10 indexed 16px + 10 indexed 32px badges, SVGs, sheets, native tile payloads and review boards.')

# Before/after review: exactly the five City Pass numbers named by the user.
changed=[2,3,4,7,8]
comparison=Image.new('RGB',(1440,664),'#e8e0c8');c=ImageDraw.Draw(comparison)
c.text((32,24),'CLEARER SHAPES / SAME PALETTE',font=fonts[28],fill=COLORS[1])
c.text((32,69),'CITY PASS NUMBERS 1-10  ·  ONLY 3, 4, 5, 8 AND 9 REVISED',font=fonts[14],fill=COLORS[2])
labels={2:'Ice-cream cone',3:'Ringed planet',4:'Brush + leaf',7:'Food skewer',8:'Water drop'}
for col,i in enumerate(changed):
 x=32+col*280
 c.rectangle((x,108,x+263,610),fill=COLORS[3],outline='#b0b0a0')
 c.text((x+14,122),f'{i+1:02d} / {NAMES[i][2]}',font=fonts[14],fill=COLORS[1])
 c.text((x+14,157),'BEFORE',font=fonts[12],fill=COLORS[2])
 old=Image.open(ROOT.parent/'review-v1'/f'{i:02d}-{NAMES[i][0]}-32.png').convert('RGBA')
 comparison.paste(old.resize((128,128),Image.Resampling.NEAREST),(x+68,181),old.resize((128,128),Image.Resampling.NEAREST))
 c.text((x+14,333),'REVISED',font=fonts[12],fill=COLORS[2])
 new=awards[i].convert('RGBA').resize((128,128),Image.Resampling.NEAREST)
 comparison.paste(new,(x+68,357),new)
 c.text((x+14,507),labels[i],font=fonts[16],fill=COLORS[1])
 comparison.paste(rgba(icons[i]),(x+17,550),rgba(icons[i]))
 comparison.paste(rgba(awards[i]),(x+73,542),rgba(awards[i]))
 c.text((x+119,552),'16px / 32px',font=fonts[12],fill=COLORS[2])
c.text((32,633),'Other five badges unchanged. Artwork proposals; no game progress or save changes.',font=fonts[14],fill=COLORS[2])
comparison.save(ROOT/'clarity-before-after.png')
