#!/usr/bin/env python3
"""
The Tape Machine v3: every episode gets a song, written around one hook and one continuous groove, and arranged by
the episode's data.

  python scripts/sound/score.py L0001            -> engine/public/score/L0001.wav + episodes/L0001/score.json
  python scripts/sound/score.py L0001 --report   -> bar-by-bar arrangement + loudness only
  python scripts/sound/score.py L0001 --genre leverage   (audition another pillar's sound)

Synthesised with numpy only (no samples, no loops, no licences: compliance rule 9). Deterministic.

Principles (founder feedback on v1 piano and v2 effects: "a score needs a tune and one continuous motion")
  1. A hook you can hum. The channel's melody IS the logo: the mark's price path (tokens.mark: three shrinking dips,
     then the breakout) sung as two bars, answered by a second phrase. It plays from frame 0 and recurs.
  2. One groove that never stops. One tempo, one key, a four-chord loop, a four-on-the-floor pulse with a sidechain
     pump. Story moments change the arrangement (filter, density, chords, fills), never the clock.
  3. The picture sits on the grid. Specs are timed in whole bars; the dig, the arrow, the snap land on beats.
  4. The data writes the arrangement:
       losses   -> a descending bass/tom run that falls 12 semitones per 100% (on the beats before the bar line)
       depth    -> darker chords (Am -> Dm -> Bb -> E), half-time drums, and the hook's BREAKOUT NOTE IS WITHHELD
                   while you are deep: you only hear the melody climb out when the climb succeeds
       climbs   -> a build (riser + snare roll + rising line) that drops on the bar where the arrow lands
       charts   -> a DJ low-pass that follows the drawdown; the tripwire snap is the drop into the chorus
       myths    -> a breakdown (no kick); the math lands with an impact and the groove returns
       rules    -> the full chorus: both hook phrases
       end card -> the breakout note lands on the wire snap; the last bar builds into frame 0 (seamless loop)

Pillar sound (same song engine, different tempo/feel/key):
  risk 120 melodic house (A minor) · setups 128.6 melodic techno · selection 128.6 garage-house · exits 120 deep house ·
  conditions 120 breaks · leverage 171.4 liquid drum & bass · operator 90 lo-fi · legends 90 boom bap
"""
import json, math, os, sys, wave
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SR = 48000
TOKENS = json.load(open(os.path.join(ROOT, "brand", "tokens.json")))
MUSIC_LUFS = -16.0
sys.path.insert(0, os.path.dirname(__file__))
from gen_cues import lufs, true_peak_db, sweep_bp  # same BS.1770 meter as the cues

rng = np.random.default_rng(11)

# ---------------------------------------------------------------- pillar sounds
GENRES = {
    "risk":       dict(name="melodic house", bpm=120.0, key=9, swing=0.0, drums="four"),
    "setups":     dict(name="melodic techno", bpm=1800 / 14, key=4, swing=0.0, drums="four"),
    "selection":  dict(name="garage house", bpm=1800 / 14, key=5, swing=0.14, drums="garage"),
    "exits":      dict(name="deep house", bpm=120.0, key=7, swing=0.08, drums="four"),
    "conditions": dict(name="breaks", bpm=120.0, key=2, swing=0.05, drums="breaks"),
    "leverage":   dict(name="liquid drum & bass", bpm=1800 / 10.5, key=1, swing=0.0, drums="dnb"),
    "operator":   dict(name="lo-fi hip hop", bpm=90.0, key=0, swing=0.2, drums="hiphop"),
    "legends":    dict(name="boom bap", bpm=90.0, key=3, swing=0.12, drums="hiphop"),
}

# chords as scale-relative to the minor key root (A minor for risk): name -> (bass offset, voicing offsets)
CHORDS = {
    "i":   (0, [0, 3, 7, 10]),      # Am7
    "VI":  (-4, [-4, 0, 3, 7]),     # Fmaj7
    "III": (3, [3, 7, 10, 14]),     # Cmaj7
    "VII": (-2, [-2, 2, 5, 10]),    # G
    "iv":  (5, [5, 8, 12, 15]),     # Dm7
    "bII": (1, [1, 5, 8, 12]),      # Bbmaj7 (Neapolitan colour: the darkest)
    "V":   (7, [7, 11, 14, 17]),    # E7 (harmonic minor: wants to resolve)
}
LOOP = ["i", "VI", "III", "VII"]    # Am F C G: the four-chord loop

# The hook, from the logo: (semitones above the key root at octave 5, start beat, length in beats).
# Phrase A = the mark: E-A-D-B-D-C (three shrinking dips) then the breakout up to A. Phrase B answers it.
PHRASE_A = [(7, 0.0, 0.75), (0, 0.75, 0.75), (5, 1.5, 0.5), (2, 2.0, 0.5), (5, 2.5, 0.5), (3, 3.0, 1.0),
            (12, 4.0, 2.5), (10, 6.5, 0.5), (7, 7.0, 1.0)]
