#!/usr/bin/env python3
"""Three-quarter source-pixel buildings: explicit front, side and roof planes.

All buildings recede to the upper-right in the same parallel projection. These
are new original code-authored art exports, not raster warps of flat facades.
Writes art only, with no native map/source/website changes.
"""
from pathlib import Path
import importlib.util
import json
import sys
from PIL import Image, ImageDraw

sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parent
BASE=ROOT.parent
spec=importlib.util.spec_from_file_location('landmark_revision_helpers',BASE/'revisions-v2/generate.py')
v2=importlib.util.module_from_spec(spec);spec.loader.exec_module(v2)
art=v2.art;art.ROOT=ROOT
Scene=art.Scene
PAL=v2.CIVIC


class Volume:
    """A front facade extruded by (dx,-dy); z is vertical height in native pixels."""
    def __init__(self,x,y,w,dx,dy,h):
        self.x,self.y,self.w,self.dx,self.dy,self.h=x,y,w,dx,dy,h

    def p(self,u,q,z):
        return (round(self.x+u+q*self.dx),round(self.y-q*self.dy-z))

    def side(self,s,color=8,brick=False):
        s.poly([self.p(self.w,0,self.h),self.p(self.w,1,self.h),
                self.p(self.w,1,0),self.p(self.w,0,0)],color,1)
        if brick:
            for z in range(6,self.h,7):
                s.line([self.p(self.w,0,z),self.p(self.w,1,z)],1)
            for n,z in enumerate(range(7,self.h,7)):
                for q in ((.22,.7) if n%2 else (.45,.92)):
                    s.line([self.p(self.w,q,z+1),self.p(self.w,q,min(z+5,self.h-1))],9)
        s.line([self.p(self.w,0,self.h-3),self.p(self.w,1,self.h-3)],1,2)

    def side_window(self,s,q0,q1,z0,z1,frame=5):
        # Actual projected opening on the side wall, not a flat pasted rectangle.
        s.poly([self.p(self.w,q0,z1),self.p(self.w,q1,z1),
                self.p(self.w,q1,z0),self.p(self.w,q0,z0)],frame,1)
        a,b=q0+.06,q1-.06
        s.poly([self.p(self.w,a,z1-2),self.p(self.w,b,z1-2),
                self.p(self.w,b,z0+2),self.p(self.w,a,z0+2)],11)
        s.line([self.p(self.w,a,z1-3),self.p(self.w,b,z1-3)],12)
        mid=(q0+q1)/2
        s.line([self.p(self.w,mid,z1-1),self.p(self.w,mid,z0+1)],14)
        s.line([self.p(self.w,a,(z0+z1)/2),self.p(self.w,b,(z0+z1)/2)],14)

    def mono_roof(self,s,q0=0,q1=1,back_rise=6,color=14):
        def r(u,q):return self.p(u,q,self.h+q*back_rise)
        s.poly([r(-3,q0),r(self.w+3,q0),r(self.w+3,q1),r(-3,q1)],color,1)
        # Seams follow the receding depth axis; no flat horizontal stripe pattern.
        for u in range(5,self.w,8):s.line([r(u,q0),r(u,q1)],11)
        s.line([r(-2,q1),r(self.w+2,q1)],15)
        if q0==0:
            s.poly([r(-3,0),r(self.w+3,0),self.p(self.w+3,0,self.h-3),
                    self.p(-3,0,self.h-3)],2,1)
            s.line([r(-3,0),r(self.w+3,0)],6)
            s.line([r(self.w+3,0),r(self.w+3,q1)],2,2)

    def flat_roof(self,s,color=3,parapet=True):
        # An actual horizontal top surface, with visible rear and side coping.
        a,b,c,d=[self.p(u,q,self.h) for u,q in [(-2,0),(self.w+2,0),(self.w+2,1),(-2,1)]]
        s.poly([a,b,c,d],color,1)
        s.line([d,c,b],6,2)
        s.line([self.p(0,.17,self.h),self.p(self.w,.17,self.h)],2)
        if parapet:
            s.poly([a,b,self.p(self.w+2,0,self.h-4),self.p(-2,0,self.h-4)],5,1)
            s.line([a,b],7)
            s.line([d,c],7)

    def gable_roof(self,s,rise,front_color=6):
        mid=self.w/2
        fl,fr=self.p(-3,0,self.h),self.p(self.w+3,0,self.h)
        bl,br=self.p(-3,1,self.h),self.p(self.w+3,1,self.h)
        fp,bp=self.p(mid,0,self.h+rise),self.p(mid,1,self.h+rise)
        # Two distinct roof slopes, plus the vertical gable face below them.
        s.poly([fl,bl,bp,fp],3,1)
        s.poly([fp,bp,br,fr],2,1)
        for q in (.2,.4,.6,.8):
            s.line([self.p(-2,q,self.h),self.p(mid,q,self.h+rise)],4)
            s.line([self.p(mid,q,self.h+rise),self.p(self.w+2,q,self.h)],3)
        # A sparse seam halfway down each roof plane reinforces its slope.
        for u in (self.w*.25,self.w*.75):
            height=self.h+rise*.5
            s.line([self.p(u,0,height),self.p(u,1,height)],3 if u>mid else 2)
        s.poly([self.p(0,0,self.h),self.p(mid,0,self.h+rise-2),self.p(self.w,0,self.h)],front_color,1)
        s.line([fl,fp,bp],6)
        s.line([bp,br],4)
        s.line([fp,fr,br],1,2)
        s.line([self.p(-3,0,self.h-1),self.p(self.w+3,0,self.h-1)],2,2)


