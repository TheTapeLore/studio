import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
from assets import *
from glyphs import glyph

def wrap_lines(text, fk, size, maxw, tracking=0):
    words=text.split(); lines=[]; cur=""
    for w in words:
        t=(cur+" "+w).strip()
        if text_width(t,fk,size,tracking)<=maxw: cur=t
        else: lines.append(cur); cur=w
    if cur: lines.append(cur)
    return lines

def pit_visual(x, y, s):
    """Risk metaphor 'The Pit': same distance down and up, but twice the percentage to climb out."""
    k=s/400
    def P(px,py): return f"{x+px*k:.1f},{y+py*k:.1f}"
    w=lambda v: f"{v*k:.1f}"
    b  = f'<rect x="{x+110*k:.1f}" y="{y+80*k:.1f}" width="{180*k:.1f}" height="{200*k:.1f}" fill="{C["abyss"]}" opacity="0.75"/>'
    b += f'<path d="M{P(0,80)} L{P(110,80)} L{P(110,280)} L{P(290,280)} L{P(290,80)} L{P(400,80)}" fill="none" stroke="{C["tape"]}" stroke-width="{w(10)}" stroke-linejoin="round" stroke-linecap="round"/>'
    b += f'<path d="M{P(148,98)} L{P(148,258)}" stroke="{C["ember"]}" stroke-width="{w(12)}" stroke-linecap="round"/>'
    b += f'<path d="M{P(128,236)} L{P(148,260)} L{P(168,236)}" fill="none" stroke="{C["ember"]}" stroke-width="{w(12)}" stroke-linecap="round" stroke-linejoin="round"/>'
    b += f'<path d="M{P(252,262)} L{P(252,102)}" stroke="{C["sodium"]}" stroke-width="{w(12)}" stroke-linecap="round"/>'
    b += f'<path d="M{P(232,124)} L{P(252,100)} L{P(272,124)}" fill="none" stroke="{C["sodium"]}" stroke-width="{w(12)}" stroke-linecap="round" stroke-linejoin="round"/>'
    b += text_path("−50%", 'mono6', 24*k, x+138*k, y+322*k, anchor='middle', fill=C['ember'])
    b += text_path("+100%", 'mono6', 24*k, x+262*k, y+322*k, anchor='middle', fill=C['sodium'])
    b += text_path("Same distance. Twice the percentage.", 'body', 20*k, x+200*k, y+364*k, anchor='middle', fill=C['mist'])
    return b

def youtube_thumb():
    W,H=1280,720
    b = vignette(W,H)+grid(W,H,40,0.14)
    b += tape_strip(0, 44, 620, 54, "LORE 001   RISK & SIZING", size=19)
    lines=["A 50% LOSS","NEEDS +100%","TO RECOVER"]
    for i,l in enumerate(lines):
        b += text_path(l,'display9',112,56,250+i*118, fill=C['sodium'] if i==1 else C['tape'])
    b += pit_visual(720,170,500)
    b += f'<g transform="translate(1160,40)">'+mark(0.19,0,0,sw=44)+'</g>'
    return svg(W,H,b)

def ig_post():
    W,H=1080,1350
    b = vignette(W,H)+grid(W,H,54,0.14)
    b += tape_strip(0, 72, W, 64, "LORE 001   RISK & SIZING   THE PIT", size=21)
    for i,l in enumerate(["Losses dig","faster than","gains climb."]):
        b += text_path(l,'display9',124,72,330+i*128, fill=C['tape'])
    b += pit_visual(240,690,600)
    b += text_path("Swipe for the math", 'body7', 30, 72, 1270, fill=C['mist'])
    b += f'<g transform="translate(944,1196)">'+mark(0.2,0,0,sw=44)+'</g>'
    return svg(W,H,b)

def reel_cover():
    W,H=1080,1920
    b = vignette(W,H)+grid(W,H,54,0.14)
    # grid-safe zone: IG profile grid crops reels to a centered 3:4 (1080x1440)
    b += tape_strip(0, 300, W, 64, "LORE 001   RISK & SIZING", size=21)
    for i,l in enumerate(["The Pit:","−50% needs","+100%"]):
        b += text_path(l,'display9',140,72,560+i*146, fill=C['sodium'] if i==2 else C['tape'])
    b += pit_visual(150,1020,780)
    return svg(W,H,b)