PHRASE_B = [(10, 0.0, 0.75), (3, 0.75, 0.75), (8, 1.5, 0.5), (5, 2.0, 0.5), (8, 2.5, 0.5), (7, 3.0, 1.0),
            (5, 4.0, 2.0), (2, 6.0, 2.0)]
BREAKOUT = 12                       # the note that only sounds once you are out of the pit

# chord scales (pitch classes relative to the key root): the hook bends to fit each chord, so dark never means wrong
NAT_MINOR = [0, 2, 3, 5, 7, 8, 10]
CHORD_SCALE = {"i": NAT_MINOR, "VI": NAT_MINOR, "III": NAT_MINOR, "VII": NAT_MINOR, "iv": NAT_MINOR,
               "bII": [1, 3, 5, 7, 8, 10, 0],          # Bb lydian colour inside A minor
               "V": [0, 2, 3, 5, 7, 8, 11]}            # A harmonic minor: G# leads home


def fit(semis, chord):
    """Snap a note (semitones from the key root) to the nearest pitch class of the chord's scale."""
    pcs = CHORD_SCALE.get(chord, NAT_MINOR)
    best = min((semis + d for d in range(-2, 3)), key=lambda x: (0 if x % 12 in pcs else 1, abs(x - semis)))
    return best


class Bar:
    def __init__(self):
        self.chord = None          # None = follow the four-chord loop from the latest anchor
        self.energy = 3            # 0 silent · 1 pad/hats · 2 + kick · 3 + bass/clap · 4 + arp
        self.drums = "full"        # full · half · break · none
        self.melody = None         # (withhold_breakout: bool, gain); phrase = A over i/VI/dark chords, B over III/VII
        self.half = 0              # which bar of the two-bar phrase (from the loop anchor)
        self.label = ""


class Song:
    def __init__(self, dur, g):
        self.g = g
        self.dur = dur
        self.beat = 60 / g["bpm"]
        self.bar = 4 * self.beat
        self.nbars = int(math.ceil(dur / self.bar - 1e-6))
        self.bars = [Bar() for _ in range(self.nbars)]
        self.anchors = {0}         # bars where the loop restarts on i (every drop lands on the tonic)
        self.events = []           # (t, kind, params): fills, risers, impacts, rolls
        self.cutoff = []           # (t0, t1, fn) low-pass automation
        self.ducks = []
        self.cues = []

    def bar_of(self, t):
        return max(0, min(self.nbars - 1, int(t / self.bar + 1e-6)))

    def bars_in(self, t0, t1):
        return range(self.bar_of(t0), self.bar_of(t1 - 1e-3) + 1)

    def ev(self, t, kind, **p):
        self.events.append((t, kind, p))

    def cue(self, t, text):
        self.cues.append({"t": round(t, 2), "bar": self.bar_of(t) + 1, "cue": text})

    def melody(self, t0, t1, phrase_start_bar=None, withhold=False, gain=1.0):
        """The hook over bars [t0, t1). Which phrase and which half follow the chord loop (see finish())."""
        for k in self.bars_in(t0, t1):
            self.bars[k].melody = (withhold, gain)

    def anchor(self, t):
        self.anchors.add(self.bar_of(t))

    def finish(self):
        """Fill loop chords from the latest anchor; set each bar's half of the two-bar phrase."""
        a = 0
        for k, bar in enumerate(self.bars):
            if k in self.anchors:
                a = k
            if bar.chord is None:
                bar.chord = LOOP[(k - a) % 4]
            bar.half = (k - a) % 2


def fmt(x):
    return f"{'+' if x >= 0 else '−'}{abs(x) * 100:.0f}%"


DEPTH_CHORDS = [(0.15, "i"), (0.35, "VI"), (0.6, "iv"), (0.8, "bII"), (1.01, "V")]


def depth_chord(L):
    for th, c in DEPTH_CHORDS:
        if L < th:
            return c
    return "V"


# ---------------------------------------------------------------- interpreters: beats -> arrangement
def fall_fill(S, t_end, L):
    """A descending run ending on the bar line: 12 semitones per 100% of loss, in 16ths (at least two notes)."""
    semis = 12 * L
    n = max(2, min(8, int(round(semis / 1.5))))
    step = S.beat / 4
    for i in range(n):
        S.ev(t_end - (n - i) * step, "fall", semis=-semis * (i + 1) / n, vel=0.55 + 0.4 * i / n)
    S.cue(t_end - n * step, f"loss {fmt(-L)}: {n}-note fall, {semis:.1f} semitones down")


def build(S, t0, t1, label):
    """Riser + snare roll + rising line from t0, dropping at t1 (a bar line)."""
    S.ev(t0, "riser", dur=t1 - t0)
    S.ev(t0, "roll", dur=t1 - t0)
    S.ev(t1, "impact", size=1.0)
    S.ducks.append(t1)
    S.cue(t0, f"{label}: build {(t1 - t0) / S.bar:.1f} bars")
    S.cue(t1, "DROP")


