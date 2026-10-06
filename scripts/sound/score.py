#!/usr/bin/env python3
"""
The Tape Machine: a beat engine that scores each episode from its own data.

  python scripts/sound/score.py L0001            -> engine/public/score/L0001.wav + episodes/L0001/score.json
  python scripts/sound/score.py L0001 --report   -> cue sheet + loudness only
  python scripts/sound/score.py L0001 --genre leverage   (audition another pillar's genre)

Everything is synthesised with numpy (no samples, no loops, no licences: compliance rule 9) and is deterministic.

Why beats. Short-form audiences decide in 1–2 seconds; the sound has to start on frame 0, sit on a grid, and land its
drops on the reveals. So the music is a groove, and the data writes the arrangement:

  Losses are tape-stops.  When a pit is dug the whole groove slows and dies (the brand's tape literally stops) and the
                          808 slides down by the loss: 12 semitones = 100%, so −50% is a six-semitone fall.
  Climbs are risers.      A riser lasts one bar per +100% of gain needed. If it fits before the next event it
                          resolves into a DROP. −75% needs three bars, −90% needs nine: those risers are cut off,
                          unresolved. You hear that the deeper the fall, the harder the climb.
  Depth empties the room. Deeper pits strip the drums and darken the harmony (Dm → Bb → Gm → Eb → A).
  Charts are filters.     A revealed chart drives a low-pass on the whole beat: the Nasdaq crash muffles the groove,
                          the recovery opens it, the tripwire snap is the drop. A ticker voice traces the price.
  Myths stop the tape.    The beat stops; only the ticker clock ticks; the math lands with an impact and the beat returns.
  The mark is the hook.   The logo's price path (tokens.mark) is the lead riff; on the end card it plays note-for-note
                          as the line draws and the wire snap lands on the downbeat.
  Loops.                  The last bar is a build that resolves into the first hit, so a replay sounds continuous.
                          The video should last a whole number of bars (the report says how to adjust the end beat).

Genre per pillar (one sound per pillar, so viewers learn the map by ear):
  risk: dark trap 150 · setups: breakout techno 128.6 · selection: two-step garage 138.5 · exits: deep house 120 ·
  conditions: breakbeat 120 · leverage: drum & bass 171.4 · operator: lo-fi hip hop 90 · legends: boom bap 94.7
  (tempos chosen so a beat is a whole or half number of 30 fps frames).
"""
import json, math, os, sys, wave
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SR = 48000
TOKENS = json.load(open(os.path.join(ROOT, "brand", "tokens.json")))
MUSIC_LUFS = -16.0
sys.path.insert(0, os.path.dirname(__file__))
from gen_cues import lufs, true_peak_db, sweep_bp  # same BS.1770 meter as the cues

rng = np.random.default_rng(7)

# ---------------------------------------------------------------- genres (16 steps per bar)
GENRES = {
    "risk": dict(name="dark trap", bpm=150.0, swing=0.0, kit="trap", root=38,
                 kick=[0, 7, 10], snare=[8], hats="trap", bass="808", prog=["Dm", "Bb", "Gm", "A"]),
    "setups": dict(name="breakout techno", bpm=1800 / 14, swing=0.0, kit="techno", root=40,
                   kick=[0, 4, 8, 12], snare=[4, 12], hats="offbeat", bass="roll", prog=["Em", "Em", "C", "D"]),
    "selection": dict(name="two-step garage", bpm=1800 / 13, swing=0.16, kit="garage", root=41,
                      kick=[0, 10], snare=[4, 12], hats="garage", bass="sub", prog=["Fm", "Db", "Ab", "Eb"]),
    "exits": dict(name="deep house", bpm=120.0, swing=0.08, kit="house", root=43,
                  kick=[0, 4, 8, 12], snare=[4, 12], hats="offbeat", bass="deep", prog=["Gm", "Eb", "Bb", "F"]),
    "conditions": dict(name="breakbeat", bpm=120.0, swing=0.05, kit="breaks", root=45,
                       kick=[0, 10], snare=[4, 12], hats="eighths", bass="sub", prog=["Am", "F", "C", "G"]),
    "leverage": dict(name="drum & bass", bpm=1800 / 10.5, swing=0.0, kit="dnb", root=37,
                     kick=[0, 10], snare=[4, 12], hats="eighths", bass="reese", prog=["C#m", "A", "E", "B"]),
    "operator": dict(name="lo-fi hip hop", bpm=90.0, swing=0.22, kit="lofi", root=36,
                     kick=[0, 7, 10], snare=[4, 12], hats="eighths", bass="sub", prog=["Cm7", "Abmaj7", "Ebmaj7", "Bb"]),
    "legends": dict(name="boom bap", bpm=1800 / 19, swing=0.12, kit="boombap", root=39,
                    kick=[0, 6, 10], snare=[4, 12], hats="eighths", bass="sub", prog=["Ebm", "B", "Gb", "Db"]),
}
NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8,
        "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