def legend_front(name="Jesse Livermore", no="01", era="1890s – 1940", markets="Stocks, commodities",
                 edge="Act only when price confirms at the pivotal point.", habit="Add to winners. Never average a loser.",
                 read="How to Trade in Stocks (1940)", pillar="setups", emblem=None, bleed=False):
    # 2.5x3.5in @300dpi = 750x1050 trim; print file adds 0.125in bleed each side = 825x1125
    TW,TH=750,1050; bl=37.5 if bleed else 0; W,H=TW+2*bl,TH+2*bl
    o=bl; r=0 if bleed else 34
    b = f'<rect width="{W}" height="{H}" rx="{r}" fill="{C["prussian"]}"/>'
    b += f'<g clip-path="url(#cc)">'+grid(int(W),int(H),30,0.18)+'</g>' if False else ''
    b += f'<rect x="{o+22}" y="{o+22}" width="{TW-44}" height="{TH-44}" rx="22" fill="none" stroke="{C["sodium"]}" stroke-width="3"/>'
    b += tape_strip(o+22, o+52, TW-44, 46, f"LEGEND {no}   {era.upper()}", size=15)
    # emblem area
    cx,cy=o+TW/2,o+300
    b += f'<circle cx="{cx}" cy="{cy}" r="150" fill="{C["abyss"]}" stroke="{C["blueline"]}" stroke-width="3"/>'
    b += (emblem(cx,cy) if emblem else livermore_emblem(cx,cy))
    b += text_path(name.upper(),'display9',78,cx,o+540,anchor='middle',fill=C['tape'])
    y=o+600
    for lab,val in [("Markets",markets),("Edge",edge),("Habit",habit),("Key read",read)]:
        b += text_path(lab,'mono6',15,o+62,y,fill=C['sodium'])
        for j,l in enumerate(wrap_lines(val,'body',27,TW-150)):
            b += text_path(l,'body',27,o+62,y+36+j*34,fill=C['tape'])
        y += 36+34*len(wrap_lines(val,'body',27,TW-150))+26
    b += glyph(pillar,0.30,o+TW-62-77,o+TH-62-70)
    b += text_path("THE TAPE LORE   COUNCIL OF LEGENDS",'mono',12,o+62,o+TH-56,fill=C['mist'])
    return svg(int(W),int(H),b)

def livermore_emblem(cx,cy):
    # Abstract emblem: a long flat line of tape, one decisive step through a pivotal point (diamond).
    b = f'<path d="M{cx-110} {cy+40} H{cx-10} V{cy-40} H{cx+110}" fill="none" stroke="{C["tape"]}" stroke-width="14" stroke-linejoin="round" stroke-linecap="round"/>'
    b += f'<path d="M{cx-10} {cy-62} L{cx+12} {cy-40} L{cx-10} {cy-18} L{cx-32} {cy-40} Z" fill="{C["sodium"]}"/>'
    b += f'<circle cx="{cx}" cy="{cy}" r="120" fill="none" stroke="{C["blueline"]}" stroke-width="2" stroke-dasharray="3 10"/>'
    return b

def legend_back(bleed=False):
    TW,TH=750,1050; bl=37.5 if bleed else 0; W,H=TW+2*bl,TH+2*bl; o=bl
    b = f'<rect width="{W}" height="{H}" rx="{0 if bleed else 34}" fill="{C["abyss"]}"/>'
    # repeating tripwire pattern
    for row in range(-1,14):
        y=o+row*86+40
        b += f'<path d="M0 {y} H{W}" stroke="{C["blueline"]}" stroke-width="2" opacity="0.5"/>'
    b += f'<rect x="{o+22}" y="{o+22}" width="{TW-44}" height="{TH-44}" rx="22" fill="none" stroke="{C["sodium"]}" stroke-width="3"/>'
    b += f'<circle cx="{o+TW/2}" cy="{o+TH/2-40}" r="190" fill="{C["prussian"]}" stroke="{C["blueline"]}" stroke-width="3"/>'
    k=0.6; b += mark(k, o+TW/2-257*k, o+TH/2-40-236*k, sw=40)
    b += text_path("THE TAPE LORE",'display9',64,o+TW/2,o+TH-170,anchor='middle',fill=C['tape'])
    b += text_path("Council of Legends",'body',28,o+TW/2,o+TH-122,anchor='middle',fill=C['mist'])
    return svg(int(W),int(H),b)

if __name__=="__main__":
    save("youtube/thumbnail-sample-1280x720", youtube_thumb())
    save("instagram/post-sample-1080x1350", ig_post())
    save("instagram/reel-cover-sample-1080x1920", reel_cover())
    save("cards/legend-card-front-sample-livermore-750x1050", legend_front())
    save("cards/legend-card-back-750x1050", legend_back())
    save("cards/print/legend-card-front-sample-livermore-PRINT-825x1125-bleed", legend_front(bleed=True))
    save("cards/print/legend-card-back-PRINT-825x1125-bleed", legend_back(bleed=True))
    print("ok")
