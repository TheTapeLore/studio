#!/usr/bin/env python3
"""
Song designer + song memory: every Lore gets its own song, and no two songs feel alike.

  python scripts/sound/song.py L0002              -> design (or show) episodes/L0002/song.json, frozen once written
  python scripts/sound/song.py --audit            -> variety report across every song in the library
  python scripts/sound/song.py --preview risk 4   -> design 4 hypothetical next songs for a pillar (nothing written)

The signature (constant across the channel)
  - the SONIC LOGO: the mark's price path as nine notes (three shrinking dips, then the breakout), played in each song's
    own key and mode on the end card while the mark draws, the breakout note landing on the wire snap
  - the grammar: every hook's phrases end with a breakout leap on a downbeat; losses fall in key, depth darkens the
    chords and withholds the breakout, climbs build and drop, the rule is the chorus
  - the palette and the mix (synthesised drums, pump, -14 LUFS master)
The song (new every episode)
  key and mode · tempo within the pillar's range · four-chord progression · the hook melody · drum groove · lead,
  bass and arp patches · swing

How a hook is written (songwriting rules, so every hook is catchy by construction)
  motif     one bar: a rhythm cell + a contour from a curated bank (dips, leap-and-walk, climb, pedal, turn, hop ...),
            strong 16ths (0 and 8) land on chord tones; it is written in scale degrees, so it always fits the mode
  phrase    two bars: the motif, then the BREAKOUT: a leap of at least 4 semitones to the phrase's highest note on the
            next downbeat, then a walk down to a long cadence note
  form      8 bars = A A' B A'': A' is A sequenced onto chords 3-4 (literal repeat when it fits), B contrasts (new
            rhythm, inverted or new contour, higher: its breakout is the song's peak), A'' is A' landing near the tonic
Song memory (the registry for music): a new song must differ from the last 3 in key+mode, the last 4 in progression,
  the last 2 in lead patch, the previous one in groove+tempo, and its hook must score < 0.55 similarity against EVERY
  earlier hook (interval contour + rhythm onsets).
"""
import glob, hashlib, json, os, sys
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

MODES = {
    "minor": [0, 2, 3, 5, 7, 8, 10],
    "dorian": [0, 2, 3, 5, 7, 9, 10],
    "major": [0, 2, 4, 5, 7, 9, 11],
    "mixolydian": [0, 2, 4, 5, 7, 9, 10],
}
KEY_NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]

# pillar sound: genre, frame-friendly tempos at 30 fps (frames per beat 16, 15, 14, 20, 18, 10.5), modes, grooves, patches
_ALL = dict(leads=["pluck", "supersaw", "square", "bell", "glide"], basses=["rolling", "octave", "syncopated", "sub"],
            arps=["up", "updown", "broken", "none"])
PILLARS = {
    "risk":       dict(genre="melodic house", bpms=[112.5, 120.0, 1800 / 14], modes=["minor", "dorian"],
                       grooves=["four", "four-ghost", "four-broken"], **_ALL),
    "setups":     dict(genre="melodic techno", bpms=[120.0, 1800 / 14], modes=["minor", "dorian", "mixolydian"],
                       grooves=["four", "four-ghost", "four-broken"], **_ALL),
    "selection":  dict(genre="garage house", bpms=[120.0, 1800 / 14], modes=["dorian", "major", "minor"],
                       grooves=["garage", "four-broken"], **_ALL),
    "exits":      dict(genre="deep house", bpms=[112.5, 120.0], modes=["minor", "major", "dorian"],
                       grooves=["four", "four-ghost"], **_ALL),
    "conditions": dict(genre="breaks", bpms=[112.5, 120.0], modes=["dorian", "minor"], grooves=["breaks", "four-broken"], **_ALL),
    "leverage":   dict(genre="liquid drum & bass", bpms=[1800 / 10.5], modes=["minor", "dorian"], grooves=["dnb", "dnb-roll"],
                       leads=_ALL["leads"], basses=["sub", "octave", "syncopated"], arps=_ALL["arps"]),
    "operator":   dict(genre="lo-fi hip hop", bpms=[90.0, 100.0], modes=["dorian", "major", "minor"], grooves=["hiphop", "hiphop-lazy"],
                       leads=["bell", "glide", "square", "pluck"], basses=["sub", "syncopated"], arps=["broken", "none", "updown"]),
    "legends":    dict(genre="boom bap", bpms=[90.0, 100.0], modes=["minor", "dorian"], grooves=["hiphop", "hiphop-lazy"],
                       leads=["bell", "square", "pluck", "glide"], basses=["sub", "syncopated"], arps=["broken", "none"]),
}