def i_thepit(S, b, t0, t1, data):
    p = b.get("props", {})
    keys = p.get("keys")
    if keys:
        # sweep: each new depth = a fall on the beats before it; deeper = darker chords, half-time, no breakout
        seq = []
        for (ka, la), (kb, lb) in zip(keys, keys[1:]):
            if lb != la:
                seq.append((t0 + kb, lb))
        level = keys[0][1]
        marks = [(t0, level)] + seq
        for j, (ta, L) in enumerate(marks):
            tb = marks[j + 1][0] if j + 1 < len(marks) else t1
            if j:
                fall_fill(S, ta, L)
            for k in S.bars_in(ta, tb):
                bar = S.bars[k]
                bar.chord = depth_chord(L) if L >= 0.35 else None   # shallow: the loop carries on
                bar.energy = 4 if L < 0.3 else 3 if L < 0.6 else 2
                bar.drums = "full" if L < 0.6 else "half"
                bar.label = f"depth {fmt(-L)}"
            S.melody(ta, tb, phrase_start_bar=S.bar_of(t0), withhold=L >= 0.35, gain=1.0 if L < 0.6 else 0.7)
            gain_needed = L / (1 - L)
            S.cue(ta, f"depth {fmt(-L)} -> {depth_chord(L)}, {'full' if L < 0.6 else 'half-time'} drums; climb needs {fmt(gain_needed)}"
                  + ("; hook breakout withheld" if L >= 0.35 else "; hook resolves"))
        last_L = marks[-1][1]
        if last_L >= 0.6:   # the deepest climb never resolves: an endless riser cut by the next section
            S.ev(marks[-1][0], "riser", dur=t1 - marks[-1][0], unresolved=True)
            S.cue(marks[-1][0], f"climb {fmt(last_L / (1 - last_L))}: the riser never lands")
        return
    L = p.get("lossPct", 0.5)
    dig_at, dig_dur = t0 + p.get("digAt", 0.15), p.get("digDur", 0.8)
    climb_at, climb_dur = t0 + p.get("climbAt", 1.05), p.get("climbDur", 0.8)
    if b.get("kind") == "hook":
        for k in S.bars_in(t0, t1):
            S.bars[k].energy, S.bars[k].label = 4, "hook"
        S.melody(t0, t1)
        S.ev(t0, "impact", size=0.7)
        S.cue(t0, "hook: full groove + the logo melody from frame 0")
        return
    floor_bar = S.bar_of(dig_at + dig_dur)
    land = climb_at + climb_dur
    land_bar = S.bar_of(land)
    fall_fill(S, dig_at + dig_dur, L)
    for k in S.bars_in(t0, t1):
        bar = S.bars[k]
        if k < floor_bar:
            bar.energy, bar.label = 3, "set-up"
        elif k < land_bar:
            # what's left: the room empties, the chords go dark, the hook plays without its breakout
            depth_bars = list(range(floor_bar, land_bar))
            pos = depth_bars.index(k)
            bar.chord = ["VI", "iv", "V", "V"][min(pos, 3)] if len(depth_bars) <= 4 else depth_chord(L)
            bar.energy = 1 if pos < len(depth_bars) - 2 else 2
            bar.drums = "break"
            bar.label = "what's left"
        else:
            bar.energy, bar.label = 4, "made it back"
    S.melody(t0, S.bar_of(dig_at + dig_dur) * S.bar, phrase_start_bar=S.bar_of(t0))
    S.melody(floor_bar * S.bar, land_bar * S.bar, phrase_start_bar=floor_bar, withhold=True, gain=0.6)
    S.melody(land_bar * S.bar, t1, phrase_start_bar=land_bar)
    build_start = max((floor_bar + 1) * S.bar, (land_bar - 2) * S.bar)
    build(S, build_start, land_bar * S.bar, f"climb {fmt(L / (1 - L))}")
    S.anchor(land_bar * S.bar)


