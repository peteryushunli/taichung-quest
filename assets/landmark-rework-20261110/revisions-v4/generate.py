#!/usr/bin/env python3
"""Centered game-map camera. Roof depth recedes straight upward, never sideways.

Reference: ../revisions-v4/references/theater-native-4x.png, rendered read-only
from the existing native National Taichung Theater artwork. Original integer
pixel construction; no skewing or repainting existing raster assets.
"""
from pathlib import Path
import importlib.util
import json
import sys
from PIL import Image, ImageDraw, ImageFont

sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parent
BASE=ROOT.parent
spec=importlib.util.spec_from_file_location('landmark_old_geometry',BASE/'revisions-v3/generate.py')
v3=importlib.util.module_from_spec(spec);spec.loader.exec_module(v3)
v2=v3.v2;art=v3.art;art.ROOT=ROOT
Scene=art.Scene
PAL=v3.PAL


class CenteredVolume(v3.Volume):
    """Frontal wall plus centered, upward roof depth, like existing game houses."""
    def p(self,u,q,z):
        inset=min(self.w*.13,12)
        return (round(self.x+self.w/2+(u-self.w/2)*(1-2*inset/self.w*q)),
                round(self.y-q*self.dy-z))

    def side(self,*args,**kwargs):
        # The front elevation occludes vertical side walls in this game camera.
        pass

    def side_window(self,*args,**kwargs):pass


def market(native_fit=False):
    cut=20 if native_fit else 0
    half=cut//2
    s=Scene(160,144,PAL)
    s.rect((6,130,139-cut,140),5)
    s.line([(7,139),(138-cut,139)],6)
    s.rect((10,131,135-cut,135),2)
    low=CenteredVolume(10,132,124-cut,0,24,56)
    v2.brick(s,(10,76,134-cut,131))
    low.mono_roof(s,.55,1)
    s.transform=(1,-half,0) if native_fit else None
    # Upper hall now shares the main frontage's centerline x72.
    core=CenteredVolume(45,118,54,0,20,83)
    core.flat_roof(s,2,False)
    s.poly([core.p(20,.57,84),core.p(34,.57,84),core.p(34,.86,84),core.p(20,.86,84)],4,1)
    s.line([core.p(0,1,84),core.p(54,1,84)],6,2)
    v2.brick(s,(45,35,99,89))
    s.rect((46,35,49,88),6);s.rect((96,35,99,88),5)
    s.poly([(44,40),(44,31),(49,31),(49,27),(55,27),(55,23),(61,23),
            (61,20),(83,20),(83,23),(89,23),(89,27),(95,27),(95,31),(100,31),(100,40)],1)
    s.poly([(46,39),(46,33),(51,33),(51,29),(57,29),(57,25),(63,25),
            (63,22),(81,22),(81,25),(87,25),(87,29),(93,29),(93,33),(98,33),(98,39)],6)
    s.line([(46,32),(50,32),(50,28),(56,28),(56,24),(62,24),(62,21),(82,21)],7)
    s.ellipse((57,33,87,47),5);s.rect((57,40,87,61),5)
    s.ellipse((59,35,85,47),11);s.rect((59,42,85,59),11)
    s.rect((63,43,81,58),8)
    s.line([(65,44),(65,57)],10);s.line([(72,37),(72,58)],6)
    s.line([(60,43),(84,43)],6);s.rect((55,60,89,63),6)
    s.transform=None
    low.mono_roof(s,0,.55)
    s.rect((9,80,135-cut,83),1);s.line([(10,80),(134-cut,80)],5)
    s.transform=(1,-half,0) if native_fit else None
    s.rect((39,83,105,99),6,5)
    v2.tiny_text(s,46-half,83,'第二市場',13,8)
    s.rect((43,101,101,131),5);s.rect((46,103,98,130),11)
    s.line([(48,106),(48,127)],12);s.line([(96,106),(96,128)],2)
    # Awning also recedes upward symmetrically rather than shifting to one side.
    s.poly([(38,101),(106,101),(102,95),(42,95)],12,1)
    s.line([(42,95),(102,95)],6)
    for x in (55,72,89):s.line([(x,100),(72+(x-72)*.88,96)],5)
    s.rect((38,102,106,104),2,1)
    s.transform=None
    for x in (17,114-cut):
        s.rect((x,94,x+13,127),5);s.rect((x+2,96,x+11,125),11)
        s.rect((x+2,115,x+11,126),9);s.line([(x+2,115),(x+11,115)],6)
        for xx in (x+3,x+8):s.rect((xx,111,xx+2,114),13)
    s.line([(10,132),(134-cut,132)],1);s.line([(43-half,133),(101-half,133)],6)
    v2.plant(s,13,126,5);v2.plant(s,131-cut,126,5)
    if native_fit:
        # Crop only padding/paving after source-level wing shortening. No scaling.
        s.im=s.im.crop((6,0,118,144));s.d=ImageDraw.Draw(s.im);s.w=112
    return s


