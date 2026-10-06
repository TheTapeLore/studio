from brand import C
# Mark v3: "The Snapped Tripwire"
# A tape-white price line makes three shrinking pullbacks (volatility contraction) beneath a sodium pivot wire,
# then breaks up through it. The wire snaps: both broken ends recoil upward.
PRICE = [(44,262),(118,420),(196,270),(250,364),(296,284),(330,322),(414,50)]
WY = 232
def cross_x():
    (x1,y1),(x2,y2) = PRICE[-2], PRICE[-1]
    return x1 + (x2-x1)*(y1-WY)/(y1-y2)
def mark(k=1.0, ox=0, oy=0, line=None, wire=None, sw=36, gap=26):
    line = line or C['tape']; wire = wire or C['sodium']
    X = cross_x()
    def p(x,y): return f"{ox+x*k:.2f},{oy+y*k:.2f}"
    w = sw*0.62*k
    # recoiling ends: quadratic curl upward
    L = f'<path d="M{p(18,WY)} L{p(X-gap-30,WY)} Q{p(X-gap-6,WY)} {p(X-gap-2,WY-22)}" fill="none" stroke="{wire}" stroke-width="{w:.2f}" stroke-linecap="round" stroke-linejoin="round"/>'
    R = f'<path d="M{p(X+gap+2,WY-22)} Q{p(X+gap+6,WY)} {p(X+gap+30,WY)} L{p(496,WY)}" fill="none" stroke="{wire}" stroke-width="{w:.2f}" stroke-linecap="round" stroke-linejoin="round"/>'
    d = " ".join(("M" if i==0 else "L")+p(x,y) for i,(x,y) in enumerate(PRICE))
    P = f'<path d="{d}" fill="none" stroke="{line}" stroke-width="{sw*k:.2f}" stroke-linecap="round" stroke-linejoin="round"/>'
    return L+R+P
BBOX = (12, 38, 500, 436)  # approx visual bbox incl. stroke, in 512 units