def i_candlechart(S, b, t0, t1, data):
    p = b.get("props", {})
    bars = (data or {}).get("bars") or []
    if not bars:
        return i_default(S, b, t0, t1, data)
    rev_at, rev_dur = p.get("revealAt", 0.0), p.get("revealDur", 0.0) or 0.001
    n = len(bars)
    closes = np.array([x["c"] for x in bars])
    peak = np.maximum.accumulate(closes)
    tw = p.get("tripwire") or {}
    snap = None
    if tw.get("price"):
        i0 = next((i for i, x in enumerate(bars) if x["t"] >= str(tw.get("from", ""))), 0)
        k = next((i for i in range(i0 + 1, n) if closes[i] > tw["price"]), None)
        if k is not None:
            snap = t0 + rev_at + rev_dur * (k + 1) / n

    def dd_at(t):
        i = min(n - 1, max(0, int((t - t0 - rev_at) / rev_dur * n)))
        return float(1 - closes[i] / peak[i])

    end = snap if snap and snap < t1 else t1
    S.cutoff.append((t0, end, lambda t: max(320.0, 15000.0 * (1 - dd_at(t)) ** 3.0)))
    for k in S.bars_in(t0, end):
        S.bars[k].energy, S.bars[k].label = 3, "chart: filter = drawdown"
    S.melody(t0, end, phrase_start_bar=S.bar_of(t0), withhold=True, gain=0.85)
    worst = max(dd_at(x) for x in np.linspace(t0 + rev_at, end, 80))
    S.cue(t0, f"groove runs through a low-pass that follows the drawdown (deepest {fmt(-worst)} ~ {max(320, 15000 * (1 - worst) ** 3):.0f} Hz)")
    if snap and snap < t1:
        if abs(snap / S.bar - round(snap / S.bar)) > 0.05:
            S.cue(snap, "warning: the snap is not on a bar line (set revealDur so it is)")
        build(S, max(t0, snap - S.bar), snap, "the old high comes back")
        S.anchor(snap)
        for k in S.bars_in(snap, t1):
            S.bars[k].energy, S.bars[k].label = 4, "tripwire snaps: chorus"
        S.melody(snap, t1, phrase_start_bar=S.bar_of(snap))


def i_myth(S, b, t0, t1, data):
    fact = t0 + b.get("props", {}).get("factAt", 1.6)
    for k in S.bars_in(t0, t1):
        bar = S.bars[k]
        if k < S.bar_of(fact):
            bar.energy, bar.drums, bar.label = 1, "break", "myth: breakdown"
            bar.chord = ["iv", "i"][k % 2]
        else:
            bar.energy, bar.label = 3, "the math lands"
    S.melody(t0, fact, phrase_start_bar=S.bar_of(t0), withhold=True, gain=0.6)
    S.melody(fact, t1, phrase_start_bar=S.bar_of(fact))
    S.ev(fact, "impact", size=0.8)
    S.ducks.append(fact)
    S.anchor(fact)
    S.cue(t0, "myth: breakdown, hook without its breakout")
    S.cue(fact, "the math lands: groove back")


def i_rule(S, b, t0, t1, data):
    seq = ["III", "VII", "i", "VI"]
    for j, k in enumerate(S.bars_in(t0, t1)):
        S.bars[k].chord, S.bars[k].energy, S.bars[k].label = seq[j % 4], 4, "chorus: the rule"
    # chorus: C G Am F, so the answer phrase B comes first and the chorus ends on A's breakout
    S.anchor(t0)
    S.melody(t0, t1, gain=1.1)
    S.cue(t0, "chorus: both hook phrases, the breakout lands at the end")


