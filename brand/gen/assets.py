import os, math, sys
sys.path.insert(0, os.path.dirname(__file__))
import cairosvg
from brand import *
from mark import mark
from wordmark import wordmark, lockup
from glyphs import glyph, GLYPHS, NAMES
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")
def save(rel, s, png=True, w=None):
    p = os.path.join(OUT, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p+".svg","w").write(s)
    if png: cairosvg.svg2png(bytestring=s.encode(), write_to=p+".png", output_width=w)
def grid(W, H, step=60, op=0.22):
    g = "".join(f'<path d="M{x} 0 V{H}"/>' for x in range(0, W+1, step)) + "".join(f'<path d="M0 {y} H{W}"/>' for y in range(0, H+1, step))
    return f'<g stroke="{C["blueline"]}" stroke-width="1" opacity="{op}">{g}</g>'
def vignette(W,H):
    return (f'<defs><radialGradient id="v" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="{C["prussian"]}"/>'
            f'<stop offset="1" stop-color="{C["abyss"]}"/></radialGradient></defs><rect width="{W}" height="{H}" fill="url(#v)"/>')
def mark_centered(sz, scale=0.84, line=None, wire=None, sw=36):
    k = sz/512*scale; ox = sz/2-257*k; oy = sz/2-236*k
    return mark(k, ox, oy, line=line, wire=wire, sw=sw)
def macro_chart(W, H, y_wire, x0, x1, amp, op=0.55, wire_op=0.9, sw=6):
    """Large faint echo of the mark: contraction then breakout across a canvas."""
    xs = [0, .14, .30, .42, .53, .61, .80]; ys = [0.25, 1.0, 0.32, 0.72, 0.36, 0.55, -2.4]
    pts = [(x0+(x1-x0)*a, y_wire+amp*b) for a,b in zip(xs,ys)]
    d = "M"+" L".join(f"{x:.0f},{y:.0f}" for x,y in pts)
    (xa,ya),(xb,yb) = pts[-2], pts[-1]; X = xa+(xb-xa)*(ya-y_wire)/(ya-yb); g=26
    wire = (f'<path d="M0 {y_wire} H{X-g-22:.0f} q16 0 20 -16" fill="none" stroke="{C["sodium"]}" stroke-width="{sw*0.7}" stroke-linecap="round" opacity="{wire_op}"/>'
            f'<path d="M{X+g+2:.0f} {y_wire-16} q4 16 20 16 H{W}" fill="none" stroke="{C["sodium"]}" stroke-width="{sw*0.7}" stroke-linecap="round" opacity="{wire_op}"/>')
    return wire+f'<path d="{d}" fill="none" stroke="{C["blueline"]}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round" opacity="{op}"/>'
def tape_strip(x, y, w, h, text, size=None, fill=None, ink=None, tracking=None):
    fill = fill or C['tape']; ink = ink or C['prussian']; size = size or h*0.36
    tracking = size*0.18 if tracking is None else tracking
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}"/>'
            + text_path(text, 'mono6', size, x+h*0.6, y+h*0.5+size*0.36, tracking=tracking, fill=ink))
PILLAR_TAPE = "CONDITIONS     SELECTION     SETUPS     RISK     EXITS     LEVERAGE     THE OPERATOR     LEGENDS     "

