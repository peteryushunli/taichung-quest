"""Taichung Confucius Temple: Song-style hall and compressed precinct,160×144."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent.parent))
from pixel import Canvas, emit

def hip(c,x0,y0,x1,y1):
    mid=(x0+x1)//2
    c.poly([(x0+14,y0),(x1-14,y0),(x1-2,y1-6),(x1+3,y1-9),
            (x1+1,y1-3),(mid,y1),(x0-1,y1-3),(x0-3,y1-9),(x0+2,y1-6)],9)
    for y in range(y0+1,y1):
        for x in range(x0-2,x1+3):
            if c.im.getpixel((x,y))==9:
                c.dot(x,y,11 if x%4==0 else 10 if x%4 in (1,2) else 9)
    c.line([(x0+14,y0),(x1-14,y0)],11,2)
    c.line([(x0-2,y1-3),(mid,y1),(x1+2,y1-3)],1)
    c.line([(x0,y1-4),(mid,y1-1),(x1,y1-4)],11)

def rail(c,x0,y0,x1,y1):
    c.rect((x0,y0,x1,y0+2),5);c.rect((x0,y1-1,x1,y1),3)
    for x in range(x0,x1,7):
        c.rect((x,y0-1,x+2,y1),4);c.dot(x+1,y0-2,5)

def make():
    c=Canvas(160,144)
    # Precinct perimeter: pale stone over a restrained vermilion wall.
    c.rect((0,4,159,7),9);c.line([(0,3),(159,3)],11)
    for x0 in (0,155):
        c.rect((x0,7,x0+4,143),6);c.line([(x0,7),(x0,143)],4)
    # Seven-bay Dacheng Hall, facing the camera. Pale terrace and dark timber bays.
    c.rect((15,43,144,59),1)
    for x in (18,37,56,75,94,113,132):
        c.rect((x,45,x+3,60),6);c.line([(x,45),(x,59)],8)
        c.rect((x-1,58,x+4,60),4)
    for x0 in (25,44,101,120):
        for y in (49,53,57):c.line([(x0,y),(x0+5,y)],9)
    c.rect((12,60,147,63),4);c.line([(12,60),(147,60)],5)
    # Golden double-eaved hip roofs; small chiwen, no Minnan dragon finials.
    hip(c,34,8,125,28)
    c.line([(49,7),(110,7)],11)
    for x,s in ((49,-1),(110,1)):
        c.line([(x,7),(x+s*2,3),(x+s*4,3),(x+s*4,5)],9,2)
    c.rect((29,28,130,34),12)
    for x in range(31,130,7):
        c.rect((x,29,x+3,32),13);c.dot(x+1,29,14);c.dot(x,33,9)
    hip(c,9,34,150,46)
    c.line([(13,47),(146,47)],12,2)
    # A compact central Dacheng gate leaves the audited side courtyards open.
    hip(c,55,68,104,79)
    c.rect((59,80,100,94),6)
    c.rect((62,82,69,93),1);c.rect((74,81,85,94),1);c.rect((90,82,97,93),1)
    for x in (59,71,87,99):c.line([(x,80),(x,94)],8)
    c.line([(58,95),(101,95)],4)
    # Half-moon pool and central stone bridge; decorative precinct art, no new warp.
    c.poly([(33,100),(126,100),(126,112),(121,120),(111,125),(48,125),(38,120),(33,112)],2)
    c.poly([(36,102),(123,102),(123,112),(117,119),(108,122),(51,122),(42,117),(36,111)],15)
    c.line([(42,104),(65,104)],4);c.line([(94,106),(116,106)],3)
    c.line([(46,117),(63,117)],3);c.line([(96,119),(109,119)],13)
    c.rect((73,99,86,126),4);c.line([(73,99),(73,126)],5);c.line([(86,99),(86,126)],2)
    for y in range(103,126,5):c.line([(75,y),(84,y)],3)
    # Lingxing stone screen, compressed at the foreground; remain a visit scene.
    for x in (31,48,65,94,111,128):
        c.rect((x,132,x+3,143),4);c.rect((x-1,130,x+4,132),5)
        c.rect((x,127,x+2,129),3);c.dot(x+1,126,5)
    for x0,x1 in ((31,65),(94,132)):
        c.line([(x0,134),(x1,134)],4);c.line([(x0,141),(x1,141)],2)
        for x in range(x0+4,x1,5):c.line([(x,135),(x,140)],3)
    # Actual registered sign occupies local(4,8). Its native map word wins.
    c.rect((64,128,79,143),0)
    return c

if __name__=='__main__':
    r=emit(make(),Path(__file__).resolve().parent,'confucius-temple',
      [{'page':'https://www.confucius.taichung.gov.tw/834557/834568/834569/834571/834573/837663','photo':'references/official-dacheng.jpg','authority':'Taichung Confucius Temple and Martyrs Shrine Administration','observed':'Dacheng Hall yellow glazed double hip roofs, seven vermilion-column bays, blue-green bracket painting, pale stone terrace and balustrade; no Minnan dragon finials.'},
       {'page':'https://www.confucius.taichung.gov.tw/834557/834568/834569/834571/834572/837602','authority':'Taichung Confucius Temple and Martyrs Shrine Administration','use':'Precinct sequence and Song-style distinction.'}],
      ['Golden double-eaved hip-roof hall identifies Confucius Temple, distinct from both Nantun temples.','Dacheng Hall, smaller gate, half-moon pool, central bridge and Lingxing screen retain the compressed precinct concept.','No native door exists here; no false enterable portal or new warp proposed.','Fits registered160×144 scene; existing sign local(4,8) is reserved and transparent.','Two former empty side cells local(1,7)/(8,7) receive pool-edge detail; a companion collision decision is needed.'],anchors=[[4,8]])
    print({k:r[k] for k in ('id','nativePixels','unique8x8PatternsWithFlips','opaque16x16Cells')})
