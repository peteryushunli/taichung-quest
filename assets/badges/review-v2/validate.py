#!/usr/bin/env python3
"""Check delivered native art contracts without touching game state."""
from pathlib import Path
from PIL import Image
import json, hashlib, struct
r=Path(__file__).resolve().parent
m=json.loads((r/'badge-assets.json').read_text())
expected=['old-taichung-station','taichung-park','miyahara','natural-science-museum','calligraphy-greenway','shen-ji-new-village','fine-arts-museum','fengjia-night-market','maple-garden','taichung-theater']
assert [b['landmarkId'] for b in m['badges']]==expected
assert [b['gymIndex'] for b in m['badges']]==list(range(10))
assert [b['completionBit'] for b in m['badges']]==list(range(10))
reference=None
for size,key in [(16,'collectionPng'),(32,'awardPng')]:
 raw=(r/f'landmark-badges-{size}.4bpp').read_bytes();assert len(raw)==10*size*size//2
 sheet=Image.open(r/f'landmark-badges-{size}-sheet.png');assert sheet.size==(size*10,size)
 silhouettes=set()
 for i,b in enumerate(m['badges']):
  p=r/b[key];im=Image.open(p);assert im.mode=='P' and im.size==(size,size)
  assert p.read_bytes()[24]==4,'PNG must have4-bit index depth'
  assert im.info.get('transparency')==0
  pal=im.getpalette()[:48]
  if reference is None:reference=pal
  assert pal==reference
  assert set(im.tobytes())<=set(range(16))
  assert sheet.crop((size*i,0,size*(i+1),size)).tobytes()==im.tobytes()
  silhouettes.add(bytes(bool(v) for v in im.tobytes()))
  decoded=Image.new('P',(size,size));offset=i*size*size//2
  for ty in range(0,size,8):
   for tx in range(0,size,8):
    for y in range(8):
     for x in range(0,8,2):
      v=raw[offset];offset+=1
      decoded.putpixel((tx+x,ty+y),v&15);decoded.putpixel((tx+x+1,ty+y),v>>4)
  assert decoded.tobytes()==im.tobytes()
 assert len(silhouettes)==10,'Every badge must have a distinct silhouette'
rgb=(r/'palette-rgb555.bin').read_bytes();assert len(rgb)==32
for i,(value,) in enumerate(struct.iter_unpack('<H',rgb)):
 decoded=[(value&31)*8,((value>>5)&31)*8,((value>>10)&31)*8]
 assert decoded==reference[i*3:i*3+3]
for name in ['award-mockup-240x160.png','city-pass-partial-240x160.png','city-pass-all-earned-240x160.png']:
 assert Image.open(r/name).size==(240,160)
# User specifically kept the other five icons and all colors.
for i in [0,1,5,6,9]:
 b=m['badges'][i]
 for key in ['collectionPng','awardPng']:
  name=b[key]
  assert (r/name).read_bytes()==(r.parent/'review-v1'/name).read_bytes()
  assert (r/name.replace('.png','.svg')).read_bytes()==(r.parent/'review-v1'/name.replace('.png','.svg')).read_bytes()
for name in ['palette-rgb555.bin','landmark-badges.pal']:
 assert (r/name).read_bytes()==(r.parent/'review-v1'/name).read_bytes()
assert [b['displayNumber'] for b in m['badges']]==list(range(1,11))
files={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(r.iterdir()) if p.is_file() and p.name!='checksums.json'}
(r/'checksums.json').write_text(json.dumps(files,indent=2)+'\n')
print('PASS:10 stable IDs;20 indexed icons;unique silhouettes;shared4bpp palette;RGB555;tile roundtrips;3 native-size mockups;5 untouched icons;unchanged palette.')
