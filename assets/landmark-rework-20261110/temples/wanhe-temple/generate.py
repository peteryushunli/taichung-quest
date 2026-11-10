"""Wanhe's three-bay Sanchuan facade, authored directly at144×112 pixels."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent.parent))
from pixel import Canvas, curved_roof, stone_column, lantern, emit

def make():
    c=Canvas(144,112)
    # Recessed three-bay stone facade and carved masonry plinth.
    c.rect((8,58,135,103),2);c.rect((11,62,132,102),4)
    c.rect((7,102,136,108),3);c.line([(7,102),(136,102)],5)
    c.line([(5,109),(138,109)],1)
    for x in range(9,137,16):c.line([(x,104),(x+12,104)],4)
    for x0,x1 in [(20,42),(59,84),(101,123)]:
        c.rect((x0-2,69,x1+2,102),9);c.rect((x0,71,x1,101),1)
        c.line([(x0,71),(x0,101)],7);c.line([(x1,71),(x1,101)],6)
        c.rect((x0+2,100,x1-2,102),8)
    # Wing mural panels and deeply recessed timber screens.
    for x0 in (12,46,89,127):
        c.rect((x0,76,x0+5,96),15);c.line([(x0,76),(x0+5,76)],11)
        for y in (80,85,90):c.line([(x0+1,y+2),(x0+3,y),(x0+4,y+2)],14)
        c.line([(x0,97),(x0+5,97)],5)
    for x0 in (23,104):
        c.rect((x0,76,x0+15,97),12)
        for x in range(x0+1,x0+15,4):c.line([(x,77),(x,96)],10)
        for y in (80,86,92):c.line([(x0+1,y),(x0+14,y)],9)
    c.rect((64,79,79,103),1)
    c.rect((65,88,78,102),7)
    for x in range(66,79,3):c.line([(x,89),(x,100)],8)
    # Stone hexagonal porch columns, deliberately not generic red house posts.
    for x in (7,49,89,132):stone_column(c,x,63,102)
    # Three separately raised curved roof masses; central Xi Shi ridge is tallest.
    curved_roof(c,(6,29,52,61),None,None)
    curved_roof(c,(91,29,137,61),None,None)
    curved_roof(c,(39,11,104,59),None,None)
    # Cobalt/teal carved frieze, ceramic highlights, regular dark bracket rhythm.
    c.poly([(43,26),(55,29),(88,29),(100,26),(102,33),(42,33)],15)
    c.line([(45,27),(57,30),(87,30),(99,27)],11)
    for x in (48,60,72,84,96):
        c.line([(x-3,32),(x,29),(x+3,32)],14)
        c.dot(x,30,8);c.dot(x+1,31,11)
    c.rect((12,62,132,65),12)
    for x in range(14,130,8):
        c.rect((x,63,x+3,66),1);c.dot(x,63,14);c.dot(x+2,65,11)
    # Small original ceramic-dragon curls; the center horse stays a readable cluster.
    for x,s in [(19,-1),(124,1),(52,-1),(91,1)]:
        y=17 if x in (52,91) else 32
        c.line([(x,y+3),(x,y+7)],13)
        c.line([(x,y+3),(x+s*3,y),(x+s*2,y-4),(x+s*5,y-5)],13,2)
        c.line([(x,y+2),(x+s*2,y-1),(x+s*2,y-3)],11)
        c.dot(x+s*5,y-6,8)
    c.rect((68,15,77,18),13);c.line([(70,15),(69,11),(72,10)],11)
    c.line([(75,15),(78,12),(79,14)],14);c.dot(71,19,9);c.dot(76,19,9)
    # Roof-edge shadow, lanterns and the warm central plaque unify the facade.
    c.rect((62,65,81,72),9);c.rect((63,66,80,70),11)
    c.line([(66,68),(68,68)],6);c.line([(72,67),(72,69)],6);c.line([(76,68),(78,68)],6)
    for x in (55,88):lantern(c,x,70)
    return c

if __name__=='__main__':
    r=emit(make(),Path(__file__).resolve().parent,'wanhe-temple',
      [{'page':'https://www.tchac.taichung.gov.tw/building?pid=3&uid=33','photo':'references/tchac-front.jpg','authority':'Taichung Cultural Heritage Department','observed':'Three separately curved terracotta roof masses; raised decorated central Xi Shi ridge; blue-green ceramic frieze; stone porch columns; recessed three-bay timber facade.'},
       {'page':'https://taiwangods.moi.gov.tw/html/landscape_EN/1_0011.aspx?i=41','authority':'Ministry of the Interior','use':'Three-kaijian Sanchuan facade, raised central ridge and dragon-horse ornament.'}],
      ['Three distinct connected roof silhouettes, not two stacked generic green roofs.','Terracotta roof ribs, cobalt porcelain band, pale stone columns and recessed red timber bays.','Tiny ridge ornaments and plaque decoration simplified; no claim of legible native-scale calligraphy.','Keeps the audited9×7 envelope and local(4,6) native door replacement.'],portal=[4,6])
    print({k:r[k] for k in ('id','nativePixels','unique8x8PatternsWithFlips','opaque16x16Cells')})