def build():
    # ---------- LOGO ----------
    save("logo/mark-on-prussian-1024", svg(1024,1024, f'<rect width="1024" height="1024" fill="{C["prussian"]}"/>'+mark_centered(1024)))
    save("logo/mark-transparent-for-dark-bg-1024", svg(1024,1024, mark_centered(1024)))
    save("logo/mark-transparent-for-light-bg-1024", svg(1024,1024, mark_centered(1024, line=C['prussian'], wire="#D98E00")))
    save("logo/mark-mono-white-1024", svg(1024,1024, mark_centered(1024, line="#FFFFFF", wire="#FFFFFF")))
    H=240; body,w = lockup(H, 60, 60); W=int(w+120); HH=H+120
    save("logo/lockup-on-prussian", svg(W,HH, f'<rect width="{W}" height="{HH}" fill="{C["prussian"]}"/>'+body))
    save("logo/lockup-transparent-for-dark-bg", svg(W,HH, body))
    b2,_ = lockup(H, 60, 60, line=C['prussian'], wire="#D98E00", fill=C['prussian'], small=C['blueline'])
    save("logo/lockup-transparent-for-light-bg", svg(W,HH, b2))
    # ---------- PROFILE (X / IG / YT / all) ----------
    av = svg(1080,1080, vignette(1080,1080)+mark_centered(1080, scale=0.64, sw=44))
    save("profile/avatar-1080", av)
    # ---------- X HEADER 1500x500 ----------
    W,H = 1500,500
    b = vignette(W,H)+grid(W,H,50,0.18)+macro_chart(W,H,y_wire=250,x0=-60,x1=1120,amp=125,op=0.5,wire_op=0.6,sw=8)
    lk,lw = lockup(130, 0, 0)
    lx = 1500-80-lw; ly = 120
    b += f'<g transform="translate({lx:.0f},{ly})">{lk}</g>'
    b += text_path("Drawn from data, not hindsight.", 'body', 34, 1500-80, ly+205, anchor='end', fill=C['tape'])
    b += tape_strip(0, 404, W, 46, PILLAR_TAPE*2, size=15)
    save("x/x-header-1500x500", svg(W,H,b))
    # ---------- YOUTUBE BANNER 2560x1440 (safe area 1546x423 centered) ----------
    W,H = 2560,1440; sx,sy,sw_,sh = (W-1546)/2, (H-423)/2, 1546, 423
    b = vignette(W,H)+grid(W,H,80,0.16)+macro_chart(W,H,y_wire=720,x0=-80,x1=1500,amp=300,op=0.42,wire_op=0.5,sw=12)
    lk,lw = lockup(170,0,0)
    b += f'<g transform="translate({W/2-lw/2:.0f},{sy+40:.0f})">{lk}</g>'
    b += text_path("Drawn from data, not hindsight.", 'body', 46, W/2, sy+300, anchor='middle', fill=C['tape'])
    b += tape_strip(0, sy+sh-62, W, 56, PILLAR_TAPE*3, size=18)
    save("youtube/youtube-banner-2560x1440", svg(W,H,b))
    # guide overlay version (not for upload)
    g = b + f'<rect x="{sx}" y="{sy}" width="{sw_}" height="{sh}" fill="none" stroke="#ff00ff" stroke-width="4" stroke-dasharray="20 12"/>'
    save("youtube/_guide-banner-safe-area-DO-NOT-UPLOAD", svg(W,H,g))
    # ---------- YOUTUBE WATERMARK 150 ----------
    wm = svg(150,150, f'<circle cx="75" cy="75" r="75" fill="{C["prussian"]}" opacity="0.92"/>'+mark_centered(150, scale=0.70, sw=46))
    save("youtube/youtube-watermark-150", wm)
    # ---------- VIDEO BUGS (transparent overlays for Remotion) ----------
    save("video/bug-mark-256", svg(256,256, mark_centered(256, scale=0.9, sw=44)))
    lk,lw = lockup(110,24,24); save("video/bug-lockup", svg(int(lw+48),158, lk))
    # ---------- GLYPHS ----------
    for n in GLYPHS:
        save(f"glyphs/{n}", svg(256,256, glyph(n)))
        save(f"glyphs/{n}-on-prussian", svg(256,256, f'<rect width="256" height="256" rx="40" fill="{C["prussian"]}"/>'+glyph(n,0.8,25.6,25.6)))
    # ---------- INSTAGRAM HIGHLIGHT COVERS 1080x1920 ----------
    for n in GLYPHS:
        W,H=1080,1920
        b = vignette(W,H)+f'<circle cx="540" cy="960" r="400" fill="{C["prussian"]}" stroke="{C["blueline"]}" stroke-width="3"/>'+glyph(n, 2.3, 540-128*2.3, 960-128*2.3)
        save(f"instagram/highlight-{n}-1080x1920", svg(W,H,b))
build()
print("ok")