# progressions as scale degrees (0 = tonic). Specials: "V" (major dominant), "bII", "iv" (borrowed minor iv), "bVI", "bVII"
PROGRESSIONS = {
    "minor": [[0, 5, 2, 6], [0, 3, 6, 2], [0, 6, 5, 6], [5, 6, 0, 0], [0, 2, 6, 3], [0, 5, 3, "V"], [3, 0, 6, 5], [0, 3, 5, "V"]],
    "dorian": [[0, 3, 0, 3], [0, 6, 3, 0], [0, 4, 6, 3], [3, 6, 0, 0], [0, 2, 3, 6]],
    "major": [[0, 4, 5, 3], [5, 3, 0, 4], [0, 5, 3, 4], [3, 0, 4, 5], [0, 2, 3, 4], [0, 3, "iv", 0]],
    "mixolydian": [[0, "bVII", 3, 0], [0, 3, "bVII", 3], [0, 4, "bVII", 3]],
}
SPECIAL_ROOT_DEG = {"V": 4, "bII": 1, "iv": 3, "bVI": 5, "bVII": 6}   # nearest diatonic degree, for melody writing

# one-bar rhythm cells in 16ths: (onset, length). "open" cells carry the motif, "close" cells start on the downbeat
# (the breakout) and resolve on a long note.
CELLS_OPEN = [
    [(0, 3), (3, 3), (6, 2), (8, 4), (12, 4)],
    [(0, 2), (2, 2), (4, 4), (10, 2), (12, 4)],
    [(0, 3), (3, 1), (4, 4), (8, 3), (11, 5)],
    [(2, 2), (4, 2), (6, 4), (10, 2), (12, 4)],
    [(0, 2), (3, 3), (6, 2), (8, 2), (11, 5)],
    [(0, 2), (2, 4), (6, 2), (8, 2), (10, 2), (12, 4)],
    [(0, 3), (3, 3), (6, 4), (10, 2), (12, 2), (14, 2)],
    [(0, 4), (4, 2), (6, 2), (8, 3), (11, 5)],
    [(0, 3), (3, 3), (6, 2), (8, 2), (10, 2), (12, 4)],
    [(3, 3), (6, 2), (8, 3), (11, 3), (14, 2)],
]
CELLS_CLOSE = [
    [(0, 6), (6, 2), (8, 8)],
    [(0, 4), (4, 4), (8, 8)],
    [(0, 3), (3, 3), (6, 10)],
    [(0, 10), (10, 2), (12, 4)],
    [(0, 6), (6, 4), (10, 6)],
    [(0, 3), (3, 3), (6, 2), (8, 8)],
]
# motif contours in scale steps (cycled to the cell's length)
CONTOURS = {
    "dips":       [-3, 2, -1, 2, -1],
    "leap-walk":  [4, -1, -1, -1, 1],
    "climb":      [1, 1, 2, -1, -1],
    "pedal":      [2, -2, 3, -3, 2],
    "turn":       [1, -1, -1, 2, -1],
    "fall-rise":  [-1, -1, 3, -1, -1],
    "arpeggio":   [2, 2, -2, 3, -1],
    "call":       [0, 2, -1, -1, 2],
    "hop":        [-2, 4, -1, -2, 1],
    "zigzag":     [2, -1, 2, -1, -2],
}

