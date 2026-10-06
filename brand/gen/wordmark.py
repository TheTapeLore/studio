from brand import *
from mark import mark
def wordmark(x, y_base, size, fill=None, small=None, tracking_ratio=0.02):
    """'the' in Martian Mono sits above 'TAPE LORE' (Big Shoulders Display 900). y_base = baseline of TAPE LORE."""
    fill = fill or C['tape']; small = small or C['mist']
    big = text_path("TAPE LORE", 'display9', size, x, y_base, tracking=size*tracking_ratio, fill=fill)
    sm = text_path("the", 'mono', size*0.22, x+size*0.02, y_base-size*0.80, fill=small)
    return big+sm, text_width("TAPE LORE",'display9',size,size*tracking_ratio)
def lockup(H, ox=0, oy=0, line=None, wire=None, fill=None, small=None):
    """Horizontal lockup; H = overall height. returns (svg_body, width)"""
    mk = H/512*1.0
    body = mark(mk*0.95, ox, oy+H*0.02, line=line, wire=wire)
    tx = ox + H*1.0
    size = H*0.62
    wm, w = wordmark(tx, oy+H*0.80, size, fill=fill, small=small)
    return body+wm, tx-ox+w