def brewery():
    s=Scene(256,208,PAL)
    # A level forecourt and shallow contact shadow replace the diagonal ground.
    s.rect((10,177,235,202),5)
    s.rect((14,176,231,183),2)
    s.line([(10,186),(235,186)],6);s.line([(10,202),(235,202)],4)
    for x in (57,111,166,221):s.line([(x,187),(x,201)],4)
    rear=CenteredVolume(146,150,76,0,28,66)
    v2.brick(s,(146,84,222,149))
    rear.gable_roof(s,24,9)
    s.ellipse((175,67,193,81),5);s.rect((175,74,193,82),5)
    s.ellipse((177,69,191,81),11);s.rect((177,76,191,81),11)
    for x in (180,184,188):s.line([(x,71),(x,80)],4)
    for x in (153,177,201):v2.factory_window(s,x,91,15,25,True)
    for x in (147,217):s.rect((x,87,x+3,145),5)
    # Cylindrical stack keeps its own small oval top, centered over the shaft.
    s.rect((135,18,151,124),1);s.rect((136,19,150,121),3)
    s.rect((137,19,140,121),6);s.line([(137,19),(137,120)],7)
    s.rect((142,19,146,121),4);s.line([(150,19),(150,120)],2)
    s.ellipse((134,13,152,21),1);s.ellipse((135,13,151,19),6)
    s.ellipse((138,14,148,17),2)
    for y in range(35,119,16):
        s.ellipse((135,y,151,y+4),2);s.line([(136,y+1),(140,y+2),(148,y+2)],4)
    for x in (126,130):s.line([(x,37),(x,121)],2)
    for y in range(41,122,7):s.line([(126,y),(130,y)],4)
    s.rect((132,122,154,129),5,1)
    main=CenteredVolume(14,176,80,0,30,86)
    s.rect((14,90,94,175),6,1)
    main.gable_roof(s,25,6)
    s.ellipse((47,74,61,87),5);s.ellipse((49,76,59,85),11)
    s.line([(54,76),(54,85)],6);s.line([(50,81),(58,81)],14)
    for x in (22,46,70):v2.factory_window(s,x,100,17,27)
    v2.brick(s,(16,161,92,174))
    for x in (16,89):s.rect((x,93,x+3,160),5)
    s.rect((36,144,72,175),5);s.rect((39,147,69,174),8)
    s.line([(41,148),(41,173)],10);s.line([(54,148),(54,174)],1)
    for x in (48,60):s.rect((x,159,x+1,162),13)
    s.poly([(32,143),(76,143),(72,137),(36,137)],3,1)
    s.line([(36,137),(72,137)],4);s.rect((32,144,76,146),2,1)
    s.line([(34,147),(34,152)],3);s.line([(74,147),(74,152)],3)
    s.line([(14,176),(94,176)],1);s.line([(36,177),(72,177)],6)
    gallery=CenteredVolume(98,178,132,0,18,44)
    v2.brick(s,(98,134,230,177))
    gallery.flat_roof(s,3,True)
    for u in (44,91):s.line([gallery.p(u,.05,44),gallery.p(u,.96,44)],2)
    s.line([gallery.p(2,.9,44),gallery.p(128,.9,44)],4)
    s.rect((98,139,230,143),2);s.line([(99,139),(229,139)],1)
    for x in (105,128,151,191,213):v2.factory_window(s,x,144,13,22)
    s.rect((170,144,186,177),14,1);s.rect((172,146,184,175),11)
    s.line([(173,147),(183,147)],12);s.line([(178,146),(178,175)],14)
    s.line([(172,157),(184,157)],14);s.line([(172,167),(184,167)],14)
    s.line([(98,178),(230,178)],1);s.line([(168,179),(188,179)],6)
    v2.plant(s,26,188,7);v2.plant(s,222,188,7)
    s.rect((68,192,94,195),8,1);s.line([(69,192),(93,192)],10)
    s.rect((70,197,71,200),1);s.rect((91,197,92,200),1)
    return s


