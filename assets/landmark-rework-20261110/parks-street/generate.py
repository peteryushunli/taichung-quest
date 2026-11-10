#!/usr/bin/env python3
"""Original integer-pixel landmark scenes. No photographs are sampled or embedded.

Native canvas dimensions follow the existing sight artRect (16 px / map cell).
Run from any directory; output is isolated from game source and map generators.
"""
from pathlib import Path
import hashlib
import json
import struct
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
PALETTE = [
    (0, 0, 0), (32, 56, 56), (48, 80, 80), (56, 112, 128),
    (88, 152, 160), (144, 200, 200), (208, 224, 208), (240, 240, 216),
    (248, 248, 240), (40, 88, 56), (64, 136, 72), (136, 184, 88),
    (216, 176, 80), (120, 88, 64), (128, 144, 128), (176, 184, 160),
]


class Scene:
    def __init__(self, width, height, palette=None, transform=None):
        self.palette = palette or PALETTE
        self.im = Image.new('P', (width, height), 0)
        self.im.putpalette([c for rgb in self.palette for c in rgb] + [0] * (768 - 48))
        self.im.info['transparency'] = 0
        self.d = ImageDraw.Draw(self.im)
        self.w, self.h = width, height
        self.transform = transform

    def pts(self, points):
        if self.transform is None:return points
        scale,dx,dy=self.transform
        return [(round(x*scale+dx),round(y*scale+dy)) for x,y in points]

    def rect(self, box, color, outline=None):
        a,b=self.pts([(box[0],box[1]),(box[2],box[3])])
        self.d.rectangle((*a,*b), fill=color, outline=outline)

    def poly(self, points, color, outline=None):
        points=self.pts(points)
        self.d.polygon(points, fill=color)
        if outline is not None:
            self.d.line(points + [points[0]], fill=outline, width=1)

    def line(self, points, color, width=1):
        self.d.line(self.pts(points), fill=color, width=width)

    def ellipse(self, box, color, outline=None):
        a,b=self.pts([(box[0],box[1]),(box[2],box[3])])
        self.d.ellipse((*a,*b), fill=color, outline=outline)

    def shrub(self, x, y, size=14):
        self.ellipse((x+2, y+size//2, x+size+4, y+size+2), 2)
        self.ellipse((x, y, x+size, y+size), 9, 1)
        self.ellipse((x+1, y+1, x+size-3, y+size-4), 10)
        self.line([(x+4,y+3),(x+size-5,y+3)],11)

    def tree(self,x,y,size=22):
        self.rect((x+size//2-2,y+size-3,x+size//2+2,y+size+8),13,1)
        self.ellipse((x+4,y+size//2,x+size+7,y+size+7),2)
        self.poly([(x+size//2,y),(x+size-1,y+5),(x+size+2,y+size-5),
                   (x+size-4,y+size+1),(x+4,y+size+1),(x-1,y+size-6),(x+1,y+7)],9,1)
        self.ellipse((x+2,y+3,x+size-3,y+size-3),10)
        self.poly([(x+5,y+6),(x+size//2,y+2),(x+size-7,y+6),
                   (x+size-6,y+10),(x+7,y+9)],11)
        self.line([(x+3,y+size-7),(x+8,y+size-5),(x+14,y+size-7)],9)

    def paving(self, box, base=15):
        self.rect(box,base)
        x0,y0,x1,y1=box
        for y in range(y0+7,y1,8):
            self.line([(x0,y),(x1,y)],6)
            for x in range(x0+((y//8)%2)*8,x1,16):
                self.line([(x,y-7),(x,y)],14)

    def bench(self,x,y):
        self.rect((x+1,y+7,x+20,y+10),2)
        self.rect((x+2,y+1,x+19,y+4),13,1)
        self.line([(x+3,y+2),(x+18,y+2)],12)
        self.rect((x,y+5,x+21,y+7),13,1)
        for xx in (x+3,x+17): self.rect((xx,y+8,xx+1,y+11),1)


def botanical():
    # Draw geometry directly to the audited 13x7-cell canvas. Scaling here rounds
    # vector coordinates, not an existing raster, so outlines remain one native pixel.
    s=Scene(208,112,transform=(0.70,31,0))
    # Ground is an original compact garden scene, with the current entrance edge clear.
    s.poly([(8,116),(24,99),(191,99),(203,121),(199,150),(15,150)],10)
    s.paving((105,120,195,159))
    s.poly([(37,111),(55,106),(102,108),(111,122),(100,145),(36,145),(22,133)],9,2)
    s.poly([(39,113),(58,109),(97,111),(105,123),(96,139),(39,139),(28,131)],3)
    s.line([(35,120),(53,117),(72,119)],4)
    s.line([(62,133),(83,132),(97,126)],5)
    for x,y in [(44,125),(68,116),(84,131),(35,132)]:
        s.ellipse((x,y,x+9,y+4),11,9)
        s.line([(x+5,y),(x+4,y+2)],9)
    # Full-height steel-and-glass greenhouse: broad curved top, flaring base, ring bands.
    glass=[(70,32),(87,24),(111,20),(139,19),(159,24),(185,104),(178,115),(61,115)]
    s.poly([(65,110),(187,107),(193,119),(71,124),(57,117)],2)
    s.poly(glass,4,1)
    s.poly([(71,34),(89,27),(111,23),(140,23),(157,28),(165,49),(65,49)],5)
    s.poly([(65,74),(175,74),(184,103),(62,103)],3)
    # Tall interior plants visible through the lower glass.
    for x,y in [(84,80),(101,69),(145,78),(159,88)]:
        s.line([(x,105),(x,y)],9,2)
        for dx,dy in [(-8,-5),(8,-3),(-6,3),(6,5)]:
            s.line([(x,y+8),(x+dx,y+dy)],10,2)
    # Curved rings are paired highlights/shadows rather than noisy checkerboarding.
    for y,xa,xb in [(34,70,160),(48,67,165),(62,65,170),(77,63,175),(92,62,180),(106,61,185)]:
        s.line([(xa,y+1),(105,y+3),(145,y+2),(xb,y-1)],2,2)
        s.line([(xa,y),(105,y+2),(145,y+1),(xb,y-2)],6)
    # Front steel mullions follow the building's flare.
    for xt,xb in [(78,68),(94,91),(111,115),(130,140),(148,164),(158,181)]:
        s.line([(xt,29),(xb,110)],2,3)
        s.line([(xt-1,28),(xb-1,109)],6)
    # The two projecting masts and diagonal side trusses are the signature roof outline.
    s.line([(59,111),(79,15),(99,22)],1,3)
    s.line([(59,109),(79,15),(99,22)],8)
    s.line([(146,19),(161,5),(187,108)],1,3)
    s.line([(146,19),(161,5),(187,108)],8)
    s.line([(79,15),(72,34),(90,47),(67,61),(86,76),(62,91),(80,108)],6)
    s.line([(161,5),(155,30),(169,43),(159,58),(178,72),(167,88),(185,103)],6)
    s.line([(79,15),(108,20),(161,5)],6)
    # Steel sill, low glass entry doors, and broad stone steps.
    s.rect((62,109,185,116),14,1)
    s.line([(63,109),(184,109)],6)
    s.rect((118,101,146,118),6,1)
    for x in (121,133):
        s.rect((x,104,x+9,117),3,2)
        s.line([(x+1,105),(x+7,105),(x+7,112)],5)
    s.rect((118,97,146,101),1)
    s.line([(121,99),(130,99)],12)
    for yy in range(119,132,3):
        s.rect((111,yy,178,yy+2),14)
        s.line([(111,yy),(178,yy)],6)
    # Open-work butterfly sculpture in front-left; legible even at native size.
    s.line([(47,111),(47,61),(61,92),(81,66)],1,2)
    s.poly([(56,90),(43,71),(29,47),(26,43),(23,46),(27,64),(35,79),(46,89)],7,1)
    s.poly([(55,92),(35,82),(30,87),(34,97),(45,102),(56,99)],12,1)
    s.poly([(60,91),(73,80),(96,72),(88,82),(67,96)],12,1)
    s.line([(29,49),(33,64),(49,86),(56,89)],1)
    s.line([(28,56),(40,65),(49,80)],1)
    s.line([(32,70),(44,75),(52,86)],1)
    s.ellipse((54,89,64,100),1)
    s.line([(61,92),(67,85)],1)
    s.line([(46,101),(46,121)],14,2)
    s.line([(68,97),(68,121)],14,2)
    # Frame the architecture, never hide the signature silhouette.
    for x,y,z in [(7,92,18),(188,91,15),(3,128,13),(17,139,12),(190,137,12)]:s.shrub(x,y,z)
    for x,y in [(79,144),(92,145),(10,116)]:
        s.line([(x,y),(x-3,y-9),(x+1,y-3),(x+5,y-10)],11)
    return s


def wenxin():
    s=Scene(192,112)
    # Broad audience bowl behind the open stage, not a temple facade.
    s.poly([(16,27),(39,14),(68,11),(139,16),(174,33),(189,58),
            (188,86),(168,101),(131,110),(58,110),(21,98),(4,76),(4,51)],10)
    s.ellipse((10,18,185,109),13,1)
    # Concentric seating terraces, with pale walking bands between warm benches.
    for box,c in [((13,21,182,106),15),((17,24,179,102),13),
                  ((22,27,174,98),7),((26,31,170,95),13),
                  ((31,34,165,91),15),((35,38,161,87),13),
                  ((40,41,156,83),7),((44,44,152,79),13),
                  ((49,47,147,76),15)]:s.ellipse(box,c)
    # Radial aisles cut the seating; green terraces remain visible at each edge.
    s.poly([(26,31),(36,24),(70,58),(66,62)],10)
    s.poly([(159,27),(167,34),(129,62),(123,58)],10)
    s.poly([(177,61),(180,68),(139,72),(138,66)],6)
    s.poly([(14,65),(16,57),(58,65),(57,72)],6)
    s.ellipse((43,45,158,99),15)
    s.ellipse((49,48,153,93),6)
    # Native silhouette from the official aerial: four white curling roof bands.
    roof=[(38,70),(43,55),(55,39),(72,25),(91,12),(106,7),(122,8),
          (137,17),(149,34),(158,58),(163,79),(151,85),(126,79),(98,75),(68,76),(49,77)]
    s.poly([(x+3,y+5) for x,y in roof],2)
    s.poly(roof,14,1)
    # Rear sweep: high white crest tapering into the right support.
    s.poly([(65,37),(77,23),(93,13),(108,9),(121,10),(133,17),(144,31),
            (151,48),(155,65),(143,49),(129,36),(109,29),(87,30)],8)
    s.poly([(83,30),(98,23),(115,21),(130,25),(141,36),(125,29),
            (108,27),(94,30)],2)
    s.line([(92,18),(109,12),(122,13),(134,21)],7)
    # Middle sweep crosses the rear roof, with a dark elongated opening.
    s.poly([(49,53),(58,39),(72,30),(89,28),(106,32),(124,40),(139,53),
            (150,71),(150,77),(137,65),(119,53),(98,45),(77,42),(60,47)],8)
    s.poly([(65,46),(76,39),(91,38),(105,42),(117,48),(97,43),(80,43),(69,47)],2)
    s.line([(60,41),(74,33),(89,31),(105,35)],7)
    # Foremost curl and the continuous open black stage mouth.
    s.poly([(39,68),(46,55),(59,46),(74,43),(91,47),(109,55),(127,66),
            (144,79),(148,83),(129,77),(110,70),(89,66),(68,64),(52,67)],8)
    s.poly([(40,71),(52,66),(68,66),(89,69),(109,75),(129,80),(149,84),
            (145,92),(126,89),(105,84),(86,80),(66,77),(51,76),(43,79)],1)
    s.line([(44,69),(54,65),(69,64),(89,67),(110,73),(131,79),(146,83)],7)
    s.poly([(153,58),(158,70),(160,81),(151,85),(149,78)],6)
    # Stage apron and its stepped edge retain the open-front battle-adventure scale.
    s.poly([(43,80),(55,78),(78,83),(105,89),(143,94),(138,101),
            (102,97),(74,90),(52,86),(42,87)],15,14)
    s.line([(42,88),(72,93),(101,100),(137,104)],6)
    # Slender lighting rigs and the two access paths give the scene park context.
    for x,y in [(25,39),(174,47)]:
        s.rect((x,y-15,x+1,y+15),14)
        s.line([(x-2,y-14),(x+3,y-14)],7)
        s.rect((x-2,y-17,x+3,y-15),2,1)
    for x,y,z in [(0,81,14),(172,85,14),(6,5,17),(165,7,15)]:s.shrub(x,y,z)
    s.paving((47,104,146,111))
    return s


def fengle(native_fit=False):
    pal=PALETTE.copy()
    pal[3]=(160,64,48)
    pal[4]=(224,104,56)
    pal[5]=(104,160,144)
    s=Scene(176,144,pal)
    if not native_fit:
        s.poly([(7,13),(20,5),(157,8),(171,26),(172,122),(155,138),
                (19,139),(4,126)],10)
    # Open lake and rounded stone banks, framed by the existing compact park plot.
    lake=[(53,21),(78,15),(134,19),(157,30),(165,50),(156,77),
          (136,89),(77,85),(54,73),(42,49)]
    s.poly([(x+2,y+3) for x,y in lake],2)
    s.poly(lake,14,1)
    s.poly([(54,25),(79,20),(134,23),(153,33),(160,50),(152,73),
            (133,83),(79,79),(59,69),(47,48)],9)
    for x,y,n in [(63,67,16),(116,72,21),(129,48,12),(81,33,19)]:
        s.line([(x,y),(x+n,y)],5)
        s.line([(x+3,y+3),(x+n-4,y+3)],10)
    # Cream concrete bridge with the distinctive undulating parapet.
    s.poly([(47,43),(53,37),(59,34),(66,34),(74,38),(81,42),
            (87,42),(95,37),(102,34),(110,34),(118,39),(124,43),
            (132,43),(139,38),(147,35),(154,36),(164,43),(164,59),
            (47,59)],6,1)
    s.line([(48,43),(55,37),(62,36),(68,37),(79,44),(86,44),
            (98,37),(106,36),(113,38),(125,45),(132,45),
            (143,38),(150,37),(163,44)],8,2)
    for x in (54,80,106,132,153):
        s.ellipse((x,45,x+12,66),9,14)
        s.rect((x,54,x+12,63),9)
        s.line([(x,54),(x,63)],14)
        s.line([(x+12,54),(x+12,63)],14)
    s.line([(47,61),(165,61)],5)
    # Shore walk and short protective rails, not a castle in a square pond.
    if not native_fit:
        s.paving((17,89,161,132))
        s.poly([(18,93),(47,84),(64,87),(62,92),(39,94),(18,101)],15)
    s.line([(46,79),(66,87),(97,91),(134,91),(158,82)],2)
    for x,y in [(48,80),(65,87),(82,90),(99,92),(117,92),(134,91),(154,84)]:
        s.rect((x,y-3,x+1,y+7),14,1)
    # Verified sculpture installation: red tilted cubes on dark stems, varied heights.
    s.poly([(30,120),(140,120),(148,126),(36,126)],3,1)
    s.line([(32,121),(140,121)],13)
    for x,y,r in [(38,100,9),(61,93,10),(86,88,11),(111,96,10),(133,103,8)]:
        s.rect((x-2,y+4,x+2,120),1)
        s.poly([(x-r,y),(x,y-r),(x+r,y),(x,y+r)],4,1)
        s.poly([(x,y-r),(x+r,y),(x+r,y+4),(x,y+r+4),(x,y+r)],3,1)
        s.line([(x-r+2,y),(x,y-r+2),(x+r-2,y)],12)
    if not native_fit:
        s.tree(4,22,25);s.tree(17,5,21);s.tree(147,3,20)
        s.shrub(5,65,17);s.shrub(2,112,15);s.shrub(152,117,16)
        s.bench(17,77)
    # Small foreground flower beds and an open lower approach.
    for x,y in ([] if native_fit else [(12,134),(24,135),(153,135)]):
        s.ellipse((x-2,y,x+3,y+2),9)
        s.rect((x,y-3,x+1,y+1),11)
        s.rect((x-1,y-4,x+2,y-3),12)
    return s


def sign_text(s, x, y, text, color=7, size=11, vertical=False):
    """Thresholded real Chinese glyphs; no antialiased colors enter the tile palette."""
    font=ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc',size)
    for n,ch in enumerate(text):
        mask=Image.new('L',(size+2,size+3),0)
        ImageDraw.Draw(mask).text((0,-1),ch,font=font,fill=255,stroke_width=0)
        mask=mask.point(lambda p:255 if p>=112 else 0)
        s.im.paste(color,(x+(0 if vertical else n*size),y+(n*(size+1) if vertical else 0)),mask)


def yizhong(native_fit=False):
    pal=PALETTE.copy()
    pal[3]=(176,64,48)       # Vermilion signage, not glass blue.
    pal[4]=(224,120,72)
    pal[5]=(128,176,184)
    pal[13]=(136,104,80)
    s=Scene(160,128,pal)
    s.paving((0,8,159,95 if native_fit else 127),14)
    # Two irregular sides of the existing two-cell pedestrian lane.
    s.rect((4,8,56,85 if native_fit else 105),1)
    s.rect((7,11,53,58 if native_fit else 78),15)
    s.poly([(3,9),(12,3),(52,3),(57,9)],6,1)
    s.rect((4,9,56,13),14,1)
    s.line([(7,10),(53,10)],7)
    s.rect((15,0,29,6),14,1)
    s.ellipse((15,0,29,4),6,1)
    # A slightly taller, projecting bay with balconies and air-conditioning units.
    for y in ((19,39) if native_fit else (19,39,59)):
        for x in (12,35):
            s.rect((x,y,x+12,y+12),1)
            s.rect((x+1,y+1,x+11,y+9),2)
            s.line([(x+2,y+2),(x+9,y+2)],5)
            s.line([(x+6,y+1),(x+6,y+9)],14)
        s.rect((8,y+13,51,y+16),6,1)
        for x in range(11,51,6): s.line([(x,y+14),(x,y+17)],14)
    for y in (24,44):
        s.rect((28,y,34,y+5),6,1)
        s.line([(29,y+2),(33,y+2),(33,y+3),(29,y+3)],14)
    # Red hanging sign ties this to Yizhong, rather than an anonymous house row.
    s.rect((48,18,61,52),1)
    s.rect((49,19,60,50),3)
    sign_text(s,49,21,'一中',7,11,True)
    s.line([(50,48),(58,48)],12)
    s.transform=(1,0,-20) if native_fit else None
    # Street-level chicken/snack counter and striped canopy.
    s.rect((5,77,54,104),2,1)
    s.rect((7,78,51,83),3)
    sign_text(s,11,58 if native_fit else 78,'小吃',7,10)
    s.poly([(5,84),(53,84),(58,92),(1,92)],3,1)
    for x in range(5,55,10):s.poly([(x,85),(x+4,85),(x+6,91),(x,91)],7)
    s.rect((4,93,55,96),3,1)
    for x in range(5,55,10):s.rect((x,94,x+4,96),7)
    s.rect((8,98,29,113),13,1)
    s.rect((7,98,30,101),6,1)
    s.rect((10,103,27,109),3)
    s.rect((34,98,52,109),1)
    for x in range(36,52,4):
        s.ellipse((x,98,x+3,101),12)
        s.line([(x+1,101),(x+1,105)],7)
    # Far side: stepped roof, shutters, clothing shop, and a tea stand.
    s.transform=None
    s.rect((101,4,154,75 if native_fit else 103),1)
    s.rect((104,7,152,43 if native_fit else 71),6)
    s.rect((100,4,156,10),14,1)
    s.line([(102,5),(153,5)],8)
    for y in ((17,) if native_fit else (17,39)):
        s.rect((108,y,147,y+16),14,1)
        for x in (110,124,138):
            s.rect((x,y+2,x+8,y+12),2)
            s.line([(x+1,y+3),(x+7,y+3)],5)
            s.line([(x+4,y+2),(x+4,y+12)],6)
        s.line([(106,y+17),(151,y+17)],7)
    s.rect((143,17,156,53),1)
    s.rect((144,18,155,52),10)
    sign_text(s,144,20,'茶飲',7,11,True)
    s.transform=(1,0,-28) if native_fit else None
    s.rect((104,62,152,72),13,1)
    sign_text(s,115,34 if native_fit else 62,'衣舍',7,10)
    s.poly([(104,73),(153,73),(158,82),(98,82)],9,1)
    for x in range(104,155,10):s.poly([(x,74),(x+4,74),(x+6,81),(x,81)],11)
    s.rect((101,83,155,87),9,1)
    s.rect((106,88,150,106),2)
    s.line([(109,92),(145,92)],14)
    for x,c in [(109,7),(123,4),(137,5)]:
        s.poly([(x+2,94),(x+5,92),(x+8,94),(x+11,97),(x+9,100),(x+8,99),(x+8,105),(x+2,105),(x+2,99),(x,100),(x-2,97)],c,1)
    # Tea cart: recognisable cup shapes, counter equipment, rear wheels.
    s.rect((121,110,149,119),13,1)
    s.rect((119,108,151,111),6,1)
    for x in (123,132,141):
        s.poly([(x,101),(x+6,101),(x+5,108),(x+1,108)],7,1)
        s.line([(x+4,98),(x+3,103)],3)
    for x in (124,145):s.ellipse((x,119,x+3,122),1)
    # Light fittings/string lamps are decorative overhead, never collision objects.
    s.transform=None
    s.line([(57,13),(79,18),(102,13)],1)
    for x,y in [(64,16),(79,18),(94,16)]:
        s.rect((x-2,y,x+2,y+5),3,1)
        s.line([(x-1,y+1),(x-1,y+4)],12)
    # Keep the established centre lane and bottom approach visually open.
    for y in range(34,88 if native_fit else 123,16):
        s.line([(70,y),(80,y)],15)
        s.line([(84,y+7),(93,y+7)],6)
    if not native_fit:
        s.rect((60,118,65,124),12,1)
        s.line([(63,119),(63,122)],3)
    return s


def export(scene, ident, world_rect, references):
    folder=ROOT/ident; folder.mkdir(parents=True,exist_ok=True)
    path=folder/'native.png'; scene.im.save(path,transparency=0,optimize=False)
    rgba=scene.im.convert('RGBA')
    rgba.resize((scene.w*4,scene.h*4),Image.Resampling.NEAREST).save(folder/'preview-4x.png')
    # Tile-order, low nibble left pixel, matching GBA 4bpp storage. Full canvas, not deduped.
    pixels=list(scene.im.get_flattened_data()); data=bytearray(); tiles=[]
    for ty in range(0,scene.h,8):
        for tx in range(0,scene.w,8):
            tile=bytes(pixels[(ty+y)*scene.w+tx+x] for y in range(8) for x in range(8))
            tiles.append(tile)
            for n in range(0,64,2): data.append(tile[n] | tile[n+1]<<4)
    (folder/'canvas.4bpp').write_bytes(data)
    (folder/'palette.gbapal').write_bytes(b''.join(struct.pack('<H',(r>>3)|((g>>3)<<5)|((b>>3)<<10)) for r,g,b in scene.palette))
    (folder/'palette.pal').write_text('JASC-PAL\n0100\n16\n'+'\n'.join(' '.join(map(str,rgb)) for rgb in scene.palette)+'\n')
    occupied=[]
    for cy in range(scene.h//16):
        occupied.append([int(any(scene.im.getpixel((x,y)) for y in range(cy*16,(cy+1)*16) for x in range(cx*16,(cx+1)*16))) for cx in range(scene.w//16)])
    (folder/'visual-occupancy.json').write_text(json.dumps({'note':'Visual coverage only; not a collision override. Preserve audited native signs, door warps and approaches.','cellSize':16,'rows':occupied},indent=2)+'\n')
    canonical=lambda t:min(t,bytes(t[y*8+7-x] for y in range(8) for x in range(8)),bytes(t[(7-y)*8+x] for y in range(8) for x in range(8)),bytes(t[(7-y)*8+7-x] for y in range(8) for x in range(8)))
    # Export a flip-deduplicated tile atlas and an exact reconstruction map as well.
    # Local tile IDs are intentionally unassigned to any ROM graphics/palette bank.
    atlas=[bytes(64)]; atlas_ids={atlas[0]:0}; words=[]
    for tile in tiles:
        variants=[tile,bytes(tile[y*8+7-x] for y in range(8) for x in range(8)),
                  bytes(tile[(7-y)*8+x] for y in range(8) for x in range(8)),
                  bytes(tile[(7-y)*8+7-x] for y in range(8) for x in range(8))]
        chosen=min(variants); flip=[0,0x400,0x800,0xC00][variants.index(chosen)]
        if chosen not in atlas_ids:atlas_ids[chosen]=len(atlas);atlas.append(chosen)
        words.append(atlas_ids[chosen]|flip)
    packed=bytearray()
    atlas_image=Image.new('P',(128,((len(atlas)+15)//16)*8),0)
    atlas_image.putpalette(scene.im.getpalette())
    for n,tile in enumerate(atlas):
        for k in range(0,64,2):packed.append(tile[k]|tile[k+1]<<4)
        stamp=Image.frombytes('P',(8,8),tile)
        atlas_image.paste(stamp,(n%16*8,n//16*8))
    atlas_image.save(folder/'unique-tiles.png',transparency=0)
    (folder/'unique-tiles.4bpp').write_bytes(packed)
    (folder/'tilemap.json').write_text(json.dumps({'tileSize':8,'width':scene.w//8,
        'height':scene.h//8,'words':words,'format':'Local tile IDs; H flip bit10, V flip bit11; palette bank unassigned.'},indent=2)+'\n')
    # Verify the exact native image can be reconstructed from the packed tile map.
    for source,word in zip(tiles,words):
        tile=atlas[word&0x3FF]
        rebuilt=bytes(tile[(7-y if word&0x800 else y)*8+(7-x if word&0x400 else x)] for y in range(8) for x in range(8))
        assert source==rebuilt,ident
    meta={'id':ident,'status':'art-review; not installed','worldRectExclusive':world_rect,'nativeSize':[scene.w,scene.h],'paletteColorsIncludingTransparent':16,'opaqueColorsUsed':len(set(pixels)-{0}),'rawTileCount':len(tiles),'unique8x8Tiles':len(set(tiles)),'unique8x8TilesWithFlips':len(set(map(canonical,tiles))),'packedTileCountIncludingEmpty':len(atlas),'packedTileRoundTripVerified':True,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'references':references,'integration':'Exact audited native dimensions. Art review pack, not a ROM patch. Requires tile-bank allocation/repacking and collision refresh for new object shapes, preserving real sign/warp/road approaches. Existing empty-ground cells are not automatically hard keep-clear reservations. No game or website sources changed.'}
    (folder/'manifest.json').write_text(json.dumps(meta,indent=2)+'\n')
    return meta


if __name__=='__main__':
    print(json.dumps(export(botanical(),'botanical-garden',[49,21,62,28],[
      'https://www.nmns.edu.tw/en/exhibitions/galleries/botanical-garden/tropical-rain-forest-greenhouse/',
      'https://travel.taichung.gov.tw/zh-tw/Attractions/Intro/158/']),indent=2))
    print(json.dumps(export(yizhong(),'yizhong-street',[110,34,120,42],[
      'https://travel.taichung.gov.tw/en/attractions/intro/1551']),indent=2))
    print(json.dumps(export(wenxin(),'wenxin-forest-park',[15,88,27,95],[
      'https://fa.culture.taichung.gov.tw/english/content/index.asp?Parser=1,10,20']),indent=2))
    print(json.dumps(export(fengle(),'fengle-sculpture-park',[60,159,71,168],[
      'https://travel.taichung.gov.tw/en/attractions/intro/889',
      'https://filmtaichung.org.tw/scenesContent/242']),indent=2))
