#!/usr/bin/env python3
"""Review revisions 14 / 17 / 18. Original source-drawn native pixel art.

The new market and brewery deliberately do not preserve the old footprint/clear
mask. They require placement and collision work by Claude before installation.
Only art assets are written; there are no native/website/map mutations.
"""
from pathlib import Path
import importlib.util
import json
import sys
from PIL import Image, ImageDraw, ImageFont

sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parent
BASE=ROOT.parent
spec=importlib.util.spec_from_file_location('landmark_pixel_export',BASE/'parks-street/generate.py')
art=importlib.util.module_from_spec(spec);spec.loader.exec_module(art)
art.ROOT=ROOT
Scene=art.Scene
CIVIC=[tuple(bytes.fromhex(h)) for h in [
    '000000','283840','384858','586878','8090a0','a89878','e0d8b8','f8f0d8',
    '784840','b86848','d89060','284850','609098','d8b858','507850','80a868']]
TEMPLE=[(0,0,0),(24,40,48),(48,64,72),(104,128,128),(176,192,184),
        (232,224,192),(96,40,40),(168,56,48),(224,104,64),(128,80,56),
        (184,128,80),(240,192,104),(32,72,72),(48,120,104),(112,176,144),(40,64,104)]


def hip(s,x0,y0,x1,y1):
    """Preserve the first draft's approved main hall, pixel for pixel."""
    mid=(x0+x1)//2
    s.poly([(x0+14,y0),(x1-14,y0),(x1-2,y1-6),(x1+3,y1-9),
            (x1+1,y1-3),(mid,y1),(x0-1,y1-3),(x0-3,y1-9),(x0+2,y1-6)],9)
    for y in range(y0+1,y1):
        for x in range(x0-2,x1+3):
            if s.im.getpixel((x,y))==9:
                s.im.putpixel((x,y),11 if x%4==0 else 10 if x%4 in (1,2) else 9)
    s.line([(x0+14,y0),(x1-14,y0)],11,2)
    s.line([(x0-2,y1-3),(mid,y1),(x1+2,y1-3)],1)
    s.line([(x0,y1-4),(mid,y1-1),(x1,y1-4)],11)


def temple():
    s=Scene(160,144,TEMPLE)
    # Main hall remains as approved. Remove the precinct walls and all secondary
    # gate / pool / bridge / foreground railing components.
    s.rect((15,43,144,59),1)
    for x in (18,37,56,75,94,113,132):
        s.rect((x,45,x+3,60),6);s.line([(x,45),(x,59)],8)
        s.rect((x-1,58,x+4,60),4)
    for x0 in (25,44,101,120):
        for y in (49,53,57):s.line([(x0,y),(x0+5,y)],9)
    s.rect((12,60,147,63),4);s.line([(12,60),(147,60)],5)
    hip(s,34,8,125,28)
    s.line([(49,7),(110,7)],11)
    for x,direction in ((49,-1),(110,1)):
        s.line([(x,7),(x+direction*2,3),(x+direction*4,3),(x+direction*4,5)],9,2)
    s.rect((29,28,130,34),12)
    for x in range(31,130,7):
        s.rect((x,29,x+3,32),13);s.im.putpixel((x+1,29),14);s.im.putpixel((x,33),9)
    hip(s,9,34,150,46)
    s.line([(13,47),(146,47)],12,2)
    # A single low terrace and quiet forecourt. No ornamental objects below it.
    for x0,y,x1 in [(12,64,147),(10,67,149),(8,70,151)]:
        s.rect((x0,y,x1,y+2),4)
        s.line([(x0,y),(x1,y)],5)
        s.line([(x0,y+2),(x1,y+2)],3)
    s.poly([(18,74),(141,74),(145,105),(14,105)],4)
    s.line([(18,74),(141,74)],5)
    s.line([(16,88),(143,88)],3)
    s.line([(14,105),(145,105)],3)
    # Sparse, large paving joints stay subordinate to the hall silhouette.
    s.line([(58,75),(57,87)],3);s.line([(102,89),(103,104)],3)
    return s,[(5,43),(34,34),(34,8),(49,3),(110,3),(125,8),
              (125,34),(154,43),(147,64),(12,64)]