def mark_snap_seconds(draw_at, draw_dur=1.0):
    pts, wy = TOKENS["mark"]["price_path_512"], TOKENS["mark"]["wire_y_512"]
    e = TOKENS["motion"]["ease"]["draw"]
    seg = [math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
    (x1, y1), (x2, y2) = pts[-2], pts[-1]
    frac = (sum(seg[:-1]) + math.dist(pts[-2], (x1 + (x2 - x1) * (y1 - wy) / (y1 - y2), wy))) / sum(seg)

    def bez(x):
        lo, hi = 0.0, 1.0
        for _ in range(40):
            m = (lo + hi) / 2
            bx = 3 * (1 - m) ** 2 * m * e[0] + 3 * (1 - m) * m * m * e[2] + m ** 3
            lo, hi = (m, hi) if bx < x else (lo, m)
        m = (lo + hi) / 2
        return 3 * (1 - m) ** 2 * m * e[1] + 3 * (1 - m) * m * m * e[3] + m ** 3

    lo, hi = 0.0, 1.0
    for _ in range(40):
        m = (lo + hi) / 2
        lo, hi = (m, hi) if bez(m) < frac else (lo, m)
    return draw_at + hi * draw_dur


def i_end(S, b, t0, t1, data):
    """The end card's mark draws over phrase A's dips; its wire snap IS the breakout note on the next downbeat."""
    pr = b.get("props", {})
    if pr.get("vertexAt"):          # the mark is drawn vertex by vertex to the hook's rhythm
        pts, wy = TOKENS["mark"]["price_path_512"], TOKENS["mark"]["wire_y_512"]
        va = pr["vertexAt"]
        f = (pts[-2][1] - wy) / (pts[-2][1] - pts[-1][1])
        snap = t0 + pr.get("drawAt", 0.0) + va[-2] + f * (va[-1] - va[-2])
    else:
        snap = t0 + mark_snap_seconds(pr.get("drawAt", 0.15))
    S.anchor(t0)
    for k in S.bars_in(t0, t1):
        S.bars[k].energy, S.bars[k].label = 3, "end card"
    S.melody(t0, t1)
    S.ev(snap, "impact", size=0.8)
    S.ducks.append(snap)
    on_beat = abs(snap / S.beat - round(snap / S.beat)) < 0.05
    breakout_t = (S.bar_of(t0) + 1) * S.bar
    S.cue(snap, "the wire snaps" + (" on the breakout note" if abs(snap - breakout_t) < 0.05 else f" (breakout note is at {breakout_t:.2f}s{'' if on_beat else '; snap is off the beat'})"))
    loop_build(S, t1)


def loop_build(S, t_end):
    a = t_end - S.bar
    S.ev(a, "roll", dur=S.bar)
    S.ev(a, "riser", dur=S.bar)
    S.cue(a, "loop build: the last bar resolves into frame 0")


def i_default(S, b, t0, t1, data):
    kind = b.get("kind", "build")
    energy = {"hook": 4, "question": 3, "term": 3, "assumptions": 2, "breaks": 4, "reveal": 3, "poll": 1,
              "rule": 4, "lesson": 4, "quote": 2, "story": 2, "runs": 3, "distribution": 3}.get(kind, 3)
    for k in S.bars_in(t0, t1):
        S.bars[k].energy, S.bars[k].label = energy, kind
        if energy <= 2:
            S.bars[k].drums = "break"
    S.melody(t0, t1, withhold=energy <= 2)
    if t0 == 0:
        S.ev(0, "impact", size=0.7)


INTERPRETERS = {"ThePit": i_thepit, "CandleChart": i_candlechart, "Anatomy": i_candlechart, "MythCard": i_myth,
                "RuleCard": i_rule, "EndCard": i_end}
KIND_DEFAULT = {"end": "EndCard", "misconception": "MythCard", "rule": "RuleCard", "the_rule": "RuleCard"}


# ---------------------------------------------------------------- instruments (band-limited, additive)
def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(n):
    return np.arange(n) / SR


def hp(x):
    return np.diff(np.concatenate([[0], x]))


def kick():
    n = int(0.42 * SR)
    t = tt(n)
    f = 48 + 120 * np.exp(-t / 0.03)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.26)
    s += hp(rng.standard_normal(n)) * np.exp(-t / 0.002) * 0.25
    return np.tanh(1.8 * s) * 0.9


def clap():
    n = int(0.4 * SR)
    t = tt(n)
    noise = hp(hp(rng.standard_normal(n)))
    e = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.023]):
        i = int(off * SR)
        e[i:] += np.exp(-t[: n - i] / (0.007 if k < 2 else 0.16))
    body = np.sin(2 * np.pi * 210 * t) * np.exp(-t / 0.04) * 0.4
    return (noise * e * 0.32 + body) * 0.8


def hat(open_=False):
    n = int((0.25 if open_ else 0.05) * SR)
    t = tt(n)
    metal = sum(np.sin(2 * np.pi * f * t + i) for i, f in enumerate((6150, 7230, 8370, 9440))) / 4
    s = hp(hp(rng.standard_normal(n))) * 0.6 + metal * 0.35
    return s * np.exp(-t / (0.085 if open_ else 0.014)) * 0.2


def tom(f0):
    n = int(0.25 * SR)
    t = tt(n)
    f = f0 * (1 + 0.5 * np.exp(-t / 0.02))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.11) * 0.6


def additive(f, n, nh, tilt=1.0, decay=None):
    """Band-limited saw-like tone; `decay` gives a natural filter envelope (high harmonics die first)."""
    t = tt(n)
    s = np.zeros(n)
    for h in range(1, nh + 1):
        if f * h > 14000:
            break
        a = 1 / h ** tilt
        if decay:
            a = a * np.exp(-t * decay * (h - 1))
        s += a * np.sin(2 * np.pi * f * h * t + 0.37 * h)
    return s


def lead_note(m, dur, vel):
    n = int((dur + 0.35) * SR)
    t = tt(n)
    f = mtof(m)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.15) / 0.2, 0, 1)
    tone = additive(f, n, 14, 1.0, decay=3.0) * 0.55 + additive(f * 1.003, n, 8, 1.2, decay=4.0) * 0.35
    tone += np.sin(2 * np.pi * f * 0.5 * np.cumsum(vib) / SR) * 0.25          # sub-octave body
    env = np.minimum(1, t / 0.006) * np.where(t < dur, np.exp(-t / (0.9 + dur)), np.exp(-dur / (0.9 + dur)) * np.exp(-(t - dur) / 0.09))
    return tone * env * vel * 0.32


def pad_chord(notes, dur):
    n = int((dur + 0.4) * SR)
    t = tt(n)
    s = np.zeros(n)
    for m in notes:
        for det in (-0.005, 0.0, 0.005):
            s += additive(mtof(m) * (1 + det), n, 7, 1.3)
    env = np.minimum(1, t / 0.08) * np.minimum(1, np.maximum(0, dur + 0.4 - t) / 0.35)
    return s * env / (3 * len(notes)) * 0.32