def market():
    s=Scene(160,144,PAL)
    # Shared ground and a cast shadow ground the extruded building volumes.
    s.poly([(6,127),(139,127),(157,112),(159,120),(142,141),(7,141)],5)
    s.poly([(11,130),(135,130),(155,108),(159,115),(140,138),(14,138)],2)
    s.line([(9,139),(141,139)],6)
    low=Volume(10,132,124,20,24,56)
    low.side(s,8,True)
    low.side_window(s,.22,.82,15,40)
    v2.brick(s,(10,76,134,131))
    # Back roof portion is behind the raised hall. The front portion is painted
    # after it, so the hall actually emerges through the market roof.
    low.mono_roof(s,.55,1)
    core=Volume(53,118,54,18,20,83)
    core.side(s,8,True)
    core.side_window(s,.23,.82,55,70)
    core.flat_roof(s,2,False)
    # A small roof hatch and raised rear coping make the roof deck readable.
    s.poly([core.p(20,.57,84),core.p(34,.57,84),core.p(34,.86,84),core.p(20,.86,84)],4,1)
    s.line([core.p(20,.57,85),core.p(34,.57,85)],6)
    s.line([core.p(0,1,84),core.p(54,1,84)],6,2)
    v2.brick(s,(53,35,107,89))
    s.rect((54,35,57,88),6);s.rect((104,35,107,88),5)
    # The recognizable shaped front parapet is stone, not a triangular roof.
    crest=[(52,40),(52,31),(57,31),(57,27),(63,27),(63,23),(69,23),
           (69,20),(91,20),(91,23),(97,23),(97,27),(103,27),(103,31),(108,31),(108,40)]
    s.poly(crest,1)
    s.poly([(54,39),(54,33),(59,33),(59,29),(65,29),(65,25),(71,25),
            (71,22),(89,22),(89,25),(95,25),(95,29),(101,29),(101,33),(106,33),(106,39)],6)
    s.line([(54,32),(58,32),(58,28),(64,28),(64,24),(70,24),(70,21),(90,21)],7)
    s.ellipse((65,33,95,47),5)
    s.rect((65,40,95,61),5)
    s.ellipse((67,35,93,47),11)
    s.rect((67,42,93,59),11)
    s.rect((71,43,89,58),8)
    s.line([(73,44),(73,57)],10)
    s.line([(80,37),(80,58)],6)
    s.line([(68,43),(92,43)],6)
    s.rect((63,60,97,63),6)
    low.mono_roof(s,0,.55)
    # Light front cornice and deep eave shadow show the wall receding beneath it.
    s.rect((9,80,135,83),1)
    s.line([(10,80),(134,80)],5)
    s.rect((44,83,110,99),6,5)
    v2.tiny_text(s,51,83,'第二市場',13,8)
    s.rect((48,101,106,131),5)
    s.rect((51,103,103,130),11)
    s.line([(53,106),(53,127)],12)
    s.line([(101,106),(101,128)],2)
    # Short awning is a sloping plane as well, with a shaded front lip.
    s.poly([(43,101),(110,101),(115,95),(48,95)],12,1)
    s.line([(48,95),(115,95)],6)
    for x in (61,78,95):s.line([(x,100),(x+5,96)],5)
    s.rect((43,102,110,104),2,1)
    for x in (17,114):
        s.rect((x,94,x+13,127),5)
        s.rect((x+2,96,x+11,125),11)
        s.rect((x+2,115,x+11,126),9)
        s.line([(x+2,115),(x+11,115)],6)
        for xx in (x+3,x+8):s.rect((xx,111,xx+2,114),13)
    s.line([(10,132),(134,132)],1)
    s.line([(48,133),(106,133)],6)
    v2.plant(s,13,126,5);v2.plant(s,133,126,5)
    return s