def chord(name, base=60):
    """'Dm', 'Bb', 'Cm7', 'Abmaj7' -> MIDI notes around `base`."""
    root = name[:2] if len(name) > 1 and name[1] in "#b" else name[:1]
    q = name[len(root):]
    r = NOTE[root]
    iv = {"": [0, 4, 7], "m": [0, 3, 7], "m7": [0, 3, 7, 10], "maj7": [0, 4, 7, 11], "7": [0, 4, 7, 10],
          "dim": [0, 3, 6], "sus2": [0, 2, 7]}.get(q, [0, 3, 7])
    n0 = base + ((r - base) % 12)
    if n0 > base + 5:
        n0 -= 12
    return [n0 + i for i in iv], n0


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


DEPTH_STEPS = [(0.15, 0, "m"), (0.35, -4, ""), (0.6, -7, "m"), (0.8, 1, ""), (1.01, 7, "")]  # i, VI, iv, bII, V


def depth_chord(depth, g):
    """Darker chords as the pit deepens: i -> VI -> iv -> bII (Phrygian) -> V (wants to resolve, can't)."""
    for th, off, q in DEPTH_STEPS:
        if depth < th:
            break
    root_pc = (g["root"] + off) % 12
    name = [k for k, v in NOTE.items() if v == root_pc and "#" not in k][0] + q
    notes, _ = chord(name, 60)
    return notes, g["root"] + ((off + 12) % 12 if off < 6 else off - 12)


# ---------------------------------------------------------------- arrangement model
class Score:
    def __init__(self, dur, g):
        self.dur, self.g = dur, g
        self.beat = 60 / g["bpm"]
        self.bar = 4 * self.beat
        self.step = self.beat / 4
        self.sections = []   # (t0, t1, energy 0..4, chords [names or (notes, bass)], label)
        self.free = []       # one-off events on the free bus: (t, kind, params)
        self.stops = []      # tape-stops: (t, dur, resume)
        self.cutoff = []     # (t0, t1, fn(t) -> Hz) low-pass automation on the groove bus
        self.ducks = []
        self.cues = []

    def cue(self, t, what):
        self.cues.append({"t": round(t, 2), "cue": what})

    def section(self, t0, t1, energy, chords=None, label=None):
        if t1 > t0:
            self.sections.append((t0, t1, energy, chords, label))
            self.cue(t0, f"{label or 'groove'}: energy {energy}")

    def next_bar(self, t):
        return math.ceil(t / self.bar - 1e-6) * self.bar

    def ev(self, t, kind, **p):
        if -0.5 <= t < self.dur + 0.5:
            self.free.append((t, kind, p))


def fmt(x):
    return f"{'+' if x >= 0 else '−'}{abs(x) * 100:.0f}%"


# ---------------------------------------------------------------- the story moves
def loss_stop(S, t, dur, L, resume):
    """The tape stops: groove slows to a halt; the 808 slides down 12·L semitones and hums under the silence."""
    S.stops.append((t, dur, resume))
    S.ev(t, "glide", start=S.g["root"] + 12, semis=12 * L, dur=max(0.25, dur), hold=min(0.6, max(0.0, resume - t - dur)))
    S.ev(t, "tapestop_sfx", dur=dur)
    S.ducks.append(t)
    S.cue(t, f"loss {fmt(-L)}: tape stops, 808 slides {12 * L:.1f} semitones")


def climb(S, t, L, limit, drop_energy=4, chords=None, label="climb"):
    """A riser lasting one bar per +100% of required gain. Resolves into a drop only if it fits before `limit`."""
    gain = L / (1 - L) if L < 1 else 99.0
    need = gain * S.bar
    room = max(0.0, limit - t)
    if need <= room:
        land = min(limit, S.next_bar(t + need)) if t + need < limit - S.step else t + need
        S.ev(t, "riser", dur=land - t, semis=min(24, 12 * gain), resolve=True)
        if gain >= 0.5:                      # a real climb earns a drop; a small one is just a lift
            S.ev(land, "impact", size=min(1.0, 0.5 + gain / 4))
            S.ducks.append(land)
            S.cue(t, f"{label} {fmt(gain)}: riser {need / S.bar:.2f} bars, resolves")
            S.cue(land, "DROP")
        else:
            S.cue(t, f"{label} {fmt(gain)}: a {need / S.bar:.2f}-bar lift, barely longer than the fall")
        return land
    S.ev(t, "riser", dur=room, semis=12 * gain * room / need, resolve=False)
    S.cue(t, f"{label} {fmt(gain)}: riser needs {need / S.bar:.1f} bars, only {room / S.bar:.1f} fit: UNRESOLVED")
    return None