def pluck(m, vel=0.5):
    n = int(0.35 * SR)
    t = tt(n)
    return additive(mtof(m), n, 9, 1.0, decay=9.0) * np.exp(-t / 0.12) * vel * 0.3


def bass_note(m, dur, vel=0.8):
    n = int((dur + 0.02) * SR)
    t = tt(n)
    f = mtof(m)
    s = np.sin(2 * np.pi * f * t) + 0.35 * additive(f, n, 6, 1.0, decay=10.0)
    env = np.minimum(1, t / 0.004) * np.exp(-t / 0.35)
    env[-int(0.015 * SR):] *= np.linspace(1, 0, int(0.015 * SR))
    return np.tanh(1.5 * s) * env * vel * 0.5


def impact(size):
    n = int(1.8 * SR)
    t = tt(n)
    f = 32 + 55 * np.exp(-t / 0.1)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.45 * size + 0.2))
    air = hp(rng.standard_normal(n)) * np.exp(-t / (0.6 * size + 0.15)) * 0.18
    return np.tanh(1.3 * (boom + air)) * (0.55 + 0.35 * size)


def riser(dur, unresolved=False):
    n = max(1, int(dur * SR))
    x = np.linspace(0, 1, n)
    noise = sweep_bp(rng.standard_normal(n), 300, 6000, q=1.1)
    env = x ** 1.8
    if unresolved:
        env *= np.minimum(1, (1 - x) / 0.02)
    return noise * env * 0.35


# ---------------------------------------------------------------- render
def place(buf, t, sig, pan=0.0, gain=1.0):
    i = int(round(t * SR))
    if i >= buf.shape[1] or len(sig) == 0:
        return
    if i < 0:
        sig, i = sig[-i:], 0
    j = min(buf.shape[1], i + len(sig))
    lg, rg = math.cos((pan + 1) * math.pi / 4) * 1.414, math.sin((pan + 1) * math.pi / 4) * 1.414
    buf[0, i:j] += sig[: j - i] * lg * gain
    buf[1, i:j] += sig[: j - i] * rg * gain


def stft_lowpass(x, fn):
    nfft, hop = 2048, 512
    win = np.hanning(nfft)
    out = np.zeros_like(x)
    norm = np.zeros(x.shape[1])
    freqs = np.fft.rfftfreq(nfft, 1 / SR)
    for start in range(0, x.shape[1] - nfft, hop):
        c = fn((start + nfft / 2) / SR)
        mask = 1.0 if c is None else 1 / (1 + (freqs / c) ** 4)
        for ch in range(2):
            out[ch, start:start + nfft] += np.fft.irfft(np.fft.rfft(x[ch, start:start + nfft] * win) * mask, nfft) * win
        norm[start:start + nfft] += win ** 2
    norm[norm < 1e-6] = 1
    return out / norm


def delay(x, time_s, fb=0.42, taps=4):
    """Ping-pong echo (dotted eighths): the melody's tail fills the space between notes."""
    out = x.copy()
    d = int(time_s * SR)
    for k in range(1, taps + 1):
        g = fb ** k
        src = x[:, : x.shape[1] - k * d] * g
        if k % 2:
            out[1, k * d:] += src[0]
            out[0, k * d:] += src[1] * 0.4
        else:
            out[0, k * d:] += src[0]
            out[1, k * d:] += src[1] * 0.4
    return out


def reverb(x, seconds=1.8):
    n = x.shape[1]
    ir_n = int(seconds * SR)
    ti = tt(ir_n)
    size = 1 << (n + ir_n).bit_length()
    wet = np.zeros_like(x)
    for c in range(2):
        ir = rng.standard_normal(ir_n) * np.exp(-ti / (seconds / 4.5))
        ir[: int(0.015 * SR)] = 0
        ir = np.convolve(ir, np.ones(6) / 6, mode="same")          # soften the top
        ir /= np.sqrt(np.sum(ir ** 2))
        wet[c] = np.fft.irfft(np.fft.rfft(x[c], size) * np.fft.rfft(ir, size), size)[:n]
    return wet