def brewery():
    s=Scene(256,208,PAL)
    s.poly([(10,175),(231,175),(250,156),(255,165),(236,203),(7,203)],5)
    s.line([(10,186),(235,186)],6)
    s.line([(8,202),(236,202)],4)
    for x in (57,111,166,221):s.line([(x,187),(x-1,201)],4)
    s.poly([(15,177),(230,177),(250,156),(255,162),(237,186),(18,184)],2)
    # Rear brewhouse: a full extruded gabled volume. Roofs have both front/back
    # ridges and two visible slopes, instead of triangular front silhouettes.
    rear=Volume(146,150,76,20,28,66)
    rear.side(s,8,True)
    rear.side_window(s,.2,.8,23,48)
    v2.brick(s,(146,84,222,149))
    rear.gable_roof(s,24,9)
    s.ellipse((175,67,193,81),5)
    s.rect((175,74,193,82),5)
    s.ellipse((177,69,191,81),11)
    s.rect((177,76,191,81),11)
    for x in (180,184,188):s.line([(x,71),(x,80)],4)
    for x in (153,177,201):v2.factory_window(s,x,91,15,25,True)
    for x in (147,217):s.rect((x,87,x+3,145),5)
    # Banded metal stack with a genuinely visible oval mouth and curved rings.
    s.rect((135,18,151,124),1)
    s.rect((136,19,150,121),3)
    s.rect((137,19,140,121),6)
    s.line([(137,19),(137,120)],7)
    s.rect((142,19,146,121),4)
    s.line([(150,19),(150,120)],2)
    s.ellipse((134,13,152,21),1)
    s.ellipse((135,13,151,19),6)
    s.ellipse((138,14,148,17),2)
    s.line([(136,15),(138,14)],7)
    for y in range(35,119,16):
        s.ellipse((135,y,151,y+4),2)
        s.line([(136,y+1),(140,y+2),(148,y+2)],4)
    for x in (126,130):s.line([(x,37),(x,121)],2)
    for y in range(41,122,7):s.line([(126,y),(130,y)],4)
    s.rect((132,122,154,129),5,1)
    # Plaster hall has the same camera direction as the red brewhouse. Its right
    # side and a substantial slate roof plane stay visible beside the gallery.
    main=Volume(14,176,80,26,30,86)
    main.side(s,5)
    main.side_window(s,.2,.83,38,63,6)
    s.rect((14,90,94,175),6,1)
    main.gable_roof(s,25,6)
    s.ellipse((47,74,61,87),5)
    s.ellipse((49,76,59,85),11)
    s.line([(54,76),(54,85)],6)
    s.line([(50,81),(58,81)],14)
    for x in (22,46,70):v2.factory_window(s,x,100,17,27)
    v2.brick(s,(16,161,92,174))
    for x in (16,89):s.rect((x,93,x+3,160),5)
    # Recessed loading doors and a projecting canopy with a visible top.
    s.rect((36,144,72,175),5)
    s.rect((39,147,69,174),8)
    s.line([(41,148),(41,173)],10)
    s.line([(54,148),(54,174)],1)
    for x in (48,60):s.rect((x,159,x+1,162),13)
    s.poly([(32,143),(74,143),(81,137),(39,137)],3,1)
    s.line([(39,137),(81,137)],4)
    s.rect((32,144,74,146),2,1)
    s.line([(34,147),(34,152)],3)
    s.line([(73,147),(73,152)],3)
    s.line([(14,176),(94,176)],1)
    s.line([(36,177),(72,177)],6)
    # The low connecting gallery is a shallow box, with a large horizontal roof
    # deck, a thick parapet and a shaded side elevation. It is not a flat strip.
    gallery=Volume(98,178,132,22,18,44)
    gallery.side(s,8,True)
    gallery.side_window(s,.17,.84,13,35)
    v2.brick(s,(98,134,230,177))
    gallery.flat_roof(s,3,True)
    for u in (44,91):
        s.line([gallery.p(u,.05,44),gallery.p(u,.96,44)],2)
    s.line([gallery.p(2,.9,44),gallery.p(128,.9,44)],4)
    s.rect((98,139,230,143),2)
    s.line([(99,139),(229,139)],1)
    for x in (105,128,151,191,213):v2.factory_window(s,x,144,13,22)
    s.rect((170,144,186,177),14,1)
    s.rect((172,146,184,175),11)
    s.line([(173,147),(183,147)],12)
    s.line([(178,146),(178,175)],14)
    s.line([(172,157),(184,157)],14)
    s.line([(172,167),(184,167)],14)
    s.line([(98,178),(230,178)],1)
    s.line([(168,179),(188,179)],6)
    v2.plant(s,26,188,7);v2.plant(s,222,188,7)
    s.rect((68,192,94,195),8,1)
    s.line([(69,192),(93,192)],10)
    s.rect((70,197,71,200),1);s.rect((91,197,92,200),1)
    return s