# ---------------------------------------------------------------- interpreters
def i_thepit(S, b, t0, t1, data):
    p = b.get("props", {})
    keys = p.get("keys")
    if keys:
        holds = [(t0 + ka, t0 + kb, lb) for (ka, la), (kb, lb) in zip(keys, keys[1:]) if lb != la]
        first_end = holds[0][0] if holds else t1
        L0 = keys[0][1]
        S.section(t0, first_end, 3, [depth_chord(L0, S.g)], f"sweep {fmt(-L0)}")
        climb(S, t0 + 0.6, L0, first_end - 0.05, label="climb")
        for k, (ta, tb, L) in enumerate(holds):
            nxt = holds[k + 1][0] if k + 1 < len(holds) else t1
            loss_stop(S, ta, min(0.35, tb - ta), L, tb)
            energy = 3 if L < 0.3 else 2 if L < 0.6 else 1
            land = climb(S, tb + 0.05, L, nxt - 0.08, label="climb")
            if land and land < nxt:
                S.section(tb, land, energy, [depth_chord(L, S.g)], f"depth {fmt(-L)}")
                S.section(land, nxt, 3, [depth_chord(L, S.g)], "back up")
            else:
                S.section(tb, nxt, energy, [depth_chord(L, S.g)], f"depth {fmt(-L)}")
        return
    L = p.get("lossPct", 0.5)
    dig_at, dig_dur = t0 + p.get("digAt", 0.15), p.get("digDur", 0.8)
    climb_at = t0 + p.get("climbAt", 1.05)
    if b.get("kind") == "hook":
        # hook: the groove starts on frame 0 with a hit; the fall is an 808 slide, the climb a short lift
        S.ev(t0, "impact", size=0.8)
        S.section(t0, t1, 3, None, "hook")
        S.ev(dig_at, "glide", start=S.g["root"] + 12, semis=12 * L, dur=dig_dur, hold=climb_at - dig_at)
        S.ev(climb_at, "riser", dur=max(0.4, p.get("climbDur", 0.5)), semis=12, resolve=True)
        S.cue(dig_at, f"hook fall {fmt(-L)} (808 slide), climb lift")
        return
    S.section(t0, dig_at, 2, None, "set-up")
    # the tape stops on the loss, then the groove limps back on the next bar: thin, dark, "what's left"
    resume = min(climb_at, S.next_bar(dig_at + dig_dur + 0.2))
    loss_stop(S, dig_at, dig_dur, L, resume)
    S.section(resume, climb_at, 1, [depth_chord(L, S.g)], "what's left")
    land = climb(S, climb_at, L, t1 - 0.05)
    if land:
        S.section(climb_at, land, 1, [depth_chord(L, S.g)], "climbing")
        S.section(land, t1, 4, None, "made it back")
    else:
        S.section(climb_at, t1, 1, [depth_chord(L, S.g)], "climbing")


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

    end = snap or t1
    # the filter IS the drawdown: full band at a peak, muffled at the bottom
    S.cutoff.append((t0, end, lambda t: max(260.0, 16000.0 * (1 - dd_at(t)) ** 3.2)))
    S.section(t0, end, 3, None, "chart: filter follows the drawdown")
    # ticker voice: one blip per eighth note, pitch = % from the running peak (12 semitones = 100%)
    t = t0 + rev_at
    while t < min(end, t0 + rev_at + rev_dur):
        S.ev(t, "ticker", note=S.g["root"] + 36 - 12 * dd_at(t), vel=0.5)
        t += S.beat / 2
    worst = max(dd_at(x) for x in np.linspace(t0 + rev_at, end, 60))
    S.cue(t0 + rev_at, f"ticker traces the price; deepest drawdown {fmt(-worst)} closes the filter to ~{max(260, 16000 * (1 - worst) ** 3.2):.0f} Hz")
    if snap and snap < t1:
        S.ev(snap, "impact", size=1.0)
        S.ducks.append(snap)
        S.section(snap, t1, 4, [(chord("F", 60)[0], S.g["root"] + 3), (chord("A", 60)[0], S.g["root"] + 7)], "tripwire snaps: DROP")