# The sonic logo (the L0001 hook's first phrase = the mark's price path), in scale degrees: (degree, bar, step, len).
# It sounds in every song's own key and mode; index 6 is the breakout, on the wire snap.
LOGO = [(4, 0, 0, 3), (0, 0, 3, 3), (3, 0, 6, 2), (1, 0, 8, 2), (3, 0, 10, 2), (2, 0, 12, 4), (7, 1, 0, 10), (6, 1, 10, 2), (4, 1, 12, 4)]
LOGO_BREAKOUT = 6
LOGO_CHORDS = [0, 5]                 # tonic, then the sixth (i VI / I vi): the breakout note is a chord tone of both


def deg2semis(d, mode):
    return 12 * (d // 7) + MODES[mode][d % 7]


def logo_notes(mode):
    return [{"bar": b, "step": s, "len": ln, "semis": deg2semis(d, mode), "breakout": i == LOGO_BREAKOUT}
            for i, (d, b, s, ln) in enumerate(LOGO)]


def logo_vertex_beats():
    """End card: the mark's seven vertices drawn on the logo's first six notes; the last segment is timed so the line
    crosses the wire exactly on the breakout downbeat (beat 4)."""
    tok = json.load(open(os.path.join(ROOT, "brand", "tokens.json")))
    pts, wy = tok["mark"]["price_path_512"], tok["mark"]["wire_y_512"]
    f = (pts[-2][1] - wy) / (pts[-2][1] - pts[-1][1])
    on = [b * 4 + s / 4 for _, b, s, _ in LOGO[:6]]
    return on + [on[-1] + (4.0 - on[-1]) / f]


def chord(mode, deg):
    """Chord spec: {name, offs: root/3rd/5th/top from the key tonic, scale: melody pitch classes}. Root within -4..+7.
    Dominant-quality sevenths are kept only where they resolve (the "V" special); other major chords double the root."""
    sc = MODES[mode]
    specials = {
        "V": ("V", [7, 11, 14, 17], [0, 2, 3, 5, 7, 8, 11]),
        "bII": ("bII", [1, 5, 8, 12], [1, 3, 5, 7, 8, 10, 0]),
        "iv": ("iv", [5, 8, 12, 15], MODES["minor"]),
        "bVI": ("bVI", [8, 12, 15, 19], MODES["minor"]),
        "bVII": ("bVII", [10, 14, 17, 22], MODES["mixolydian"]),
    }
    if isinstance(deg, str):
        name, offs, scale = specials[deg]
    else:
        offs = [sc[(deg + k) % 7] + 12 * ((deg + k) // 7) for k in (0, 2, 4, 6)]
        third, seventh = (offs[1] - offs[0]) % 12, (offs[3] - offs[0]) % 12
        if third == 4 and seventh == 10:
            offs[3] = offs[0] + 12
        roman = ["i", "ii", "iii", "iv", "v", "vi", "vii"][deg]
        name = roman.upper() if third == 4 else roman
        scale = sc
    if offs[0] > 7:
        offs = [o - 12 for o in offs]
    return {"name": name, "offs": offs, "scale": scale}


def depth_ladder(mode):
    """Chords from home to darkest, for the pit: minor-ish modes sink to bII then V; major borrows from minor."""
    if mode in ("minor", "dorian"):
        return [0, 5, 3, "bII", "V"]
    return [0, 5, "iv", "bVI", "V"]


def fit(semis, scale):
    """Snap a note to the nearest pitch class of a scale (ties keep the lower)."""
    return min((semis + d for d in range(-2, 3)), key=lambda x: (0 if x % 12 in scale else 1, abs(x - semis)))


# ---------------------------------------------------------------- melody writing (in scale degrees)
def tones(deg):
    rd = SPECIAL_ROOT_DEG.get(deg, deg) if isinstance(deg, str) else deg
    return {rd % 7, (rd + 2) % 7, (rd + 4) % 7}


def nearest_tone(d, deg, lo=-3, hi=10, avoid=None):
    ts = tones(deg)
    cands = [x for x in range(lo, hi + 1) if x % 7 in ts and x != avoid]
    return min(cands, key=lambda x: (abs(x - d), -x))


def motif(cell, contour, start, deg):
    out, d = [], start
    for i, (on, ln) in enumerate(cell):
        if i:
            d += contour[(i - 1) % len(contour)]
        d = max(-3, min(8, d))
        if on in (0, 8):
            d = nearest_tone(d, deg, -3, 8)
        out.append([0, on, ln, d])
    return out


def breakout_bar(cell, prev, high, deg, mode, end_deg):
    """Bar 2 of a phrase: leap (>= 4 semitones, above everything before) to a chord tone on the downbeat, walk down to
    the cadence note."""
    ts = tones(deg)
    ok = lambda x: x % 7 in ts and deg2semis(x, mode) - deg2semis(prev, mode) >= 4
    # the peak stays singable (<= a tenth above the tonic's octave); if B cannot top A there, it matches A's peak
    peak = next((x for x in range(max(prev, high) + 1, 12) if ok(x)), None)
    if peak is None:
        peak = next((x for x in range(max(prev, high), 12) if ok(x)), None)
    if peak is None:
        raise ValueError("no breakout note in range")
    out = [[1, cell[0][0], cell[0][1], peak]]
    rest = cell[1:]
    d = peak
    for j, (on, ln) in enumerate(rest):
        if j == len(rest) - 1:
            d = end_deg
        else:
            left = len(rest) - j
            d = d - max(1, min(2, round((d - end_deg) / left)))
        out.append([1, on, ln, d])
    return out


def write_hook(r, mode, prog):
    """8 bars: A A' B A''. Returns notes {bar, step, len, semis, breakout} and the material used."""
    cell_o = CELLS_OPEN[int(r.integers(len(CELLS_OPEN)))]
    cell_c = CELLS_CLOSE[int(r.integers(len(CELLS_CLOSE)))]
    cell_b = CELLS_OPEN[int(r.integers(len(CELLS_OPEN)))]
    while cell_b == cell_o:
        cell_b = CELLS_OPEN[int(r.integers(len(CELLS_OPEN)))]
    names_ = list(CONTOURS)
    cname = names_[int(r.integers(len(names_)))]
    contour = CONTOURS[cname]
    if r.random() < 0.5:
        bname, bcont = cname + " (inverted)", [-x for x in contour]
    else:
        bname = names_[int(r.integers(len(names_)))]
        bcont = CONTOURS[bname]
    start = nearest_tone([0, 2, 4, 3][int(r.integers(4))], prog[0], -1, 5)

    def phrase(c1, c2, cell1, cont, st, end_deg, high_floor=-99):
        bar1 = motif(cell1, cont, st, c1)
        hi = max(n[3] for n in bar1)
        return bar1 + breakout_bar(cell_c, bar1[-1][3], max(hi, high_floor), c2, mode, end_deg)

    open_end = lambda c: nearest_tone(4, c, 1, 6, avoid=0)
    A = phrase(prog[0], prog[1], cell_o, contour, start, open_end(prog[1]))
    # A': literal repeat over chords 3-4 when its strong notes are chord tones there, else the smallest sequence shift
    strong = [n[3] for n in A if n[0] == 0 and n[1] in (0, 8)]
    shift = min([0, -1, 1, -2, 2, 3, -3], key=lambda s: (sum((x + s) % 7 not in tones(prog[2]) for x in strong), abs(s)))
    A2 = phrase(prog[2], prog[3], cell_o, contour, start + shift, open_end(prog[3]))
    peak_a = max(n[3] for n in A + A2)
    B = phrase(prog[0], prog[1], cell_b, bcont, nearest_tone(start + 3, prog[0], 1, 7), open_end(prog[1]), high_floor=peak_a)
    A3 = [list(x) for x in A2]
    A3[-1][3] = nearest_tone(0 if A3[-2][3] < 4 else 7, prog[3], -2, 8)
    out = []
    for p, notes in enumerate([A, A2, B, A3]):
        hi = next(k for k, n in enumerate(notes) if n[0] == 1)          # the bar-2 downbeat: the breakout leap
        for k, (b, on, ln, d) in enumerate(notes):
            out.append({"bar": p * 2 + b, "step": on, "len": ln, "semis": deg2semis(d, mode), "breakout": k == hi})
    return out, {"motif_cell": cell_o, "close_cell": cell_c, "b_cell": cell_b, "contour": cname, "b_contour": bname}


def _runs(xs):
    out, cur = [], []
    for x in xs:
        if cur and x != cur[-1]:
            out.append(cur)
            cur = []
        cur.append(x)
    return out + ([cur] if cur else [])


def hook_quality(notes):
    """Catchiness heuristics on the hook (bars 1-4): syncopation, stepwise motion, a real breakout leap, a singable
    range, no long runs of the same note, no wild leaps besides the breakout."""
    a = [n for n in notes if n["bar"] < 4]
    iv = [y["semis"] - x["semis"] for x, y in zip(a, a[1:])]
    if not iv:
        return 0.0
    sync = sum(1 for n in a if n["step"] % 4) / len(a)
    rng_ = max(n["semis"] for n in a) - min(n["semis"] for n in a)
    leaps = [y["semis"] - x["semis"] for x, y in zip(a, a[1:]) if y["breakout"]]
    big = sum(1 for x, y in zip(a, a[1:]) if abs(y["semis"] - x["semis"]) > 9 and not y["breakout"])
    rep = max((len(g) for g in _runs([x == 0 for x in iv]) if g[0]), default=0)
    stepwise = sum(1 for x in iv if 0 < abs(x) <= 2) / len(iv)
    return round(0.8 * min(sync, 0.6) + 0.6 * stepwise + (0.4 if leaps and 4 <= min(leaps) <= 9 else 0)
                 + (0.3 if 7 <= rng_ <= 17 else 0) - 0.4 * big - 0.3 * max(0, rep - 1), 3)


def fingerprint(notes):
    """Hook (first 4 bars): interval contour + onset grid within the two-bar phrase."""
    first = [n for n in notes if n["bar"] < 4]
    iv = [b["semis"] - a["semis"] for a, b in zip(first, first[1:])]
    onsets = {(n["bar"] % 2, n["step"]) for n in first}
    return iv, onsets


def similarity(n1, n2):
    iv1, on1 = fingerprint(n1)
    iv2, on2 = fingerprint(n2)
    m = min(len(iv1), len(iv2))
    if m == 0:
        return 0.0
    contour = sum(1 for a, b in zip(iv1[:m], iv2[:m]) if np.sign(a) == np.sign(b) and abs(a - b) <= 1) / max(len(iv1), len(iv2))
    rhythm = len(on1 & on2) / max(1, len(on1 | on2))
    return round(0.6 * contour + 0.4 * rhythm, 3)


# ---------------------------------------------------------------- memory
def library(exclude=None):
    songs = []
    for p in sorted(glob.glob(os.path.join(ROOT, "episodes", "L*", "song.json"))):
        s = json.load(open(p))
        if s.get("id") != exclude:
            songs.append(s)
    return songs


def design(eid, pillar, prior=None, seed_extra=0):
    prior = library(exclude=eid) if prior is None else prior
    recent = prior[-8:]
    P = PILLARS.get(pillar, PILLARS["risk"])
    h = int(hashlib.sha256(f"{eid}:{seed_extra}".encode()).hexdigest()[:12], 16)
    r = np.random.default_rng(h)
    pick = lambda xs: xs[int(r.integers(len(xs)))]
    best = None
    for attempt in range(600):
        mode = pick(P["modes"])
        key = int(r.integers(12))
        prog = pick(PROGRESSIONS[mode])
        bpm = float(pick(P["bpms"]))
        groove, lead, bass, arp = pick(P["grooves"]), pick(P["leads"]), pick(P["basses"]), pick(P["arps"])
        swing = float(np.round(r.uniform(0.06, 0.18) if groove in ("garage", "hiphop", "hiphop-lazy", "breaks") else
                               (r.uniform(0.03, 0.07) if r.random() < 0.4 else 0.0), 3))
        if any(s["key"] == key and s["mode"] == mode for s in recent[-3:]):
            continue
        if any(s["progression"] == prog and s["mode"] == mode for s in recent[-4:]):
            continue
        if any(s["lead"] == lead for s in recent[-2:]):
            continue
        if recent and recent[-1]["groove"] == groove and abs(recent[-1]["bpm"] - bpm) < 1:
            continue
        try:
            notes, material = write_hook(r, mode, prog)
        except ValueError:
            continue
        q = hook_quality(notes)
        sim = max([similarity(notes, s["melody"]) for s in prior] or [0.0])
        if sim >= 0.55:
            continue
        score = q - 0.5 * sim
        if best is None or score > best[0]:
            best = (score, dict(mode=mode, key=key, progression=prog, bpm=bpm, groove=groove, lead=lead, bass=bass, arp=arp,
                                swing=swing, form=["A", "A'", "B", "A''"], chorus_at=4, melody=notes, material=material,
                                hook_quality=q, max_similarity=sim))
        if attempt > 60 and best[0] > 1.3:
            break
    if best is None:
        raise SystemExit("could not design a distinct song: widen PILLARS/PROGRESSIONS")
    s = best[1]
    s.update(id=eid, pillar=pillar, genre=P["genre"], key_name=f"{KEY_NAMES[s['key']]} {s['mode']}",
             designed_by="scripts/sound/song.py", frozen=True)
    return s


def load_or_design(eid, pillar, write=True):
    path = os.path.join(ROOT, "episodes", eid, "song.json")
    if os.path.exists(path):
        return json.load(open(path))
    s = design(eid, pillar)
    if write:
        with open(path, "w") as f:
            json.dump(s, f, indent=1)
    return s


def names(s):
    return [chord(s["mode"], d)["name"] for d in s["progression"]]


def describe(s):
    return (f"{s['id']}: {s['key_name']}, {s['bpm']:.1f} BPM {s['genre']} ({s['groove']}, swing {s['swing']}), "
            f"{' '.join(names(s))}, lead {s['lead']}, bass {s['bass']}, arp {s['arp']}, hook quality "
            f"{s.get('hook_quality', '-')}, max similarity to earlier hooks {s.get('max_similarity', '-')}")


def show_hook(s):
    pc = lambda semis: KEY_NAMES[(s["key"] + semis) % 12]
    for b in range(8):
        ns = [n for n in s["melody"] if n["bar"] == b]
        print(f"   {s['form'][b // 2]:3} bar {b + 1}: " + " ".join(f"{pc(n['semis'])}{'^' if n['breakout'] else ''}" for n in ns))


def audit():
    songs = library()
    for s in songs:
        print(describe(s))
    if len(songs) > 1:
        print("\nhook similarity matrix:")
        for a in songs:
            print(f"  {a['id']}: " + " ".join(f"{similarity(a['melody'], b['melody']):.2f}" if a is not b else " -- " for b in songs))


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    if a[0] == "--audit":
        audit()
    elif a[0] == "--preview":
        pillar, n = a[1], int(a[2]) if len(a) > 2 else 4
        prior = library()
        for i in range(n):
            s = design(f"PREVIEW{i + 1}", pillar, prior=prior)
            print(describe(s))
            show_hook(s)
            prior.append(s)
    else:
        eid = a[0]
        spec = json.load(open(os.path.join(ROOT, "episodes", eid, "spec.json")))
        s = load_or_design(eid, spec["pillar"])
        print(describe(s))
        print(f"   bar = {240 / s['bpm']:.4f}s ({7200 / s['bpm']:.1f} frames at 30 fps): time the spec in whole bars")
        show_hook(s)