def render(S):
    g = S.g
    n = int(round(S.dur * SR))
    root = 45 + ((g["key"] - 9) % 12)                 # bass register (A2 = 45 for A minor)
    drums = np.zeros((2, n))
    bass = np.zeros((2, n))
    chords = np.zeros((2, n))
    lead = np.zeros((2, n))
    fx = np.zeros((2, n))
    K, CL, HC, HO = kick(), clap(), hat(), hat(True)
    kicks = []
    step = S.beat / 4

    def swing_t(t, k):
        return t + (g["swing"] * step if k % 2 == 1 else 0.0)

    for bi, bar in enumerate(S.bars):
        t_bar = bi * S.bar
        boff, voicing = CHORDS[bar.chord]
        e = bar.energy
        # --- drums
        for k in range(16):
            t = swing_t(t_bar + k * step, k)
            if t >= S.dur:
                break
            style = g["drums"]
            if bar.drums == "none" or e == 0:
                continue
            kick_steps = {"four": [0, 4, 8, 12], "garage": [0, 7, 10], "breaks": [0, 10], "dnb": [0, 10],
                          "hiphop": [0, 7, 10]}[style]
            snare_steps = [4, 12] if style != "dnb" else [4, 12]
            if bar.drums == "half":
                kick_steps, snare_steps = [0, 10], [8]
            if bar.drums == "break":
                kick_steps, snare_steps = [], []
            if e >= 2 and k in kick_steps:
                place(drums, t, K, 0, 1.0)
                kicks.append(t)
            if e >= 3 and k in snare_steps:
                place(drums, t, CL, 0.05, 0.85)
            if e >= 1:
                if k % 4 == 2:
                    place(drums, t, HO, 0.25, 0.55 if e >= 3 else 0.35)
                elif e >= 3 or k % 2 == 0:
                    place(drums, t, HC, -0.25, 0.32 if k % 2 else 0.22)
        # --- bass: rolling offbeat eighths on the root, an octave jump to keep it moving
        if e >= 3:
            for k in (2, 6, 10, 14):
                bt = t_bar + k * step
                if bt < S.dur:
                    place(bass, bt, bass_note(root + boff + (12 if k == 14 else 0), step * 1.6), 0, 0.9)
        elif e == 2:
            place(bass, t_bar, bass_note(root + boff, S.bar * 0.9, 0.7), 0, 0.9)
        # --- chords: pad every bar; plucked offbeat stabs and a 16th arp at full energy
        notes = [root + 12 + v for v in voicing]
        if e >= 1:
            place(chords, t_bar, pad_chord(notes, min(S.bar, S.dur - t_bar)), 0, 0.85 if e >= 3 else 0.7)
        if e >= 4:
            arp = sorted(notes) + [notes[0] + 12]
            for k in range(16):
                at = t_bar + k * step
                if at < S.dur:
                    place(chords, at, pluck(arp[[0, 2, 1, 3, 4, 2, 3, 1][k % 8]] + 12, 0.35 if k % 2 else 0.5), (-0.4, 0.4)[k % 2], 0.6)
        # --- the hook
        if bar.melody:
            withhold, gain = bar.melody
            half = bar.half
            notes_ph = PHRASE_B if bar.chord in ("III", "VII") else PHRASE_A
            for semis, start, length in notes_ph:
                if half * 4 <= start < half * 4 + 4:
                    if withhold and semis == BREAKOUT:
                        continue                          # still in the pit: the breakout does not sound
                    t = t_bar + (start - half * 4) * S.beat
                    if t < S.dur:
                        place(lead, t, lead_note(root + 24 + fit(semis, bar.chord), length * S.beat * 0.92, 0.85 * gain), 0, 1.0)
    # --- story events
    for t, kind, p in S.events:
        if kind == "impact":
            place(fx, t, impact(p["size"]), 0, 0.7)
        elif kind == "riser":
            place(fx, t, riser(p["dur"], p.get("unresolved", False)), 0, 0.7)
        elif kind == "roll":
            d = p["dur"]
            k = 0
            tr = t
            while tr < t + d - 1e-6:
                x = (tr - t) / d
                place(drums, tr, CL, 0.0, 0.18 + 0.55 * x)
                tr += S.beat / 2 if x < 0.5 else S.beat / 4
                k += 1
        elif kind == "fall":
            m = fit(int(round(p["semis"])), "i")              # the fall walks down the key, not chromatically
            place(drums, t, tom(mtof(root + 12 + m)), 0.1, p["vel"])
            place(bass, t, bass_note(root + 12 + m, S.beat / 4 * 0.9, 0.6), 0, 0.8)
        elif kind == "lead":
            place(lead, t, lead_note(root + 24 + p["semis"], p["dur"], p["vel"]), 0, 1.0)
    # --- sidechain pump (the continuous motion) on bass, chords and a little on the lead
    pump = np.ones(n)
    for kt in kicks:
        i = int(kt * SR)
        L = min(n - i, int(S.beat * SR))
        if L > 0:
            pump[i:i + L] = np.minimum(pump[i:i + L], 1 - 0.6 * np.exp(-np.arange(L) / (0.075 * SR)))
    lead_bus = delay(lead, S.beat * 0.75)
    music = drums + bass * pump + chords * pump + lead_bus * (0.6 + 0.4 * pump)
    music += reverb(chords * 0.5 + lead_bus * 0.6 + drums * 0.08) * 0.35
    if S.cutoff:
        def fn(t):
            for a, b_, f in S.cutoff:
                if a <= t < b_:
                    return f(t)
            return None
        music = stft_lowpass(music, fn)
    mix = music + fx
    duck = np.ones(n)
    for t in S.ducks:
        i = int(t * SR)
        a, r = int(0.02 * SR), int(0.3 * SR)
        seg = np.concatenate([np.linspace(1, 0.7, a), np.linspace(0.7, 1, r)])
        j0 = max(0, i - a)
        j1 = min(n, j0 + len(seg))
        duck[j0:j1] = np.minimum(duck[j0:j1], seg[: j1 - j0])
    mix *= duck
    mix = stft_lowpass(mix, lambda t: 15000.0)
    k = int(0.003 * SR)
    mix[:, :k] *= np.linspace(0, 1, k)
    mix[:, -k:] *= np.linspace(1, 0, k)
    mix *= 10 ** ((MUSIC_LUFS - lufs(mix.mean(axis=0))) / 20)
    c = 10 ** (-3.0 / 20)
    mix = np.tanh(mix / c) * c
    tp = max(true_peak_db(mix[0]), true_peak_db(mix[1]))
    if tp > -1.5:
        mix *= 10 ** ((-1.5 - tp) / 20)
    return mix