def i_myth(S, b, t0, t1, data):
    fact = t0 + b.get("props", {}).get("factAt", 1.6)
    S.stops.append((t0, 0.45, fact))
    S.ev(t0, "tapestop_sfx", dur=0.45)
    tk = t0 + 0.5
    while tk < fact - 0.05:
        S.ev(tk, "clock", vel=0.6)
        tk += S.beat
    S.ev(t0 + 0.45, "hold", dur=fact - t0 - 0.45, note=S.g["root"] + 19)
    S.ev(fact, "impact", size=0.9)
    S.ducks.append(fact)
    S.section(fact, t1, 3, None, "the math lands")
    S.cue(t0, "myth: tape stops, only the clock ticks")


def i_rule(S, b, t0, t1, data):
    S.section(t0, t1, 4, None, "rule: full groove + the mark riff")
    t = S.next_bar(t0)
    while t < t1 - S.bar / 2:
        logo_riff(S, t, S.bar, vel=0.55)
        t += 2 * S.bar


def mark_notes(S):
    """The logo's price path as pitches: below the wire = below the tonic, the breakout = an octave up."""
    pts, wy = TOKENS["mark"]["price_path_512"], TOKENS["mark"]["wire_y_512"]
    scale = [0, 2, 3, 5, 7, 8, 10]
    out = []
    for x, y in pts:
        raw = S.g["root"] + 36 + (wy - y) / 15
        best = min((S.g["root"] + 12 * o + d for o in range(1, 7) for d in scale), key=lambda m: abs(m - raw))
        out.append(best)
    return out


def logo_riff(S, t, span, vel=0.6):
    notes = mark_notes(S)
    for i, m in enumerate(notes):
        S.ev(t + i * span / len(notes), "lead", note=m, dur=span / len(notes) * 0.9, vel=vel * (1.25 if i == len(notes) - 1 else 1))


def bezier_y(x, p):
    x1, y1, x2, y2 = p
    lo, hi = 0.0, 1.0
    for _ in range(40):
        m = (lo + hi) / 2
        bx = 3 * (1 - m) ** 2 * m * x1 + 3 * (1 - m) * m ** 2 * x2 + m ** 3
        lo, hi = (m, hi) if bx < x else (lo, m)
    m = (lo + hi) / 2
    return 3 * (1 - m) ** 2 * m * y1 + 3 * (1 - m) * m ** 2 * y2 + m ** 3


def time_for(frac, at, dur, ease):
    lo, hi = 0.0, 1.0
    for _ in range(40):
        m = (lo + hi) / 2
        lo, hi = (m, hi) if bezier_y(m, ease) < frac else (lo, m)
    return at + hi * dur


