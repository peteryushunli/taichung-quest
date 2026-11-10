"""Nantun Wenchang: raised two-storey hall and pale stone terrace,112×96."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent.parent))
from pixel import Canvas, curved_roof, stone_column, lantern, emit

def make():
    c=Canvas(112,96)
    # High red-masonry terrace distinguishes this building from Wanhe's porch.
    c.rect((10,48,101,88),6);c.rect((12,51,99,84),7)
    for y in (58,66,74,82):
        c.line([(12,y),(99,y)],9)
        for x in range(13+(y//8%2)*5,100,12):c.line([(x,y-6),(x,y-1)],6)
    c.rect((12,28,99,54),9);c.rect((17,31,94,53),1)
    # Upper-level hall: shaded bays, stone columns, red joinery, narrow plaque.
    for x in (17,34,73,90):stone_column(c,x,30,55)
    for x0 in (24,79):
        c.rect((x0,35,x0+9,49),12)
        for x in range(x0+1,x0+9,3):c.line([(x,36),(x,48)],10)
        for y in (39,44):c.line([(x0+1,y),(x0+8,y)],9)
    c.rect((46,33,65,54),6);c.rect((49,35,62,54),1)
    c.rect((43,28,68,34),9);c.rect((45,29,66,32),11)
    for x in (39,72):lantern(c,x,35)
    # Ochre glazed-tile roof: broad shallow ridge, no Wanhe dragon-horse mass.
    curved_roof(c,(10,5,101,28),None,None,tip=False,gold=True)
    c.line([(18,5),(93,5)],11,2)
    c.line([(17,5),(15,2),(17,1),(19,3)],10)
    c.line([(94,5),(96,2),(94,1),(92,3)],10)
    c.rect((16,28,95,30),12)
    for x in range(18,95,6):
        c.rect((x,29,x+2,32),2);c.dot(x,29,14)
    # White upper balustrades are solid architectural elements, not windows.
    for x0,x1 in [(9,43),(68,102)]:
        c.rect((x0,53,x1,55),5);c.rect((x0,63,x1,65),3)
        for x in range(x0,x1+1,7):
            c.rect((x,50,x+2,64),4);c.dot(x+1,49,5)
        c.line([(x0,56),(x1,56)],3)
    # Paired diagonal stone stairs and engraved terrace panels; event canopy omitted.
    for left in (True,False):
        points=[(12,66),(43,66),(31,89),(3,89)] if left else [(68,66),(99,66),(108,89),(80,89)]
        c.poly(points,4)
        for y in range(69,88,4):
            t=(y-66)/23
            a=round(12+(3-12)*t) if left else round(68+(80-68)*t)
            b=round(43+(31-43)*t) if left else round(99+(108-99)*t)
            c.line([(a,y),(b,y)],3);c.line([(a,y-1),(b,y-1)],5)
        c.line([points[0],points[3]],5,2);c.line([points[1],points[2]],2,2)
    c.rect((35,69,76,92),2);c.rect((38,71,73,90),4)
    for x in (40,64):
        c.line([(x,73),(x+5,76),(x+2,80),(x+6,83)],3)
    # Native door cell is at ground-level center; a deliberate game-space adaptation.
    c.rect((47,77,64,95),9);c.rect((49,79,62,95),1)
    c.line([(46,77),(65,77)],5)
    for x in (49,62):c.line([(x,79),(x,94)],6)
    c.line([(4,94),(45,94)],3);c.line([(66,94),(108,94)],3)
    return c

if __name__=='__main__':
    r=emit(make(),Path(__file__).resolve().parent,'wenchang-temple',
      [{'page':'https://www.tchac.taichung.gov.tw/historybuilding?pid=4&uid=34','photo':'references/tchac-exterior.jpg','authority':'Taichung Cultural Heritage Department','observed':'Raised two-storey cloister/pavilion, ochre roof, stone balustrade, diagonal stairs, red masonry terrace. Temporary multicolor event canopy omitted.'},
       {'page':'https://taiwangods.moi.gov.tw/html/cultural_EN/3_0011.aspx?i=227','authority':'Ministry of the Interior','use':'Nantun temple identity and two-storey pavilion form; not Beitun Wenchang Temple.'}],
      ['Raised two-storey mass, stone balustrades and paired stairs identify Nantun Wenchang.','Shallow ochre roof is distinct from Wanhe Sanchuan facade and Confucius double-hip hall.','The existing ground-level local(3,5) native portal is retained as a game-space adaptation.','Native112×96 envelope; no temporary event canopy or fabricated inscription copied.'],portal=[3,5])
    print({k:r[k] for k in ('id','nativePixels','unique8x8PatternsWithFlips','opaque16x16Cells')})