def botanical():
    s=Scene(208,144,art.PALETTE)
    # Garden frame is separate from the building camera; the greenhouse itself
    # is exactly balanced about x112 from its rear roof crest down to the sill.
    s.poly([(19,107),(50,102),(181,107),(194,123),(188,141),(20,141),(11,128)],10)
    s.poly([(23,109),(40,106),(67,111),(78,124),(66,137),(30,138),(17,128)],2)
    s.poly([(26,111),(42,109),(65,114),(73,124),(63,133),(31,135),(21,127)],3)
    s.line([(29,118),(43,117),(53,119)],4)
    s.line([(35,129),(54,129),(65,125)],5)
    for x,y in [(29,124),(49,114),(57,129)]:
        s.ellipse((x,y,x+8,y+3),11,9)
    # Symmetrical, curved front glazing. The roof is a separate visible surface.
    face=[(62,45),(76,37),(94,34),(130,34),(148,37),(162,45),
          (176,108),(168,116),(56,116),(48,108)]
    s.poly(face,4,1)
    s.poly([(62,45),(76,37),(94,34),(89,79),(54,83)],5)
    s.poly([(130,34),(148,37),(162,45),(176,108),(151,113)],3)
    s.poly([(53,89),(171,89),(176,108),(168,116),(56,116),(48,108)],3)
    # A few interior leaf silhouettes, kept behind the glass and steel grid.
    for x,y in [(85,78),(112,71),(138,82)]:
        s.line([(x,110),(x,y)],9,2)
        for dx,dy in [(-9,-4),(9,-5),(-7,4),(8,3)]:
            s.line([(x,y+7),(x+dx,y+dy)],10,2)
    # Curved roof hood: rear arc and front arc share their center, rather than
    # being skewed to the right. Meridians converge upward on that centerline.
    back=[(73,27),(84,17),(98,10),(112,7),(126,10),(140,17),(151,27)]
    front=[(62,45),(76,37),(94,34),(112,32),(130,34),(148,37),(162,45)]
    s.poly(back+list(reversed(front)),4,1)
    s.poly([(73,27),(84,17),(98,10),(112,7),(112,32),(94,34),(76,37),(62,45)],5)
    for a,b in [((73,27),(62,45)),((84,17),(76,37)),((98,10),(94,34)),
                ((112,7),(112,32)),((126,10),(130,34)),((140,17),(148,37)),((151,27),(162,45))]:
        s.line([a,b],2,3);s.line([a,b],6)
    s.line([(78,25),(91,21),(112,18),(133,21),(146,25)],6)
    s.line(front,2,3);s.line(front,8)
    # Face mullions and curved ring beams expand evenly toward the base.
    for a,b in [((62,45),(48,108)),((78,37),(69,113)),((94,34),(90,116)),
                ((112,32),(112,116)),((130,34),(134,116)),((146,37),(155,113)),((162,45),(176,108))]:
        s.line([a,b],2,3);s.line([(a[0]-1,a[1]),(b[0]-1,b[1])],6)
    for yy,xa,xb in [(56,59,165),(74,55,169),(92,51,173),(108,49,175)]:
        beam=[(xa,yy),(83,yy+3),(112,yy+5),(141,yy+3),(xb,yy)]
        s.line([(x,y+1) for x,y in beam],2,2);s.line(beam,6)
    # Paired masts/trusses frame the same central roof, with no diagonal yaw.
    for side in (-1,1):
        def pt(x,y):return (112+side*x,y)
        s.line([pt(64,107),pt(48,15),pt(28,17)],1,3)
        s.line([pt(64,107),pt(48,15),pt(28,17)],8)
        s.line([pt(48,15),pt(36,37),pt(53,56),pt(42,75),pt(60,94),pt(49,111)],6)
    s.rect((48,110,176,117),14,1);s.line([(49,110),(175,110)],6)
    s.rect((98,100,126,119),6,1)
    for x in (101,114):
        s.rect((x,103,x+9,118),3,2)
        s.line([(x+1,104),(x+7,104),(x+7,113)],5)
    s.rect((98,97,126,101),1);s.line([(102,99),(110,99)],12)
    for yy in (120,123,126):
        s.rect((75,yy,149,yy+2),14);s.line([(75,yy),(149,yy)],6)
    s.rect((85,129,139,143),15)
    s.line([(85,135),(139,135)],6);s.line([(112,129),(112,143)],14)
    # Identifying butterfly and water garden remain foreground details.
    s.poly([(45,96),(31,82),(25,64),(24,60),(20,62),(22,75),(29,89),(39,98)],7,1)
    s.poly([(42,99),(29,91),(24,94),(29,104),(40,107),(45,103)],12,1)
    s.poly([(49,96),(61,83),(81,79),(75,86),(57,99)],12,1)
    s.line([(24,65),(30,78),(43,94)],1)
    s.line([(25,73),(36,80)],1);s.line([(30,85),(41,90)],1)
    s.ellipse((43,95,52,103),1);s.line([(50,96),(56,89)],1)
    s.line([(42,106),(42,120)],14,2);s.line([(62,101),(62,121)],14,2)
    for x,y,z in [(6,113,12),(177,119,13),(12,130,9),(173,134,9)]:s.shrub(x,y,z)
    return s