def i_end(S, b, t0, t1, data):
    """End card: the mark riff note-for-note as the line draws (EndCard drawAt 0.15, drawDur 1.0), the snap is a hit,
    the groove rides out and the last bar builds back into the first hit (loop)."""
    pts, wy = TOKENS["mark"]["price_path_512"], TOKENS["mark"]["wire_y_512"]
    ease = TOKENS["motion"]["ease"]["draw"]
    seg = [math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
    total = sum(seg)
    (x1, y1), (x2, y2) = pts[-2], pts[-1]
    cross_len = sum(seg[:-1]) + math.dist(pts[-2], (x1 + (x2 - x1) * (y1 - wy) / (y1 - y2), wy))
    notes = mark_notes(S)
    acc = 0.0
    for i in range(len(pts) - 1):
        if i:
            acc += seg[i - 1]
        S.ev(time_for(acc / total, t0 + 0.15, 1.0, ease), "lead", note=notes[i], dur=0.22, vel=0.7)
    snap = time_for(cross_len / total, t0 + 0.15, 1.0, ease)
    S.ev(snap, "lead", note=notes[-1], dur=0.6, vel=0.85)
    S.ev(snap, "impact", size=0.9)
    S.ducks.append(snap)
    S.section(t0, snap, 1, None, "end card: the mark riff")
    S.section(snap, t1, 3, None, "wire snaps: ride out")
    S.cue(t0 + 0.15, "mark riff plays as the line draws")
    loop_build(S, t1)


def loop_build(S, t_end):
    """The last bar builds into the first hit: snare roll + short riser that resolve on the loop point."""
    a = max(0.0, t_end - S.bar)
    k = 0
    t = a
    while t < t_end - 1e-6:
        S.ev(t, "snare", vel=0.25 + 0.6 * (t - a) / S.bar)
        k += 1
        t += S.step if t - a < S.bar / 2 else S.step / 2
    S.ev(a, "riser", dur=t_end - a, semis=12, resolve=False)
    S.cue(a, "loop build: last bar resolves into frame 0's hit")


def i_default(S, b, t0, t1, data):
    kind = b.get("kind", "build")
    energy = {"hook": 3, "question": 2, "term": 2, "assumptions": 1, "breaks": 4, "reveal": 3, "poll": 1,
              "rule": 4, "lesson": 3, "quote": 1, "story": 2}.get(kind, 3)
    if t0 == 0:
        S.ev(0, "impact", size=0.8)
    S.section(t0, t1, energy, None, f"{kind}")


INTERPRETERS = {"ThePit": i_thepit, "CandleChart": i_candlechart, "Anatomy": i_candlechart, "MythCard": i_myth,
                "RuleCard": i_rule, "EndCard": i_end}
KIND_DEFAULT = {"end": "EndCard", "misconception": "MythCard", "rule": "RuleCard", "the_rule": "RuleCard"}


# ---------------------------------------------------------------- instruments
def lin_env(n, a, d=None, curve=1.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    if d:
        e = e * np.exp(-np.maximum(t - a, 0) / d) ** curve
    return e


def hp(x):
    return np.diff(np.concatenate([[0], x]))


def lp1(x, a):
    """One-pole low-pass via exponential smoothing (vectorised with cumulative trick is not exact; use small loop on short one-shots)."""
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += a * (v - acc)
        y[i] = acc
    return y


def mk_kick(kit):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    top, bottom, dec = {"trap": (160, 42, 0.38), "dnb": (190, 52, 0.18), "lofi": (120, 48, 0.22), "boombap": (140, 50, 0.25)}.get(kit, (170, 48, 0.28))
    f = bottom + (top - bottom) * np.exp(-t / 0.035)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / dec)
    s += hp(rng.standard_normal(n)) * np.exp(-t / 0.0025) * 0.4
    return np.tanh(1.6 * s)


def mk_snare(kit):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    if kit in ("trap", "techno", "house", "garage"):            # clap: three bursts + tail
        noise = hp(hp(rng.standard_normal(n)))
        e = np.zeros(n)
        for k, off in enumerate([0, 0.009, 0.019]):
            i = int(off * SR)
            e[i:] += np.exp(-(t[: n - i]) / (0.006 if k < 2 else 0.11))
        return noise * e * 0.35
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.07)
    noise = hp(rng.standard_normal(n)) * np.exp(-t / (0.16 if kit in ("lofi", "boombap") else 0.12))
    return 0.6 * tone + 0.5 * noise


def mk_hat(open_=False):
    n = int((0.22 if open_ else 0.05) * SR)
    t = np.arange(n) / SR
    s = hp(hp(rng.standard_normal(n)))
    return s * np.exp(-t / (0.09 if open_ else 0.012)) * 0.22


def mk_tick():
    """The brand hat: a ticker-tape click with a metallic ring."""
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    ring = sum(np.sin(2 * np.pi * f * t) for f in (5200, 7130, 8410)) / 3
    return (ring * np.exp(-t / 0.012) + hp(rng.standard_normal(n)) * np.exp(-t / 0.002) * 0.6) * 0.3


def mk_impact(size):
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    f = 30 + 50 * np.exp(-t / 0.12)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.5 * size + 0.2))
    crash = hp(rng.standard_normal(n)) * np.exp(-t / (0.45 * size + 0.1)) * 0.25
    return np.tanh(1.4 * (boom + crash)) * (0.6 + 0.4 * size)


def saw(f, n, harmonics=24):
    t = np.arange(n) / SR
    s = np.zeros(n)
    for h in range(1, harmonics + 1):
        if f * h > 16000:
            break
        s += np.sin(2 * np.pi * f * h * t) / h
    return s


def square(f, n, harmonics=9):
    """Band-limited square (odd harmonics only): no aliasing, no inter-sample overs."""
    t = np.arange(n) / SR
    s = np.zeros(n)
    for h in range(1, 2 * harmonics, 2):
        if f * h > 15000:
            break
        s += np.sin(2 * np.pi * f * h * t) / h
    return s * 4 / np.pi


