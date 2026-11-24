#!/usr/bin/env python3
"""Package the approved Crisp2x prototype byte-exact; no redraw/resampling.

  python3 scripts/hd-player.py [--check]
Native templates use the installed field palette after RGB555 quantization.
East poses are exactly the game's horizontal flips of the three west poses.
"""
from pathlib import Path
import base64,hashlib,json,sys
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'web/src/assets/player-crisp-2x/source'
OUT=ROOT/'web/public/hd/player'
SPECS={'walking':(16,9,{2,7,8}), 'running':(16,11,{6,7,8}), 'cycling':(32,9,{2,7,8})}

def digest(data):return hashlib.sha256(data).hexdigest()
def template(image):
 values=[]
 for r,g,b,a in image.get_flattened_data():values.extend((0xffff if not a else (r>>3)<<10|(g>>3)<<5|b>>3).to_bytes(2,'little'))
 return base64.b64encode(bytes(values)).decode()
def package():
 entries=[];pictures=[];inputs={};allowed=set()
 for mode,(w,count,west) in SPECS.items():
  paths={v:SOURCE/f'{mode}-{v}.png' for v in ['native','crisp-2x']}
  for p in paths.values():inputs[p.name]=digest(p.read_bytes())
  native=Image.open(paths['native']).convert('RGBA');crisp=Image.open(paths['crisp-2x']).convert('RGBA')
  assert native.size==(w*count,32) and crisp.size==(w*count*2,64)
  palette={p[:3] for p in native.get_flattened_data() if p[3]};allowed.update(palette)
  assert {p[:3] for p in crisp.get_flattened_data() if p[3]} <= palette
  for frame in range(count):
   small=native.crop((frame*w,0,(frame+1)*w,32));big=crisp.crop((frame*w*2,0,(frame+1)*w*2,64))
   for east in ([False,True] if frame in west else [False]):
    n=small.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if east else small
    p=big.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if east else big
    entries.append(dict(kind=mode,frame=frame,east=east,w=w,h=32,pixels=template(n),atlasX=0,atlasY=0))
    pictures.append(p)
 # Pack each exact32/64px2x cell, without empty64px walking slots.
 x=y=0
 for entry,pic in zip(entries,pictures):
  if x+pic.width>800:x=0;y+=64
  entry['atlasX'],entry['atlasY']=x,y;x+=pic.width
 atlas=Image.new('RGBA',(800,y+64))
 for entry,pic in zip(entries,pictures):atlas.alpha_composite(pic,(entry['atlasX'],entry['atlasY']))
 pack=dict(version=1,scale=2,style='approved-crisp-2x',atlas='atlas.png',sprites=entries)
 import io
 f=io.BytesIO();atlas.save(f,format='PNG',optimize=True);png=f.getvalue();payload=(json.dumps(pack,separators=(',',':'))+'\n').encode()
 provenance=dict(style='Option B: Crisp2x (Scale2x)',source='Story player-sharpness-preview-20261124/sheets; approved unchanged prototypes',nativeSourceInputsSha256=inputs,counts={k:v[1] for k,v in SPECS.items()},east='Only native west poses are mirrored',templateCount=len(entries),atlasScale=2,atlasSize=list(atlas.size),opaquePaletteColors=len(allowed),atlasSha256=digest(png),packSha256=digest(payload),nativeControl='Framebuffer pose/time/position; no animation timer, ROM or save changes')
 return {'atlas.png':png,'player.json':payload,'provenance.json':(json.dumps(provenance,indent=2)+'\n').encode()}

if __name__=='__main__':
 data=package()
 if '--check' in sys.argv:
  for name,payload in data.items():assert (OUT/name).read_bytes()==payload,name
  print('Approved2x player atlas, templates and provenance reproduce byte-exact')
 else:
  OUT.mkdir(parents=True,exist_ok=True)
  for name,payload in data.items():(OUT/name).write_bytes(payload)
  print(json.loads(data['provenance.json']))
