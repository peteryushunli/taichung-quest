"""Original integer-pixel architecture; no tracing, scaling or native writes."""
from pathlib import Path
import hashlib
import json
import struct
from PIL import Image, ImageDraw

PALETTE = [(0,0,0),(24,40,48),(48,64,72),(104,128,128),
           (176,192,184),(232,224,192),(96,40,40),(168,56,48),
           (224,104,64),(128,80,56),(184,128,80),(240,192,104),
           (32,72,72),(48,120,104),(112,176,144),(40,64,104)]

class Canvas:
    def __init__(self,w,h):
        self.im=Image.new('P',(w,h),0)
        self.im.putpalette([c for rgb in PALETTE for c in rgb]+[0]*720)
        self.d=ImageDraw.Draw(self.im)
    def rect(self,box,c):self.d.rectangle(box,fill=c)
    def line(self,points,c,width=1):self.d.line(points,fill=c,width=width)
    def poly(self,points,c):self.d.polygon(points,fill=c)
    def dot(self,x,y,c):
        if 0<=x<self.im.width and 0<=y<self.im.height:self.im.putpixel((x,y),c)

def curved_roof(c,box,ridge,eave,tip=True,gold=False):
    """Stepped concave silhouette and regular vertical clay-tile ribs."""
    x0,y0,x1,y1=box;mid=(x0+x1)//2
    top=[(x0,y0),(x0+5,y0+5),(x0+14,y0+8),(mid,y0+10),
         (x1-14,y0+8),(x1-5,y0+5),(x1,y0)]
    bottom=[(x1+4,y1-8),(x1-4,y1-3),(mid,y1),(x0+4,y1-3),(x0-4,y1-8)]
    c.poly(top+bottom,9)
    # Repeat a compact roof vocabulary; tile ends are intentional, not noise.
    for x in range(x0+3,x1,4):
        edge=min(x-x0,x1-x)
        start=y0+min(10,max(0,edge//2))+2
        end=y1-min(5,abs(x-mid)//12)-2
        c.line([(x,start),(x,end)],10)
        c.line([(x+1,start+2),(x+1,end)],8 if not gold else 11)
    c.line(top,1,2);c.line([(x,y-1) for x,y in top],11 if gold else 10)
    c.line(bottom,1,2);c.line([(x,y-2) for x,y in bottom],10)
    c.line([(x0+1,y1-5),(mid,y1-1),(x1-1,y1-5)],5)
    if tip:
        for x,s in [(x0,-1),(x1,1)]:
            c.line([(x,y0),(x+s*3,y0-5),(x+s*4,y0-10)],1)
            c.line([(x-s,y0-1),(x+s*2,y0-5),(x+s*3,y0-9)],10)

def stone_column(c,x,y0,y1):
    c.rect((x,y0,x+4,y1),3);c.line([(x,y0),(x,y1)],5)
    c.line([(x+4,y0),(x+4,y1)],2)
    c.rect((x-1,y0,x+5,y0+3),4);c.rect((x-1,y1-2,x+5,y1+1),4)
    c.line([(x-1,y1+1),(x+5,y1+1)],2)

def lantern(c,x,y):
    c.rect((x-2,y,x+2,y+6),7);c.line([(x-1,y+1),(x-1,y+5)],8)
    c.line([(x-2,y),(x+2,y)],11);c.line([(x-2,y+6),(x+2,y+6)],11)
    c.dot(x,y+7,11);c.dot(x,y+8,8)

def canonical(tile):
    return min(tuple(tile[(7-y if f&2 else y)*8+(7-x if f&1 else x)] for y in range(8) for x in range(8)) for f in range(4))

def emit(c,folder,identity,references,features,portal=None,anchors=()):
    folder=Path(folder);folder.mkdir(parents=True,exist_ok=True)
    image=c.im;image.info['transparency']=0
    image.save(folder/'facade-indexed.png',transparency=0)
    overlay=image.copy()
    if portal:
        ImageDraw.Draw(overlay).rectangle((portal[0]*16,portal[1]*16,portal[0]*16+15,portal[1]*16+15),fill=0)
    for x,y in anchors:
        ImageDraw.Draw(overlay).rectangle((x*16,y*16,x*16+15,y*16+15),fill=0)
    overlay.save(folder/'native-overlay-indexed.png',transparency=0)
    # Preview on a quiet, solid review ground; original pixels stay indexed.
    ground=Image.new('RGBA',image.size,(208,216,192,255));ground.alpha_composite(image.convert('RGBA'))
    ground.convert('RGB').resize((image.width*4,image.height*4),Image.Resampling.NEAREST).save(folder/'preview-4x.png')
    rawtiles=[]
    for ty in range(image.height//8):
        for tx in range(image.width//8):rawtiles.append(tuple(image.getpixel((tx*8+x,ty*8+y)) for y in range(8) for x in range(8)))
    patterns=sorted({canonical(t) for t in rawtiles if any(t)})
    binary=bytearray()
    for tile in patterns:
        for y in range(8):
            for x in range(0,8,2):binary.append(tile[y*8+x]|tile[y*8+x+1]<<4)
    (folder/'unique-patterns.4bpp').write_bytes(binary)
    (folder/'palette.gbapal').write_bytes(struct.pack('<16H',*(r//8|(g//8)<<5|(b//8)<<10 for r,g,b in PALETTE)))
    (folder/'palette.pal').write_text('JASC-PAL\n0100\n16\n'+''.join(f'{r} {g} {b}\n' for r,g,b in PALETTE))
    grid=[]
    for y in range(image.height//16):
        row=[]
        for x in range(image.width//16):
            patch=image.crop((x*16,y*16,x*16+16,y*16+16));n=sum(v!=0 for v in patch.getdata())
            row.append(dict(x=x,y=y,opaquePixels=n,painted=bool(n),nativeDoorOverride=portal==[x,y]))
        grid.append(row)
    report=dict(id=identity,status='original code-pixel facade study; not installed',nativePixels=list(image.size),nativeCells=[image.width//16,image.height//16],paletteColorsIncludingTransparent=16,paletteRgb=PALETTE,transparentIndex=0,raw8x8Tiles=len(rawtiles),unique8x8PatternsWithoutFlips=len({t for t in rawtiles if any(t)}),unique8x8PatternsWithFlips=len(patterns),opaque16x16Cells=sum(cell['painted'] for row in grid for cell in row),cells=grid,portalCell=portal,nativeAnchorOverrides=list(anchors),clearPortalOverlayAvailable=bool(portal),features=features,references=references,source='generate.py + ../pixel.py',noReferencePixelsCopied=True,noExistingHouseTilesUsed=True,noNativeSourceOrMapEdits=True,bankAllocationVerified=False,collisionMaskChanged=False,limits=['Original15-color palette needs explicit role assignment/repacking in the target bank.','Unique pattern count is art cost, not proof of available bank capacity.','Retain audited doors, approaches, event anchors and public routes; existing empty cells inside scene are reference, not blanket hard reservations.'])
    report['filesSha256']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.iterdir() if p.is_file() and p.suffix in ('.png','.4bpp','.pal','.gbapal')}
    (folder/'occupancy-and-budget.json').write_text(json.dumps(report,indent=2)+'\n')
    return report