def mk_808(f, dur, glide_to=None, glide_dur=0.3, drive=2.2):
    n = int((dur + 0.1) * SR)
    t = np.arange(n) / SR
    freq = np.full(n, f) * (1 + 1.0 * np.exp(-t / 0.012))           # punch
    if glide_to:
        g = np.clip(t / max(glide_dur, 0.01), 0, 1)
        freq = freq * (glide_to / f) ** (g ** 1.4)
    s = np.sin(2 * np.pi * np.cumsum(freq) / SR)
    env = np.minimum(1, t / 0.004) * np.exp(-t / max(0.25, dur * 0.9))
    env[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))
    return np.tanh(drive * s) / np.tanh(drive) * env * 0.7          # saturation = harmonics phones can play


def mk_stab(notes, dur, bright=1.0):
    n = int((dur + 0.15) * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for m in notes:
        for det in (-0.006, 0.0, 0.006):
            s += saw(mtof(m) * (1 + det), n, harmonics=int(4 + 14 * bright))
    s *= np.minimum(1, t / 0.005) * np.exp(-t / (0.12 + 0.25 * dur))
    return s / (3 * max(1, len(notes))) * 0.6


def mk_lead(m, dur, vel):
    n = int((dur + 0.2) * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    s = saw(f, n, 10) * 0.6 + square(f * 0.5, n, 9) * 0.15
    s *= np.minimum(1, t / 0.004) * np.exp(-t / (0.08 + dur * 0.6))
    return s * vel * 0.5


def mk_ticker(m, vel):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    s = square(f, n, 9) * 0.5 + np.sin(2 * np.pi * f * 2 * t) * 0.3
    return s * np.exp(-t / 0.035) * vel * 0.25


def mk_pad(notes, dur, bright):
    n = int((dur + 0.6) * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for m in notes:
        for det in (-0.004, 0.004):
            s += saw(mtof(m) * (1 + det), n, harmonics=int(2 + 8 * bright))
    e = np.minimum(1, t / 0.3) * np.minimum(1, np.maximum(0, (dur + 0.6 - t)) / 0.5)
    return s * e / (2 * max(1, len(notes))) * 0.35


def mk_riser(dur, semis, resolve):
    n = max(1, int(dur * SR))
    t = np.arange(n) / SR
    x = t / max(dur, 1e-3)
    noise = sweep_bp(rng.standard_normal(n), 400, 400 * 2 ** (min(semis, 36) / 12 + 1.5), q=1.3)
    f = 220 * 2 ** (semis * x / 12)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    env = x ** 1.6
    if not resolve:
        env *= np.minimum(1, (1 - x) / 0.04)   # a hard cut, not a landing
    return (noise * 0.9 + tone * 0.18) * env * 0.5


def mk_tapestop_sfx(dur):
    n = int((dur + 0.05) * SR)
    t = np.arange(n) / SR
    f = 90 * (1 - np.clip(t / dur, 0, 1)) ** 1.5 + 25
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (dur * 0.8)) * 0.35


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


def section_at(S, t):
    for s in S.sections:
        if s[0] <= t < s[1]:
            return s
    return None


def stft_lowpass(x, fn, t_offset=0.0):
    """Time-varying low-pass by STFT masking (vectorised); fn(t) -> cutoff Hz, None = untouched."""
    nfft, hop = 2048, 512
    win = np.hanning(nfft)
    out = np.zeros_like(x)
    norm = np.zeros(x.shape[1])
    freqs = np.fft.rfftfreq(nfft, 1 / SR)
    for start in range(0, x.shape[1] - nfft, hop):
        c = fn((start + nfft / 2) / SR + t_offset)
        mask = 1.0 if c is None else 1 / (1 + (freqs / c) ** 4)
        for ch in range(2):
            seg = np.fft.irfft(np.fft.rfft(x[ch, start:start + nfft] * win) * mask, nfft)
            out[ch, start:start + nfft] += seg * win
        norm[start:start + nfft] += win ** 2
    norm[norm < 1e-6] = 1
    return out / norm


def tape_stop(x, t, dur, resume):
    """Slow the bus to a halt over `dur` (playback rate 1 -> 0), then silence until `resume`."""
    i0, n = int(t * SR), x.shape[1]
    i1 = min(n, int((t + dur) * SR))
    ir = min(n, int(resume * SR))
    if i0 >= n:
        return
    tau = (np.arange(i1 - i0) / SR) / dur
    pos = i0 + np.cumsum((1 - tau) ** 1.3)                  # source sample index advances ever slower
    for ch in range(2):
        x[ch, i0:i1] = np.interp(pos, np.arange(n), x[ch]) * (1 - tau ** 3)
    x[:, i1:ir] = 0
    if ir < n:                                              # a 10 ms fade back in
        k = min(n - ir, int(0.01 * SR))
        x[:, ir:ir + k] *= np.linspace(0, 1, k)


def render(S):
    g = S.g
    n = int(S.dur * SR)
    groove = np.zeros((2, n))   # drums + bass + chords: affected by tape-stops and the chart filter
    synth = np.zeros((2, n))    # pads/stabs (sidechained), also part of the groove
    free = np.zeros((2, n))     # story events: impacts, risers, ticker, leads, holds
    kick, snare, chat, ohat, tick = mk_kick(g["kit"]), mk_snare(g["kit"]), mk_hat(), mk_hat(True), mk_tick()
    kick_times = []
    steps = int(S.dur / S.step) + 1
    for k in range(steps):
        pos = k % 16
        t = k * S.step + (g["swing"] * S.step if pos % 2 == 1 else 0.0)
        sec = section_at(S, k * S.step)
        if not sec:
            continue
        t0, t1, e, chords, _ = sec
        bar_idx = int(k // 16)
        if e >= 2 and pos in g["kick"]:
            place(groove, t, kick, 0, 0.95)
            kick_times.append(t)
        if e >= 3 and pos in g["snare"]:
            place(groove, t, snare, 0.05, 0.8)
        if e >= 1:
            style = g["hats"]
            if style == "trap":
                roll = (bar_idx % 2 == 1 and pos >= 12)
                if pos % 2 == 0 or roll:
                    place(groove, t, tick if pos % 4 == 2 else chat, 0.3, 0.55 if pos % 4 == 0 else 0.4)
                if roll:
                    place(groove, t + S.step / 2, chat, 0.3, 0.3)
            elif style == "offbeat":
                if pos % 4 == 2:
                    place(groove, t, ohat, 0.25, 0.5)
                place(groove, t, chat if pos % 2 else tick, -0.25, 0.22)
            elif style == "garage":
                if pos in (2, 3, 6, 10, 11, 14):
                    place(groove, t, tick if pos in (2, 10) else chat, 0.3, 0.45)
            else:
                if pos % 2 == 0:
                    place(groove, t, tick if pos % 4 == 2 else chat, 0.25, 0.45)
        # chords: one per bar, from the section or the genre progression
        if pos == 0:
            if chords:
                notes, bass = chords[bar_idx % len(chords)]
            else:
                notes, bass = chord(g["prog"][bar_idx % len(g["prog"])], 60)
                bass = g["root"] + ((bass - g["root"]) % 12)
            dur = min(S.bar, t1 - k * S.step)
            if e >= 1:
                place(synth, t, mk_pad(notes, dur, 0.3 + 0.15 * e), 0, 0.9)
            if e >= 3 and g["bass"] == "808":
                for kp in g["kick"]:
                    kt = (k + kp) * S.step
                    if kt < t1:
                        nxt = [x for x in g["kick"] if x > kp]
                        d = ((nxt[0] if nxt else 16) - kp) * S.step
                        place(groove, kt, mk_808(mtof(bass), d * 0.95), 0, 0.85)
            elif e >= 3:
                for sp in ([2, 6, 10, 14] if g["bass"] in ("roll", "deep") else [0, 8]):
                    bt = (k + sp) * S.step
                    if bt < t1:
                        place(groove, bt, mk_808(mtof(bass + 12), S.step * (3 if g["bass"] == "roll" else 6), drive=1.4), 0, 0.6)
            if e >= 4:
                for sp in (0, 3, 6, 10):
                    st = (k + sp) * S.step
                    if st < t1:
                        place(synth, st, mk_stab([m + 12 for m in notes], S.step * 1.5, 0.8), (-0.3, 0.3)[sp % 2], 0.55)
    # sidechain pump on the synth bus
    pump = np.ones(n)
    for kt in kick_times:
        i = int(kt * SR)
        L = min(n - i, int(0.25 * S.beat * SR * 2))
        if L > 0:
            pump[i:i + L] = np.minimum(pump[i:i + L], 1 - 0.55 * np.exp(-np.arange(L) / (0.09 * SR)))
    groove += synth * pump
    # chart filter, then tape-stops
    if S.cutoff:
        def fn(t):
            for a, b_, f in S.cutoff:
                if a <= t < b_:
                    return f(t)
            return None
        groove = stft_lowpass(groove, fn)
    for t, d, r in S.stops:
        tape_stop(groove, t, d, r)
    # free bus
    for t, kind, p in S.free:
        if kind == "impact":
            place(free, t, mk_impact(p["size"]), 0, 0.8)
        elif kind == "riser":
            place(free, t, mk_riser(p["dur"], p["semis"], p["resolve"]), 0, 0.55)
        elif kind == "glide":
            f0 = mtof(p["start"])
            place(free, t, mk_808(f0, p["dur"] + p["hold"], f0 * 2 ** (-p["semis"] / 12), p["dur"], drive=2.8), 0, 0.8)
        elif kind == "hold":
            if p["dur"] > 0.05:
                place(free, t, mk_pad([p["note"] + 24, p["note"] + 31], p["dur"], 0.25), 0, 0.6)
        elif kind == "ticker":
            place(free, t, mk_ticker(p["note"], p["vel"]), 0.2, 1.0)
        elif kind == "lead":
            place(free, t, mk_lead(p["note"], p["dur"], p["vel"]), -0.15, 1.0)
        elif kind == "clock":
            place(free, t, mk_tick(), 0.0, p["vel"] * 1.3)
        elif kind == "snare":
            place(free, t, snare, 0.0, p["vel"])
        elif kind == "tapestop_sfx":
            place(free, t, mk_tapestop_sfx(p["dur"]), 0, 0.7)
    mix = groove + free
    # duck under every sound cue so the cues stay on top
    duck = np.ones(n)
    for t in S.ducks:
        i = int(t * SR)
        a, r = int(0.03 * SR), int(0.35 * SR)
        seg = np.concatenate([np.linspace(1, 0.6, a), np.linspace(0.6, 1, r)])
        j0 = max(0, i - a)
        j1 = min(n, j0 + len(seg))
        duck[j0:j1] = np.minimum(duck[j0:j1], seg[: j1 - j0])
    mix *= duck
    # no fade-in, no fade-out: the loop must be seamless. 3 ms guards against clicks only.
    k = int(0.003 * SR)
    mix[:, :k] *= np.linspace(0, 1, k)
    mix[:, -k:] *= np.linspace(1, 0, k)
    # air ceiling: nothing useful lives above 15 kHz on phone speakers, and it is where inter-sample overs come from
    mix = stft_lowpass(mix, lambda t: 15000.0)
    mix *= 10 ** ((MUSIC_LUFS - lufs(mix.mean(axis=0))) / 20)
    c = 10 ** (-3.0 / 20)
    mix = np.tanh(mix / c) * c                       # soft clip: transients round off instead of overshooting
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
    S = Score(spec["duration_s"], g)
    for b in spec["beats"]:
        comp = b.get("component") or KIND_DEFAULT.get(b.get("kind"))
        INTERPRETERS.get(comp, i_default)(S, b, b["t"], b["t"] + b["dur"], data)
        if b.get("sfx"):
            S.ducks.append(b["t"] + b.get("sfx_at", 0))
    if not any(c["cue"].startswith("loop build") for c in S.cues):
        loop_build(S, S.dur)
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
    bars = S.dur / S.bar
    for c in S.cues:
        print(f"{c['t']:6.2f}s  {c['cue']}")
    aligned = abs(bars - round(bars)) < 0.02
    print(f"{eid}: {S.g['name']} {S.g['bpm']:.1f} BPM, bar {S.bar:.3f}s, {bars:.2f} bars"
          + ("" if aligned else f"  (not loop-aligned: make the video {round(bars + 0.5) * S.bar:.2f}s by lengthening the end beat)"))
    if report:
        return
    mix = render(S)
    L, P = lufs(mix.mean(axis=0)), max(true_peak_db(mix[0]), true_peak_db(mix[1]))
    print(f"music {L:.1f} LUFS, {P:.1f} dBTP")
    out = os.path.join(ROOT, "engine", "public", "score")
    os.makedirs(out, exist_ok=True)
    write_wav(os.path.join(out, f"{eid}.wav"), mix)
    json.dump({"id": eid, "genre": S.g["name"], "bpm": round(S.g["bpm"], 2), "bars": round(bars, 2), "loop_aligned": aligned,
               "lufs": round(L, 1), "true_peak_db": round(P, 1), "generator": "scripts/sound/score.py", "cues": S.cues},
              open(os.path.join(ROOT, "episodes", eid, "score.json"), "w"), indent=1)
    print(f"wrote engine/public/score/{eid}.wav and episodes/{eid}/score.json")


if __name__ == "__main__":
    main()