def classical_arch(s,x,y,w,h):
    s.ellipse((x,y,x+w-1,y+8),7)
    s.rect((x,y+4,x+w-1,y+h-1),7)
    s.ellipse((x+2,y+2,x+w-3,y+8),11)
    s.rect((x+2,y+6,x+w-3,y+h-2),11)
    s.line([(x+3,y+4),(x+3,y+h-3)],12)
    s.line([(x+w//2,y+3),(x+w//2,y+h-2)],6)
    s.line([(x+2,y+h//2),(x+w-3,y+h//2)],6)
    s.line([(x-1,y+h),(x+w,y+h)],5)


def mansard(s,x0,x1,eave,top):
    """Centered slate roof with a shallow top plane and steep front slope."""
    width=x1-x0; shoulder=max(9,round(width*.10)); ridge=max(16,round(width*.18))
    sy=round(top+(eave-top)*.40)
    s.poly([(x0,eave),(x0+5,eave-22),(x0+ridge,top),
            (x1-ridge,top),(x1-5,eave-22),(x1,eave)],1)
    s.poly([(x0+shoulder,sy),(x1-shoulder,sy),(x1-ridge,top+1),(x0+ridge,top+1)],4)
    s.poly([(x0,eave),(x1,eave),(x1-shoulder,sy),(x0+shoulder,sy)],2)
    s.poly([(x0,eave),(x0+5,eave-22),(x0+ridge,top),(x0+shoulder,sy)],3)
    s.poly([(x1,eave),(x1-5,eave-22),(x1-ridge,top),(x1-shoulder,sy)],2)
    for y in range(sy+4,eave,5):
        inset=round(shoulder*(eave-y)/(eave-sy))
        s.line([(x0+inset+1,y),(x1-inset-1,y)],3)
    for q in (.35,.7):
        yy=round(top+(sy-top)*q)
        inset=round(ridge+(shoulder-ridge)*q)
        s.line([(x0+inset,yy),(x1-inset,yy)],3)
    s.line([(x0+shoulder,sy),(x1-shoulder,sy)],1)
    s.line([(x0,eave),(x0+shoulder,sy),(x0+ridge,top)],4)
    s.line([(x1,eave),(x1-shoulder,sy),(x1-ridge,top)],1)
    s.line([(x0+ridge,top),(x1-ridge,top)],6)
    s.line([(x0,eave),(x1,eave)],1,2)
    s.rect((x0,eave+1,x1,eave+4),5)
    s.line([(x0,eave+1),(x1,eave+1)],7)


def dormer(s,x,y,w=9,h=13):
    s.poly([(x-1,y+3),(x+w//2,y),(x+w,y+3),(x+w,y+h),(x-1,y+h)],1)
    s.ellipse((x,y+1,x+w-1,y+7),6);s.rect((x,y+4,x+w-1,y+h-1),6)
    s.ellipse((x+2,y+3,x+w-3,y+7),11);s.rect((x+2,y+6,x+w-3,y+h-2),11)
    s.line([(x+3,y+5),(x+3,y+h-3)],12)
    s.line([(x-1,y+h),(x+w,y+h)],7)


def prefectural(native_fit=False):
    cut=40 if native_fit else 0
    s=Scene(160 if native_fit else 192,160,PAL)
    s.rect((7,142,185-cut,155),5);s.line([(8,150),(184-cut,150)],6)
    s.line([(96,143),(96,155)],4)
    # Long brick wing stays a level front elevation. Roof depth is expanded
    # upward, with matching hips on both ends rather than a rotated right wall.
    v2.brick(s,(56,82,181-cut,139))
    for x in range(64,175-cut,20):
        classical_arch(s,x,88,11,19)
        s.rect((x+1,119,x+9,136),7)
        s.rect((x+3,121,x+7,134),11)
        s.line([(x+4,122),(x+4,133)],12)
        s.line([(x+3,128),(x+7,128)],6)
    for x in range(59,181-cut,20):
        s.rect((x,85,x+2,139),6);s.line([(x,85),(x,139)],7)
    s.rect((56,110,181-cut,114),6);s.line([(56,110),(181-cut,110)],7)
    s.line([(56,114),(181-cut,114)],5)
    s.rect((56,138,183-cut,141),6);s.line([(56,141),(183-cut,141)],1)
    mansard(s,54,184-cut,78,29)
    for x in range(64,175-cut,20):dormer(s,x,56,9,14)
    # The pale corner entrance pavilion retains the Hall's identity; its crown
    # now shows a broad top plane and equal roof shoulders around x34.
    s.rect((9,77,59,139),6,1)
    s.rect((12,82,56,109),5)
    for x in (15,30,45):
        s.rect((x,87,x+7,105),11)
        s.line([(x+1,88),(x+1,103)],12)
        s.line([(x,96),(x+7,96)],6)
    for x in (11,26,41,56):
        s.rect((x,83,x+3,109),6);s.line([(x,83),(x,108)],7)
        s.rect((x-1,82,x+4,84),7);s.rect((x-1,108,x+4,110),7)
    s.rect((8,110,60,114),5);s.line([(8,110),(60,110)],7)
    for x in range(11,59,4):s.line([(x,111),(x,113)],7)
    s.rect((9,115,59,139),6)
    for y in (119,124,129,134):s.line([(10,y),(58,y)],5)
    for x in (13,28,44):classical_arch(s,x,117,11 if x!=28 else 13,23)
    # A small projecting porch, still level and centered on the pavilion.
    s.d.arc((23,107,46,120),180,360,fill=7,width=3)
    s.poly([(21,117),(48,117),(44,112),(25,112)],6,5)
    s.line([(22,117),(47,117)],7)
    s.ellipse((32,111,36,115),13)
    for x in (22,46):
        s.rect((x,118,x+2,139),6);s.line([(x,118),(x,138)],7)
        s.rect((x-1,138,x+3,140),7)
    s.rect((7,140,61,143),6);s.line([(7,143),(61,143)],1)
    mansard(s,4,64,75,28)
    for x in (13,30,47):dormer(s,x,53,8,14)
    s.poly([(20,80),(22,75),(29,71),(39,71),(46,76),(48,80)],6)
    s.line([(23,75),(30,72),(38,72)],7)
    s.ellipse((32,74,36,79),5);s.ellipse((33,75,35,78),7)
    s.line([(34,21),(34,27)],1);s.im.putpixel((34,20),13)
    s.line([(31,26),(37,26)],5)
    return s


def export(ident,number,title,scene,original,notes,reference):
    meta=art.export(scene,ident,None,[reference]);folder=ROOT/ident
    meta.update({'revision':4,'title':title,'number':number,'priorNativeSize':original,
        'requiresPlacementUpdate':list(scene.im.size)!=original,'requiresCollisionUpdate':True,
        'dimensionsMatchAuditedMap':list(scene.im.size)==original,'worldRectExclusive':None,
        'projection':'Centered frontal game camera: no sideways depth offset; roofs taper evenly inward and recede upward around each volume centerline.',
        'cameraReference':'references/theater-native-4x.png','notes':notes,
        'integration':'ART REVIEW ONLY. Supersedes earlier art for this landmark. Claude must allocate native tile/palette banks, set placement/collision and update frontend crop. No map/source/website changes included.'})
    (folder/'manifest.json').write_text(json.dumps(meta,indent=2)+'\n')
    # Conservative object outline for integration, distinct from visible paving.
    mask=Image.new('L',scene.im.size,0);md=ImageDraw.Draw(mask)
    if ident=='botanical-garden':
        polygons=[[(48,108),(64,15),(73,27),(112,7),(151,27),(160,15),(176,108),(168,118),(56,118)],
                  [(20,60),(25,60),(81,79),(62,101),(62,121),(40,121),(24,106)],
                  [(23,109),(40,106),(67,111),(78,124),(66,137),(30,138),(17,128)]]
    elif ident=='prefectural-hall':
        polygons=[[(4,75),(9,53),(20,28),(48,28),(59,53),(64,75),(60,143),(7,143)],
                  [(54,78),(59,56),(77,29),(161,29),(179,56),(184,78),(184,142),(56,142)]]
    elif ident=='second-market':
        polygons=[[(7,76),(24,46),(120,46),(137,76),(135,133),(9,133)],
                  [(44,35),(55,15),(89,15),(100,35),(100,98),(44,98)]]
        for x in (13,131):md.rectangle((x-5,121,x+5,137),fill=255)
    else:
        polygons=[[(11,90),(24,60),(54,35),(84,60),(97,90),(94,176),(14,176)],
                  [(143,84),(157,56),(184,32),(211,56),(225,84),(222,150),(146,150)],
                  [(96,134),(109,116),(219,116),(232,134),(230,178),(98,178)],
                  [(134,13),(152,13),(152,129),(134,129)],
                  [(126,37),(130,37),(130,122),(126,122)]]
        for x in (26,222):md.rectangle((x-7,181,x+7,200),fill=255)
        md.rectangle((68,192,94,200),fill=255)
    for polygon in polygons:md.polygon(polygon,fill=255)
    mask.save(folder/'object-mask.png')
    rows=[''.join('1' if mask.crop((cx*16,cy*16,cx*16+16,cy*16+16)).getbbox() else '0'
                  for cx in range(scene.w//16)) for cy in range(scene.h//16)]
    (folder/'proposed-object-cells.json').write_text(json.dumps({'cellSize':16,'rows':rows,
        'note':'Conservative object shape, not installed navigation collision. Paving and contact shadows are not solid; refresh real sign/warp/road approaches during integration.'},indent=2)+'\n')
    rgba=scene.im.convert('RGBA');crop=rgba.crop(rgba.getbbox())
    large=crop.resize((crop.width*3,crop.height*3),Image.Resampling.NEAREST)
    review=Image.new('RGB',(large.width+32,large.height+32),'#e3e9d9')
    review.paste(large,(16,16),large);review.save(folder/'review.png')
    return {'id':ident,'title':title,'number':number,'revision':4,
        'nativeFile':str((folder/'native.png').relative_to(BASE)),
        'nativeSize':list(scene.im.size),'requiresPlacementUpdate':meta['requiresPlacementUpdate']}


def review_board(entries):
    board=Image.new('RGB',(1180,1060),'#f3f0e5');draw=ImageDraw.Draw(board)
    font='/System/Library/Fonts/Supplemental/Arial.ttf'
    draw.text((22,20),'CENTERED ROOFS / GAME-MAP VIEW',font=ImageFont.truetype(font,26),fill='#203838')
    draw.text((22,56),'13 / 16 / 17 / 18  ·  Revision 4  ·  Art review, not installed',font=ImageFont.truetype(font,17),fill='#61736a')
    for n,item in enumerate(entries):
        x=20+n%2*580;y=92+n//2*480
        draw.rounded_rectangle((x,y,x+560,y+460),radius=10,fill='#e3e9d9',outline='#bdcbb6')
        image=Image.open(BASE/item['nativeFile']).convert('RGBA')
        image=image.crop(image.getbbox());image=image.resize((image.width*2,image.height*2),Image.Resampling.NEAREST)
        assert image.width<=528 and image.height<=400
        board.paste(image,(x+(560-image.width)//2,y+14+(400-image.height)//2),image)
        draw.line((x+14,y+424,x+546,y+424),fill='#bdcbb6')
        draw.text((x+16,y+433),f"{item['number']}  {item['title']}",font=ImageFont.truetype(font,20),fill='#203838')
    board.save(ROOT/'review-four.png')


if __name__=='__main__':
    # All rear roof edges have the same center as their corresponding front edge.
    for width in (54,76,80,124,132):
        volume=CenteredVolume(10,160,width,0,24,60)
        for q in (0,.25,.5,.75,1):
            assert volume.p(0,q,60)[0]+volume.p(width,q,60)[0]==20+width
            assert volume.p(width/2,q,60)[0]==10+width/2
    entries=[
      export('botanical-garden',13,'Botanical Garden',botanical(),[208,112],
        ['Curved glazed roof hood recedes upward about x112, with evenly paired masts and mullions.','Glass roof, face, base and steps share a centered frontal game camera. Butterfly and water garden remain foreground details.'],
        'https://www.nmns.edu.tw/en/exhibitions/galleries/botanical-garden/tropical-rain-forest-greenhouse/'),
      export('prefectural-hall',16,'Prefectural Hall',prefectural(),[160,160],
        ['Level corner pavilion and brick wing; no rotated vertical side face.','Both mansard crowns show top planes, equal end hips and broad front slopes, aligned to their own centerline.','Native sign/forecourt placement must be refreshed for the taller facade; do not punch an old sign hole in the building.'],
        'https://travel.taichung.gov.tw/en/attractions/intro/1367'),
      export('second-market',17,'Second Market',market(),[112,144],
        ['Level front facade; raised hall centered over the frontage.','Roof depth goes straight up, with equal left/right inset and no exposed right wall.'],
        'https://travel.taichung.gov.tw/en/attractions/intro/1366'),
      export('cultural-heritage-park',18,'Cultural Heritage Park',brewery(),[176,288],
        ['Both hall ridges stay on their own centerline; roof slopes recede upward evenly.','Connecting flat roof tapers symmetrically like the existing theater roof; all facades stay frontal.'],
        'https://travel.taichung.gov.tw/en/Attractions/Intro/1053')]
    (ROOT/'manifest.json').write_text(json.dumps({'status':'REVIEW_REVISIONS_NOT_INSTALLED','revision':4,'landmarks':entries},indent=2)+'\n')
    review_board(entries)
    print(json.dumps(entries,indent=2))