def write_wav(path, mix):
    pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2").T.reshape(-1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def compose(eid, genre=None):
    spec = json.load(open(os.path.join(ROOT, "episodes", eid, "spec.json")))
    dp = os.path.join(ROOT, "episodes", eid, "data.json")
    data = json.load(open(dp)) if os.path.exists(dp) else None
    sc = spec.get("score") if isinstance(spec.get("score"), dict) else {}
    g = GENRES[genre or sc.get("genre") or spec.get("pillar", "risk")]
    S = Song(spec["duration_s"], g)
    for b in spec["beats"]:
        comp = b.get("component") or KIND_DEFAULT.get(b.get("kind"))
        INTERPRETERS.get(comp, i_default)(S, b, b["t"], b["t"] + b["dur"], data)
        if b.get("sfx"):
            S.ducks.append(b["t"] + b.get("sfx_at", 0))
        if abs(b["t"] / S.bar - round(b["t"] / S.bar)) > 0.05:
            S.cue(b["t"], f"note: beat '{b['kind']}' starts off the bar grid (bar = {S.bar:.3f}s)")
    if not any("loop build" in c["cue"] for c in S.cues):
        loop_build(S, S.dur)
    S.finish()
    S.cues.sort(key=lambda c: c["t"])
    return spec, S


def main():
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    eid, report = a[0], "--report" in a
    genre = a[a.index("--genre") + 1] if "--genre" in a else None
    spec, S = compose(eid, genre)
    if spec.get("score") is False:
        print(f"{eid}: score disabled in spec"); return
    print(f"{eid}: {S.g['name']} {S.g['bpm']:.1f} BPM · bar {S.bar:.3f}s · {S.dur / S.bar:.2f} bars")
    for i, bar in enumerate(S.bars):
        ph = "B" if bar.chord in ("III", "VII") else "A"
        mel = f"hook {ph}{bar.half + 1}{' (no breakout)' if bar.melody[0] else ''}" if bar.melody else "-"
        print(f"  bar {i + 1:2d} {i * S.bar:5.1f}s  {bar.chord:4} energy {bar.energy} {bar.drums:5}  {mel:22} {bar.label}")
    for c in S.cues:
        print(f"  {c['t']:6.2f}s  bar {c['bar']:2d}  {c['cue']}")
    if report:
        return
    mix = render(S)
    L, P = lufs(mix.mean(axis=0)), max(true_peak_db(mix[0]), true_peak_db(mix[1]))
    print(f"music {L:.1f} LUFS, {P:.1f} dBTP")
    out = os.path.join(ROOT, "engine", "public", "score")
    os.makedirs(out, exist_ok=True)
    write_wav(os.path.join(out, f"{eid}.wav"), mix)
    bars_out = [{"bar": i + 1, "t": round(i * S.bar, 3), "chord": b.chord, "energy": b.energy, "drums": b.drums,
                 "melody": (("B" if b.chord in ("III", "VII") else "A") + str(b.half + 1) + ("-" if b.melody[0] else "")) if b.melody else None, "label": b.label}
                for i, b in enumerate(S.bars)]
    json.dump({"id": eid, "genre": S.g["name"], "bpm": round(S.g["bpm"], 2), "bars": round(S.dur / S.bar, 2),
               "loop_aligned": abs(S.dur / S.bar - round(S.dur / S.bar)) < 0.02, "lufs": round(L, 1), "true_peak_db": round(P, 1),
               "generator": "scripts/sound/score.py (v3)", "arrangement": bars_out, "cues": S.cues},
              open(os.path.join(ROOT, "episodes", eid, "score.json"), "w"), indent=1)
    print(f"wrote engine/public/score/{eid}.wav and episodes/{eid}/score.json")


if __name__ == "__main__":
    main()