def export(ident,title,number,scene,previous,original,notes,reference):
    meta=art.export(scene,ident,None,[reference])
    folder=ROOT/ident
    meta.update({'revision':3,'title':title,'number':number,
        'priorNativeSize':original,'previousReviewSize':previous,
        'requiresPlacementUpdate':True,'requiresCollisionUpdate':True,
        'dimensionsMatchAuditedMap':False,'worldRectExclusive':None,
        'projection':'Parallel3/4 view: depth recedes to upper-right; all volumes share that direction.',
        'notes':notes,'integration':'ART REVIEW ONLY. Replaces v2 artwork for this landmark. Requires current-branch placement, collision, crop and tile-bank allocation. No native or website sources changed.'})
    (folder/'manifest.json').write_text(json.dumps(meta,indent=2)+'\n')
    # Proposed architecture/prop mask excludes the painted courtyard and shadows.
    # It is a placement aid, never an automatic replacement for real map collision.
    mask=Image.new('L',scene.im.size,0);draw=ImageDraw.Draw(mask)
    if ident=='second-market':
        polygons=[[(7,76),(27,47),(157,47),(157,108),(134,132),(7,132)],
                  [(51,35),(69,15),(125,15),(125,98),(107,118),(51,118)],
                  [(52,40),(52,31),(69,20),(91,20),(108,31),(108,40)]]
        for x in (13,133):draw.rectangle((x-5,121,x+5,137),fill=255)
    else:
        polygons=[[(11,90),(37,60),(80,35),(123,60),(123,146),(94,176),(14,176)],
                  [(143,84),(163,56),(204,32),(245,56),(245,122),(222,150),(146,150)],
                  [(96,134),(118,116),(254,116),(254,160),(230,178),(98,178)],
                  [(134,13),(152,13),(152,126),(134,126)],
                  [(126,37),(130,37),(130,122),(126,122)]]
        for x in (26,222):draw.rectangle((x-7,181,x+7,200),fill=255)
        draw.rectangle((68,192,94,200),fill=255)
    for polygon in polygons:draw.polygon(polygon,fill=255)
    mask.save(folder/'object-mask.png')
    rows=[''.join('1' if mask.crop((cx*16,cy*16,cx*16+16,cy*16+16)).getbbox() else '0'
                  for cx in range(scene.w//16)) for cy in range(scene.h//16)]
    (folder/'proposed-object-cells.json').write_text(json.dumps({'cellSize':16,'rows':rows,
        'note':'Conservative architecture/prop outline, not installed game collision. Excludes courtyard and cast shadows. Reconcile real placement and event/sign approaches before use.'},indent=2)+'\n')
    rgba=scene.im.convert('RGBA');crop=rgba.crop(rgba.getbbox())
    large=crop.resize((crop.width*3,crop.height*3),Image.Resampling.NEAREST)
    review=Image.new('RGB',(large.width+32,large.height+32),'#e3e9d9')
    review.paste(large,(16,16),large);review.save(folder/'review.png')
    return {'id':ident,'title':title,'number':number,'revision':3,
        'nativeFile':str((folder/'native.png').relative_to(BASE)),
        'nativeSize':list(scene.im.size),'requiresPlacementUpdate':True}


if __name__=='__main__':
    entries=[export('second-market','Second Market',17,market(),[128,128],[112,144],
        ['Raised hall shows its actual roof deck and right wall.','Broad receding market roof has directional seams, thickness and a deep eave shadow.','Front and rear roof parts correctly occlude the raised hall. No diagonal ground arms.'],
        'https://travel.taichung.gov.tw/en/attractions/intro/1366'),
      export('cultural-heritage-park','Cultural Heritage Park',18,brewery(),[224,192],[176,288],
        ['Both gabled halls are extruded volumes with two roof slopes, front/back ridges and side windows.','Connected gallery shows its flat roof deck, thick parapet and shaded right elevation.','Upper-left lighting, structural overlap and common depth direction give the whole brewery one coherent3/4 perspective.','Silver stack has an oval mouth and curved bands; courtyard stays calm.'],
        'https://travel.taichung.gov.tw/en/Attractions/Intro/1053')]
    (ROOT/'manifest.json').write_text(json.dumps({'status':'REVIEW_REVISIONS_NOT_INSTALLED','revision':3,'landmarks':entries},indent=2)+'\n')
    print(json.dumps(entries,indent=2))
