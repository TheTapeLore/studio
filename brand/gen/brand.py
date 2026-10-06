import math, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

C = dict(prussian="#0F2A47", abyss="#081A2E", blueline="#2F5D8A", tape="#EAF0F2",
         sodium="#FFB21A", ember="#E8574F", lichen="#7FD1B0", mist="#9DB4C8")
FD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "fonts") + "/"
FONTS = {"display": FD+"big-shoulders-display-800.ttf", "display9": FD+"big-shoulders-display-900.ttf",
         "display5": FD+"big-shoulders-display-500.ttf", "display7": FD+"big-shoulders-display-700.ttf",
         "mono": FD+"martian-mono-400.ttf", "mono6": FD+"martian-mono-600.ttf", "mono3": FD+"martian-mono-300.ttf",
         "body": FD+"atkinson-hyperlegible-next-400.ttf", "body7": FD+"atkinson-hyperlegible-next-700.ttf"}
_cache = {}
def font(k):
    if k not in _cache: _cache[k] = TTFont(FONTS[k])
    return _cache[k]

def text_width(s, fk, size, tracking=0):
    f = font(fk); upm = f['head'].unitsPerEm; cmap = f.getBestCmap(); hmtx = f['hmtx']
    w = 0
    for ch in s:
        g = cmap.get(ord(ch)); 
        if g is None: g = cmap.get(ord('?'))
        w += hmtx[g][0] * size / upm + tracking
    return w - (tracking if s else 0)

def text_path(s, fk, size, x, y, anchor="start", tracking=0, fill="#fff", opacity=None):
    """Return an outlined <path> for text (baseline at y)."""
    f = font(fk); upm = f['head'].unitsPerEm; gs = f.getGlyphSet(); cmap = f.getBestCmap(); hmtx = f['hmtx']
    W = text_width(s, fk, size, tracking)
    if anchor == "middle": x -= W/2
    elif anchor == "end": x -= W
    sc = size / upm; d = []
    cx = x
    for ch in s:
        g = cmap.get(ord(ch)) or cmap.get(ord('?'))
        pen = SVGPathPen(gs)
        tp = TransformPen(pen, (sc, 0, 0, -sc, cx, y))
        gs[g].draw(tp)
        d.append(pen.getCommands())
        cx += hmtx[g][0]*sc + tracking
    op = f' opacity="{opacity}"' if opacity is not None else ''
    return f'<path d="{" ".join(d)}" fill="{fill}"{op}/>'

def spiral_pts(cx, cy, R, turns=1.75, r0=6, n=220):
    """Spiral whose OUTER end sits at bottom (cx, cy+R) heading right."""
    T = 2*math.pi*turns; k = (R - r0)/T; pts = []
    for i in range(n+1):
        t = i/n; phi = math.pi/2 + T*(1-t)      # from inner to outer
        r = r0 + k*(T*t)
        pts.append((cx + r*math.cos(phi), cy + r*math.sin(phi)))
    return pts

def mark_paths(s=512, stroke=None, line=None, wire=None, bg=None, ox=0, oy=0, sw=None, simple=False):
    """The TapeLore mark: a scroll (lore) unrolls into tape that contracts and breaks out through the sodium tripwire.
    Drawn in a 512 box, scaled by s/512."""
    k = s/512.0
    line = line or C['tape']; wire = wire or C['sodium']
    sw = sw or 30
    cx, cy, R = 150, 262, 92
    pts = spiral_pts(cx, cy, R, turns=1.6 if not simple else 1.25, r0=14)
    ybase = cy + R
    # tape leaving the scroll, then a 3-step contraction (VCP), then breakout
    tail = [(222, ybase), (262, ybase), (300, 222), (338, 300), (366, 246), (390, 284), (408, 258)]
    brk = [(408, 258), (470, 108)]
    def P(ps): return " ".join(("M" if i==0 else "L")+f"{ox+x*k:.2f},{oy+y*k:.2f}" for i,(x,y) in enumerate(ps))
    out = []
    if bg: out.append(bg)
    wy = 246
    out.append(f'<line x1="{ox+300*k:.2f}" y1="{oy+wy*k:.2f}" x2="{ox+492*k:.2f}" y2="{oy+wy*k:.2f}" stroke="{wire}" stroke-width="{sw*0.42*k:.2f}" stroke-linecap="round"/>')
    out.append(f'<path d="{P(pts+tail)}" fill="none" stroke="{line}" stroke-width="{sw*k:.2f}" stroke-linecap="round" stroke-linejoin="round"/>')
    out.append(f'<path d="{P(brk)}" fill="none" stroke="{wire}" stroke-width="{sw*k:.2f}" stroke-linecap="round" stroke-linejoin="round"/>')
    return "\n".join(out)

def svg(w, h, body, bg=None):
    b = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{b}{body}</svg>'