def brick(s,box):
    """Large warm wall planes, restrained courses and staggered short joints."""
    x0,y0,x1,y1=box
    s.rect(box,9)
    for y in range(y0+5,y1,6):
        s.line([(x0,y),(x1,y)],8)
        for x in range(x0+4+((y-y0)//6%2)*6,x1,12):
            s.line([(x,y-4),(x,y-1)],10)
    s.line([(x0,y0),(x1,y0)],10)


def factory_window(s,x,y,w=18,h=26,arched=False):
    if arched:
        s.ellipse((x,y,x+w-1,y+11),6)
        s.rect((x,y+6,x+w-1,y+h),6)
        s.ellipse((x+2,y+2,x+w-3,y+11),11)
        s.rect((x+2,y+7,x+w-3,y+h-2),11)
    else:
        s.rect((x,y,x+w-1,y+h),14,1)
        s.rect((x+2,y+2,x+w-3,y+h-2),11)
    s.line([(x+3,y+3),(x+w-4,y+3)],12)
    s.line([(x+w//2,y+2),(x+w//2,y+h-2)],14)
    for yy in range(y+9,y+h-2,7):s.line([(x+2,yy),(x+w-3,yy)],14)
    s.rect((x-1,y+h+1,x+w,y+h+2),5)
    s.line([(x,y+h+1),(x+w-1,y+h+1)],6)


def plant(s,x,y,r=7):
    s.ellipse((x-r,y-r,x+r,y+r),1)
    s.ellipse((x-r+1,y-r,x+r-1,y+r-1),14)
    s.ellipse((x-r+2,y-r+1,x+1,y+1),15)
    s.poly([(x-r+2,y+4),(x+r-2,y+4),(x+r-3,y+11),(x-r+3,y+11)],8,1)
    s.line([(x-r+2,y+5),(x+r-2,y+5)],10)


def tiny_text(s,x,y,text,size=10,color=8):
    font=ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc',size)
    for n,ch in enumerate(text):
        mask=Image.new('L',(size+2,size+2),0)
        ImageDraw.Draw(mask).text((0,-1),ch,font=font,fill=255)
        mask=mask.point(lambda p:255 if p>=112 else 0)
        s.im.paste(color,(x+n*size,y),mask)


def market():
    s=Scene(128,128,CIVIC)
    # Grounded, compact frontage: the old long roof and diagonal arms are gone.
    s.poly([(12,107),(115,107),(123,122),(5,122)],5)
    s.line([(10,113),(118,113)],6)
    s.line([(7,121),(121,121)],4)
    # Raised brick hall with a short side facet, not a triangular radial diagram.
    s.poly([(82,24),(100,30),(100,76),(83,72)],8,1)
    s.line([(87,27),(98,31)],6)
    for yy in (37,49):
        s.poly([(89,yy),(95,yy+2),(95,yy+9),(89,yy+7)],11,5)
    s.rect((37,29,87,78),1)
    brick(s,(39,31,85,77))
    s.rect((39,30,42,76),6);s.rect((83,30,86,76),5)
    # Weathered, shaped plaster parapet follows the reference's raised central core.
    crest=[(38,43),(38,32),(43,32),(43,28),(49,28),(49,24),(55,24),
           (55,21),(71,21),(71,24),(77,24),(77,28),(83,28),(83,32),(88,32),(88,43)]
    s.poly(crest,1)
    inner=[(40,42),(40,34),(45,34),(45,30),(51,30),(51,26),(57,26),
           (57,23),(69,23),(69,26),(75,26),(75,30),(81,30),(81,34),(86,34),(86,42)]
    s.poly(inner,6)
    s.line([(41,33),(45,33),(45,29),(51,29),(51,25),(57,25),(57,22),(69,22)],7)
    # One large arched upper opening, warm timber doors and a simple stone sill.
    s.ellipse((49,36,77,51),5)
    s.rect((49,43,77,63),5)
    s.ellipse((51,38,75,51),11)
    s.rect((51,45,75,61),11)
    s.rect((55,45,71,61),8)
    s.line([(56,46),(56,60)],10);s.line([(63,43),(63,61)],6)
    s.line([(52,48),(74,48)],6)
    s.rect((47,63,79,66),6)
    # Low wings form one familiar market building with three readable entrances.
    for x0,x1 in [(7,36),(89,120)]:
        brick(s,(x0,68,x1,107))
        s.rect((x0-1,65,x1+1,69),1)
        s.rect((x0-1,64,x1+1,66),6)
        s.line([(x0,64),(x1,64)],7)
    # Full-width pale entry lintel, brick piers, and a modest jade glass awning.
    s.rect((30,67,96,108),8,1)
    brick(s,(32,68,94,107))
    s.rect((35,65,92,80),6)
    s.line([(35,65),(92,65)],7)
    tiny_text(s,38,65,'第二市場',13,8)
    s.rect((38,83,89,108),1)
    s.rect((40,85,87,106),11)
    s.line([(42,89),(42,104)],12)
    s.line([(84,89),(84,104)],2)
    s.poly([(35,81),(92,81),(96,88),(31,88)],12,1)
    s.line([(35,82),(92,82)],6)
    for x in (47,63,79):s.line([(x,82),(x+1,87)],5)
    s.rect((31,89,36,107),6)
    s.rect((91,89,96,107),5)
    for x0 in (12,101):
        s.rect((x0,82,x0+13,105),5)
        s.rect((x0+2,84,x0+11,103),11)
        s.rect((x0+2,97,x0+11,104),9)
        s.line([(x0+2,97),(x0+11,97)],6)
        for xx in (x0+4,x0+8):s.rect((xx,94,xx+2,96),13)
    s.line([(7,108),(120,108)],1)
    s.line([(39,109),(88,109)],6)
    plant(s,10,104,5);plant(s,117,104,5)
    return s,[(7,64),(36,64),(36,29),(87,21),(100,30),(100,64),
              (120,64),(120,108),(7,108)]


def brewery():
    s=Scene(224,192,CIVIC)
    # A single compact industrial composition replaces the disconnected vertical
    # stack of tiny houses and floating barrels. The courtyard has deliberate space.
    s.poly([(12,147),(212,147),(218,181),(6,181)],5)
    s.line([(13,153),(213,153)],6)
    s.line([(10,169),(215,169)],6)
    for x in (51,109,167):s.line([(x,154),(x-1,168)],4)
    s.line([(7,181),(218,181)],4)
    # Rear brick brewhouse: a clear pitched gable, high vent, three arched windows.
    s.rect((135,60,213,123),1)
    brick(s,(137,61,211,121))
    s.poly([(132,62),(174,29),(216,62)],1)
    s.poly([(136,61),(174,32),(212,61)],9)
    s.line([(135,60),(174,30),(214,60)],5,2)
    s.line([(138,60),(174,33)],6)
    s.ellipse((164,42,184,57),5)
    s.rect((164,49,184,59),5)
    s.ellipse((166,44,182,57),11)
    s.rect((166,51,182,58),11)
    for x in (170,174,178):s.line([(x,47),(x,57)],4)
    for x in (144,168,192):factory_window(s,x,66,16,26,True)
    for x in (137,207):s.rect((x,63,x+3,120),5)
    # Cylindrical silver chimney between the buildings, with a slim access ladder.
    s.rect((106,12,120,99),1)
    s.rect((107,14,119,96),3)
    s.rect((108,14,111,95),6)
    s.line([(108,14),(108,95)],7)
    s.rect((113,15,116,95),4)
    s.line([(119,14),(119,95)],2)
    s.ellipse((106,9,120,15),5,1)
    s.line([(108,10),(117,10)],7)
    for y in range(28,92,14):
        s.rect((106,y,120,y+2),2)
        s.line([(107,y),(119,y)],4)
    for x in (99,102):s.line([(x,31),(x,94)],2)
    for y in range(34,94,6):s.line([(99,y),(102,y)],4)
    s.rect((104,94,123,101),5,1)
    # Main plaster factory hall, larger and calmer than the old scattered blocks.
    s.rect((10,63,88,143),1)
    s.rect((12,64,86,141),6)
    s.poly([(6,65),(48,31),(91,65)],1)
    s.poly([(11,63),(48,34),(86,63)],6)
    s.line([(8,64),(48,32),(89,64)],3,2)
    s.line([(10,63),(48,33)],7)
    s.line([(49,35),(85,63)],5)
    s.ellipse((41,44,55,59),5)
    s.ellipse((43,46,53,57),11)
    s.line([(48,46),(48,57)],6)
    s.line([(44,52),(52,52)],14)
    for x in (18,41,64):factory_window(s,x,70,17,29)
    brick(s,(12,129,86,141))
    for x in (13,82):s.rect((x,66,x+3,128),5)
    # Broad old loading entrance is recessed, with a shallow utilitarian canopy.
    s.rect((31,111,65,142),5)
    s.rect((34,114,62,141),8)
    s.line([(35,115),(35,140)],10)
    s.line([(48,115),(48,141)],1)
    for x in (42,55):s.rect((x,125,x+1,128),13)
    s.poly([(28,108),(66,108),(70,114),(25,114)],3,1)
    s.line([(29,109),(66,109)],4)
    s.line([(28,115),(28,120)],3)
    s.line([(67,115),(67,120)],3)
    s.line([(11,143),(88,143)],1)
    s.line([(30,144),(66,144)],6)
    # Connected low glass gallery ties the unequal volumes into one real complex.
    s.rect((78,104,216,148),1)
    brick(s,(80,130,214,146))
    s.rect((79,99,216,106),3,1)
    s.rect((80,94,215,100),6)
    s.line([(80,94),(215,94)],7)
    for x in (82,105,151,174,197):factory_window(s,x,107,16,23)
    # One glazed gallery door, aligned to the court rather than another tiny hut.
    s.rect((127,107,146,147),14,1)
    s.rect((129,109,144,145),11)
    s.line([(130,110),(143,110)],12)
    s.line([(136,109),(136,145)],14)
    s.line([(129,121),(144,121)],14)
    s.line([(129,133),(144,133)],14)
    s.line([(78,148),(216,148)],1)
    s.line([(124,149),(149,149)],6)
    # Only two planted pots and a low bench; no scattered miniatures or noisy props.
    plant(s,21,164,7);plant(s,204,164,7)
    s.rect((63,169,86,172),8,1)
    s.line([(64,169),(85,169)],10)
    s.rect((65,174,66,177),1);s.rect((83,174,84,177),1)
    return s,[(7,65),(48,31),(88,62),(98,94),(98,31),(106,31),
              (106,9),(120,9),(120,94),(132,62),(174,29),(216,62),
              (216,149),(78,149),(78,144),(10,144)]


def save(ident,number,title,scene,solid,old_size,old_rect,notes,refs):
    meta=art.export(scene,ident,None,refs)
    folder=ROOT/ident
    # Semantic mask blocks architecture, not opaque courtyard paving.
    mask=Image.new('L',scene.im.size,0); md=ImageDraw.Draw(mask)
    md.polygon(solid,fill=255)
    if ident=='second-market':
        for x in (10,117):md.ellipse((x-5,99,x+5,115),fill=255)
    if ident=='cultural-heritage-park':
        for x in (21,204):md.ellipse((x-7,157,x+7,176),fill=255)
        md.rectangle((63,169,86,177),fill=255)
    mask.save(folder/'object-mask.png')
    rows=[]
    for cy in range(scene.h//16):
        rows.append(''.join('1' if mask.crop((cx*16,cy*16,cx*16+16,cy*16+16)).getbbox() else '0' for cx in range(scene.w//16)))
    (folder/'proposed-object-cells.json').write_text(json.dumps({'note':'Conservative art object cells only; not installed. Courtyard/steps are not solid. Claude must reconcile grid collision, signs, approach and placement.','cellSize':16,'rows':rows},indent=2)+'\n')
    meta.update({'revision':2,'number':number,'title':title,'priorNativeSize':old_size,
        'priorWorldRectExclusive':old_rect,'worldRectExclusive':None,
        'geometryChanged':list(scene.im.size)!=old_size,
        'requiresPlacementUpdate':list(scene.im.size)!=old_size,
        'dimensionsMatchAuditedMap':list(scene.im.size)==old_size,
        'notes':notes,
        'integration':'ART REVIEW ONLY. This revision supersedes the v1 design. New shapes require fresh collision and tile-bank allocation. Market and brewery have intentionally new canvas dimensions and need a new map anchor/crop; no native map changes are included.'})
    (folder/'manifest.json').write_text(json.dumps(meta,indent=2)+'\n')
    # Presentation preview has a quiet ground, a tight crop and integer pixels.
    rgba=scene.im.convert('RGBA');cropped=rgba.crop(rgba.getbbox())
    enlarged=cropped.resize((cropped.width*3,cropped.height*3),Image.Resampling.NEAREST)
    preview=Image.new('RGB',(enlarged.width+32,enlarged.height+32),'#e3e9d9')
    preview.paste(enlarged,(16,16),enlarged)
    preview.save(folder/'review.png')
    return {'id':ident,'title':title,'number':number,'nativeFile':str((folder/'native.png').relative_to(BASE)),
        'nativeSize':list(scene.im.size),'requiresPlacementUpdate':meta['requiresPlacementUpdate']}


if __name__=='__main__':
    entries=[]
    s,solid=temple();entries.append(save('confucius-temple',14,'Confucius Temple',s,solid,[160,144],[110,20,120,29],
        ['Main hall retained. Removed precinct walls, secondary gate, pool, bridge and railings.','One low terrace and sparse forecourt replace the ornamental lower half.','Existing native sign cell local(4,8) remains transparent.'],
        ['https://www.confucius.taichung.gov.tw/834557/834568/834569/834571/834573/837663']))
    s,solid=market();entries.append(save('second-market',17,'Second Market',s,solid,[112,144],[98,20,105,29],
        ['Completely new compact128x128frontage; no diagonal arms or long north roof.','Brick raised core, shaped plaster parapet, three market openings and short jade awning.','Do not clip to the old footprint or old conservative-clear stencil.'],
        ['https://travel.taichung.gov.tw/en/attractions/intro/1366']))
    s,solid=brewery();entries.append(save('cultural-heritage-park',18,'Cultural Heritage Park',s,solid,[176,288],[60,121,71,139],
        ['Redesigned from scratch as one connected224x192industrial composition.','Plaster and brick gables, silver chimney and a long factory-window gallery.','Quiet shallow courtyard replaces separated warehouse rows and floating barrel props.','Do not clip or squash this into the old11x18vertical footprint.'],
        ['https://travel.taichung.gov.tw/en/Attractions/Intro/1053']))
    (ROOT/'manifest.json').write_text(json.dumps({'status':'REVIEW_REVISIONS_NOT_INSTALLED','revision':2,'landmarks':entries},indent=2)+'\n')
    print(json.dumps(entries,indent=2))
