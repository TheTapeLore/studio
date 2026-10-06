from brand import C
import math
# Pillar glyphs — drawn in a 256 box. Line = tape, accent = sodium. Each returns SVG body.
def _g(body, k, ox, oy):
    return f'<g transform="translate({ox},{oy}) scale({k})">{body}</g>'
SW = 14
def st(c, w=SW, extra=''):
    return f'fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" {extra}'

def map_route(L, A):   # Start here / the Map: seven stages on one route
    pts=[(40,200),(84,156),(132,178),(166,124),(212,140),(218,86),(178,52)]
    d="M"+" L".join(f"{x},{y}" for x,y in pts)
    dots="".join(f'<circle cx="{x}" cy="{y}" r="{17 if i==0 else 11}" fill="{A if i==0 else C["prussian"]}" stroke="{A if i==0 else L}" stroke-width="7"/>' for i,(x,y) in enumerate(pts))
    return f'<path d="{d}" {st(C["blueline"],7)}/>'+dots
def conditions(L, A):  # Market weather: wind lines, one becomes a tailwind
    return (f'<path d="M30 84 H160 a26 26 0 1 0 -26 -26" {st(L)}/>'
            f'<path d="M58 136 H226" {st(L)}/>'
            f'<path d="M30 188 H128" {st(L)}/><path d="M156 188 H222 M200 166 L222 188 L200 210" {st(A)}/>')
def selection(L, A):   # The race: one leader pulls ahead
    return (f'<path d="M28 70 H228 M28 128 H228 M28 186 H228" {st(C["blueline"],6)}/>'
            f'<circle cx="196" cy="70" r="19" fill="{A}"/><path d="M118 70 H160" {st(A,10)}/>'
            f'<circle cx="122" cy="128" r="17" fill="{L}"/><circle cx="96" cy="186" r="17" fill="{L}"/>')
def setups(L, A):      # Anatomy: cup with handle under the pivot wire
    return (f'<path d="M22 92 H234" {st(A,10)}/>'
            f'<path d="M30 92 C 44 196, 152 196, 166 100 L 180 128 L 196 112 L 230 52" {st(L)}/>')
def risk(L, A):        # The R-tower: small losses below, one tall winner above
    base=150; b=''
    for i,x in enumerate((30,64,98)):
        b+=f'<rect x="{x}" y="{base+8}" width="26" height="26" rx="4" fill="none" stroke="{C["ember"]}" stroke-width="8"/>'
    for j in range(4):
        b+=f'<rect x="170" y="{base-8-26-j*32}" width="40" height="26" rx="4" fill="{A}"/>'
    b+=f'<path d="M20 {base} H236" {st(L,8)}/>'
    return b
def exits(L, A):       # Trailing stop: price curve with a stepped trail beneath
    return (f'<path d="M26 206 C 90 196, 120 150, 150 120 S 206 60, 232 40" {st(L)}/>'
            f'<path d="M26 230 H82 V198 H130 V160 H172 V118 H214" {st(A,10)}/>')
def leverage(L, A):    # The throttle: gauge with a redline
    cx,cy,r=128,170,98
    def pt(a,rr): return (cx+rr*math.cos(math.radians(a)), cy-rr*math.sin(math.radians(a)))
    x1,y1=pt(180,r); x2,y2=pt(40,r); x3,y3=pt(0,r)
    ticks="".join(f'<path d="M{pt(a,r-30)[0]:.1f} {pt(a,r-30)[1]:.1f} L{pt(a,r-14)[0]:.1f} {pt(a,r-14)[1]:.1f}" {st(L,6)}/>' for a in (150,120,90,60))
    nx,ny=pt(64,r-34)
    return (f'<path d="M{x1:.1f} {y1:.1f} A{r} {r} 0 0 1 {x2:.1f} {y2:.1f}" {st(L)}/>'
            f'<path d="M{x2:.1f} {y2:.1f} A{r} {r} 0 0 1 {x3:.1f} {y3:.1f}" {st(C["ember"])}/>'+ticks+
            f'<path d="M{cx} {cy} L{nx:.1f} {ny:.1f}" {st(A,12)}/><circle cx="{cx}" cy="{cy}" r="14" fill="{A}"/>')
def operator(L, A):    # The inner chart: price and emotion, out of phase
    def wave(ph, amp, y0):
        pts=[(x, y0 - amp*math.sin((x-24)/208*2*math.pi*1.25+ph)) for x in range(24,233,4)]
        return "M"+" L".join(f"{x:.1f},{y:.1f}" for x,y in pts)
    return (f'<path d="{wave(0,46,104)}" {st(L)}/>'
            f'<path d="{wave(math.pi,30,190)}" {st(A,10,"stroke-dasharray=\"1 18\"")}/>')
def legends(L, A):     # The Council: seats in an arc around one question
    seats=""
    for i,a in enumerate((168,138,108,72,42,12)):
        x=128+96*math.cos(math.radians(a)); y=196-96*math.sin(math.radians(a))
        seats+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="16" fill="{C["prussian"]}" stroke="{L}" stroke-width="8"/>'
    return seats+f'<path d="M128 214 L146 196 L128 178 L110 196 Z" fill="{A}"/><path d="M96 232 H160" {st(L,8)}/>'
GLYPHS = dict(map=map_route, conditions=conditions, selection=selection, setups=setups, risk=risk,
              exits=exits, leverage=leverage, operator=operator, legends=legends)
NAMES = dict(map="Start here", conditions="Market conditions", selection="Selection", setups="Setups",
             risk="Risk & sizing", exits="Exits", leverage="Leverage", operator="The Operator", legends="Legends")
def glyph(name, k=1, ox=0, oy=0, L=None, A=None):
    return _g(GLYPHS[name](L or C['tape'], A or C['sodium']), k, ox, oy)
