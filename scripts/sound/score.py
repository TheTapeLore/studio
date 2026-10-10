#!/usr/bin/env python3
"""
The Tape Machine v4: every episode gets its OWN song (episodes/<id>/song.json, designed by song.py), written around
one hook and one continuous groove, and arranged by the episode's data.

  python scripts/sound/score.py L0001            -> engine/public/score/L0001.wav + episodes/L0001/score.json
  python scripts/sound/score.py L0001 --report   -> bar-by-bar arrangement + loudness only
  python scripts/sound/score.py L0001 --song path/to/song.json   (audition another song on this episode)

Synthesised with numpy only (no samples, no loops, no licences: compliance rule 9). Deterministic.

Principles (founder feedback: v1 "piano felt irrelevant", v2 "random sounds, no tune", v3 "songs should change")
  1. A hook you can hum, new every episode. song.py writes it (motif -> breakout -> answer; A A' B A'') in a key, mode,
     tempo, progression and sound palette no recent episode used, and freezes it in song.json (the song memory).
  2. A signature that never changes: the SONIC LOGO, the mark's price path as nine notes (three shrinking dips, then
     the breakout), plays on every end card in the song's own key while the mark draws; its breakout is the wire snap.
  3. One groove that never stops. One tempo, one key, a four-chord loop, a pulse with a sidechain pump. Story moments
     change the arrangement (filter, density, chords, fills), never the clock.
  4. The picture sits on the grid. Specs are timed in whole bars of the song's tempo; key moments land on beats.
  5. The data writes the arrangement:
       losses   -> a descending bass/tom run that falls 12 semitones per 100%, in key, on the beats before the bar line
       depth    -> darker chords (the mode's depth ladder: home -> VI -> iv -> bII -> V), half-time drums, and the
                   hook's BREAKOUT NOTES ARE WITHHELD while you are deep: the melody only climbs out when the climb works
       climbs   -> a build (riser + snare roll) that drops on the bar where the arrow lands
       charts   -> a DJ low-pass that follows the drawdown; the tripwire snap is the drop into the chorus
       myths    -> a breakdown (no kick); the math lands with an impact and the groove returns
       rules    -> the chorus: the hook's B and A'' phrases (its peak and its cadence)
       end card -> the sonic logo; the last bar builds into frame 0 (seamless loop)
"""
import json, math, os, sys, wave
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SR = 48000
TOKENS = json.load(open(os.path.join(ROOT, "brand", "tokens.json")))
MUSIC_LUFS = -16.0
sys.path.insert(0, os.path.dirname(__file__))
from gen_cues import lufs, true_peak_db, sweep_bp  # same BS.1770 meter as the cues
import gen_cues
import song as songlib

rng = np.random.default_rng(11)

# drum grooves on a 16-step bar. "turn" = the variation played on the 4th bar of every 4 (a fill that keeps it moving)
GROOVES = {
    "four":        dict(kick=[0, 4, 8, 12], snare=[4, 12], ghost=[], hats="house", snd="clap"),
    "four-ghost":  dict(kick=[0, 4, 8, 12], snare=[4, 12], ghost=[7, 15], hats="house16", snd="clap"),
    "four-broken": dict(kick=[0, 4, 8, 12], snare=[4, 12], ghost=[], hats="offbeat", snd="clap",
                        turn=dict(kick=[0, 4, 8, 11, 14], snare=[4, 12, 15])),
    "garage":      dict(kick=[0, 7, 10], snare=[4, 12], ghost=[14], hats="house16", snd="clap"),
    "breaks":      dict(kick=[0, 10], snare=[4, 12], ghost=[7, 9, 15], hats="house16", snd="snare"),
    "dnb":         dict(kick=[0, 10], snare=[4, 12], ghost=[], hats="eighths", snd="snare"),
    "dnb-roll":    dict(kick=[0, 10], snare=[4, 12], ghost=[7, 14], hats="house16", snd="snare",
                        turn=dict(kick=[0, 6, 10], snare=[4, 12, 14, 15])),
    "hiphop":      dict(kick=[0, 7, 10], snare=[4, 12], ghost=[], hats="eighths", snd="snare"),
    "hiphop-lazy": dict(kick=[0, 3, 10], snare=[4, 12], ghost=[15], hats="eighths", snd="snare", lazy=0.035),
}
# bass lines: (step, length in steps, semitones above the chord root, velocity)
BASSLINES = {
    "octave":     [(k, 1.5, 12 * (k // 2 % 2), 0.7) for k in range(0, 16, 2)],
    "syncopated": [(0, 2.5, 0, 0.85), (3, 2.5, 0, 0.7), (6, 1.5, 12, 0.6), (10, 2.5, 7, 0.75), (12, 3.5, 0, 0.8)],
    "sub":        [(0, 7.0, 0, 0.9), (10, 5.5, 0, 0.8)],
}
ARPS = {"broken": [0, 2, 1, 3, 4, 2, 3, 1], "up": [0, 1, 2, 3, 4, 1, 2, 3], "updown": [0, 1, 2, 3, 4, 3, 2, 1]}


class Bar:
    def __init__(self):
        self.deg = None            # None = follow the song's four-chord loop from the latest anchor
        self.energy = 3            # 0 silent · 1 pad/hats · 2 + kick · 3 + bass/clap · 4 + arp
        self.drums = "full"        # full · half · break · none
        self.melody = None         # (withhold_breakout: bool, gain)
        self.logo = None           # 0/1: this bar plays the sonic logo's first/second bar
        self.label = ""
        self.j = 0                 # position in the loop (anchor offset applied)
        self.m = 0                 # hook bar (0..7) this bar plays
        self.ch = None             # resolved chord spec


class Arrangement:
    def __init__(self, dur, song):
        self.song = song
        self.mode = song["mode"]
        self.ladder = songlib.depth_ladder(self.mode)
        self.dur = dur
        self.beat = 60 / song["bpm"]
        self.bar = 4 * self.beat
        self.nbars = int(math.ceil(dur / self.bar - 1e-3))   # specs round times to 4 decimals
        self.bars = [Bar() for _ in range(self.nbars)]
        self.anchors = {0: 0}      # bar -> hook bar it restarts on (every drop lands on the top of the hook)
        self.events = []           # (t, kind, params): fills, risers, impacts, rolls
        self.cutoff = []           # (t0, t1, fn) low-pass automation
        self.ducks = []
        self.cues = []
        self.end_card = None
        self.sim = None

    def bar_of(self, t):
        # tolerant to times rounded in the spec (4 decimals): 26.1333 s is the start of bar 14 at 1.8667 s bars
        return max(0, min(self.nbars - 1, int(t / self.bar + 1e-3)))

    def bars_in(self, t0, t1):
        return range(self.bar_of(t0), self.bar_of(t1 - 0.01 * self.bar) + 1)

    def ev(self, t, kind, **p):
        self.events.append((t, kind, p))

    def cue(self, t, text):
        self.cues.append({"t": round(t, 2), "bar": self.bar_of(t) + 1, "cue": text})

    def melody(self, t0, t1, withhold=False, gain=1.0):
        for k in self.bars_in(t0, t1):
            self.bars[k].melody = (withhold, gain)

    def anchor(self, t, at=0):
        self.anchors[self.bar_of(t)] = at

    def name(self, deg):
        return songlib.chord(self.mode, deg)["name"]

    def depth_deg(self, L):
        for th, i in ((0.15, 0), (0.35, 1), (0.6, 2), (0.8, 3)):
            if L < th:
                return self.ladder[i]
        return self.ladder[4]

    def finish(self):
        """Loop chords and hook bars from the latest anchor. Bars with story chords (the pit, the myth) loop the
        hook's first phrase (the motif), so the song stays recognisable while the harmony sinks."""
        a, o = 0, 0
        prog = self.song["progression"]
        for k, bar in enumerate(self.bars):
            if k in self.anchors:
                a, o = k, self.anchors[k]
            bar.j = k - a + o
            if bar.logo is not None:
                deg = songlib.LOGO_CHORDS[bar.logo]
            elif bar.deg is None:
                deg = prog[bar.j % 4]
            else:
                deg = bar.deg
            bar.m = bar.j % 8 if bar.deg is None else (k - a) % 2
            bar.ch = songlib.chord(self.mode, deg)

    def phrase_label(self, bar):
        if bar.logo is not None:
            return f"logo{bar.logo + 1}"
        return f"{self.song['form'][bar.m // 2]}{bar.m % 2 + 1}"


def fmt(x):
    return f"{'+' if x >= 0 else '−'}{abs(x) * 100:.0f}%"


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
        marks = [(t0, keys[0][1])] + seq
        for j, (ta, L) in enumerate(marks):
            tb = marks[j + 1][0] if j + 1 < len(marks) else t1
            if j:
                fall_fill(S, ta, L)
            for k in S.bars_in(ta, tb):
                bar = S.bars[k]
                bar.deg = S.depth_deg(L) if L >= 0.35 else None   # shallow: the loop carries on
                bar.energy = 4 if L < 0.3 else 3 if L < 0.6 else 2
                bar.drums = "full" if L < 0.6 else "half"
                bar.label = f"depth {fmt(-L)}"
            S.melody(ta, tb, withhold=L >= 0.35, gain=1.0 if L < 0.6 else 0.7)
            S.cue(ta, f"depth {fmt(-L)} -> {S.name(S.depth_deg(L))}, {'full' if L < 0.6 else 'half-time'} drums; climb needs "
                  f"{fmt(L / (1 - L))}" + ("; hook breakout withheld" if L >= 0.35 else "; hook resolves"))
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
        S.cue(t0, "hook: full groove + the song's hook from frame 0")
        return
    floor_bar = S.bar_of(dig_at + dig_dur)
    land_bar = S.bar_of(climb_at + climb_dur)
    fall_fill(S, dig_at + dig_dur, L)
    lad = S.ladder
    for k in S.bars_in(t0, t1):
        bar = S.bars[k]
        if k < floor_bar:
            bar.energy, bar.label = 3, "set-up"
        elif k < land_bar:
            # what's left: the room empties, the chords go dark, the hook plays without its breakout
            depth_bars = list(range(floor_bar, land_bar))
            pos = depth_bars.index(k)
            bar.deg = [lad[1], lad[2], lad[4], lad[4]][min(pos, 3)] if len(depth_bars) <= 4 else S.depth_deg(L)
            bar.energy = 1 if pos < len(depth_bars) - 2 else 2
            bar.drums = "break"
            bar.label = "what's left"
        else:
            bar.energy, bar.label = 4, "made it back"
    S.melody(t0, floor_bar * S.bar)
    S.melody(floor_bar * S.bar, land_bar * S.bar, withhold=True, gain=0.6)
    S.melody(land_bar * S.bar, t1)
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
    S.melody(t0, end, withhold=True, gain=0.85)
    worst = max(dd_at(x) for x in np.linspace(t0 + rev_at, end, 80))
    S.cue(t0, f"groove runs through a low-pass that follows the drawdown (deepest {fmt(-worst)} ~ {max(320, 15000 * (1 - worst) ** 3):.0f} Hz)")
    if snap and snap < t1:
        if abs(snap / S.bar - round(snap / S.bar)) > 0.05:
            S.cue(snap, "warning: the snap is not on a bar line (set revealDur so it is)")
        build(S, max(t0, snap - S.bar), snap, "the old high comes back")
        S.anchor(snap)
        for k in S.bars_in(snap, t1):
            S.bars[k].energy, S.bars[k].label = 4, "tripwire snaps: chorus"
        S.melody(snap, t1)


def i_myth(S, b, t0, t1, data):
    fact = t0 + b.get("props", {}).get("factAt", 1.6)
    for k in S.bars_in(t0, t1):
        bar = S.bars[k]
        if k < S.bar_of(fact):
            bar.energy, bar.drums, bar.label = 1, "break", "myth: breakdown"
            bar.deg = [S.ladder[2], S.ladder[0]][k % 2]
        else:
            bar.energy, bar.label = 3, "the math lands"
    S.melody(t0, fact, withhold=True, gain=0.6)
    S.melody(fact, t1)
    S.ev(fact, "impact", size=0.8)
    S.ducks.append(fact)
    S.anchor(fact)
    S.cue(t0, "myth: breakdown, hook without its breakout")
    S.cue(fact, "the math lands: groove back")


def i_rule(S, b, t0, t1, data):
    for k in S.bars_in(t0, t1):
        S.bars[k].energy, S.bars[k].label = 4, "chorus: the rule"
    at = S.song.get("chorus_at", 4)
    S.anchor(t0, at)
    S.melody(t0, t1, gain=1.1)
    S.cue(t0, f"chorus: the hook from its bar {at + 1} ({S.song['form'][at // 2]}), the song's peak, then its cadence")


def i_end(S, b, t0, t1, data):
    """The end card: the sonic logo in this song's key while the mark draws; the logo's breakout IS the wire snap."""
    pr = b.get("props", {})
    pts, wy = TOKENS["mark"]["price_path_512"], TOKENS["mark"]["wire_y_512"]
    f = (pts[-2][1] - wy) / (pts[-2][1] - pts[-1][1])
    if pr.get("vertexAt"):          # the spec fixes the timing (seconds); otherwise the score publishes it
        va, draw_at = pr["vertexAt"], pr.get("drawAt", 0.0)
    else:
        va, draw_at = [round(x * S.beat, 4) for x in songlib.logo_vertex_beats()], 0.0
        S.end_card = {"drawAt": draw_at, "vertexAt": va}
    snap = t0 + draw_at + va[-2] + f * (va[-1] - va[-2])
    S.anchor(t0)
    for i, k in enumerate(S.bars_in(t0, t1)):
        S.bars[k].energy, S.bars[k].label = 3, "end card"
        if i < 2:
            S.bars[k].logo = i
    S.melody(t0, t1)
    S.ev(snap, "impact", size=0.8)
    S.ducks.append(snap)
    breakout_t = (S.bar_of(t0) + 1) * S.bar
    if (t1 - t0) < 2 * S.bar - 1e-3:
        S.cue(t0, f"warning: the end card is shorter than the logo (2 bars = {2 * S.bar:.2f}s)")
    S.cue(t0, "sonic logo: the mark's nine notes in this song's key")
    S.cue(snap, "the wire snaps" + (" on the logo's breakout note" if abs(snap - breakout_t) < 0.05 else
                                    f" (breakout note is at {breakout_t:.2f}s)"))
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


def i_duel(S, b, t0, t1, data):
    """Two scoreboards race (Duel). The hook plays while the hit rate looks good for the wrong trader; the breakout
    is withheld while the payoff trader sits underwater; the music DROPS on the trade where the payoff trader takes
    the lead for good (the same moment the component turns that total Sodium)."""
    p = b.get("props", {})
    lanes = p.get("lanes")
    if lanes:
        a, c = lanes[0]["trades"], lanes[1]["trades"]
    else:
        d = (S.sim or {}).get("duel") or {}
        a, c = d.get("right", []), d.get("wrong", [])
    ca = cc = 0
    lead = None
    for i in range(min(len(a), len(c))):
        ca += a[i]; cc += c[i]
        lead = (lead if lead is not None else i) if cc > ca else None
    if lead is None:
        return i_default(S, b, t0, t1, data)
    drop = t0 + p.get("startAt", 0.3) + lead * p.get("step", 0.45) + 0.12
    if abs(drop / S.bar - round(drop / S.bar)) > 0.03:
        S.cue(drop, f"warning: the lead flips off the bar grid (set step so trade {lead + 1} lands on a bar line)")
    drop_bar = S.bar_of(drop + 1e-3)
    for k in S.bars_in(t0, t1):
        bar = S.bars[k]
        if k < 2:
            bar.energy, bar.label = 4, "hook: the hit rate looks great"
        elif k < drop_bar:
            bar.energy, bar.drums, bar.label = 3, "full", "the payoff trader underwater"
        else:
            bar.energy, bar.label = 4, "the lead flips: chorus"
    S.melody(t0, S.bar_of(t0) * S.bar + 2 * S.bar)
    S.melody(S.bar_of(t0) * S.bar + 2 * S.bar, drop_bar * S.bar, withhold=True, gain=0.85)
    S.melody(drop_bar * S.bar, t1)
    S.ev(t0, "impact", size=0.7)
    build(S, max(t0 + 2 * S.bar, drop_bar * S.bar - S.bar), drop_bar * S.bar, f"trade {lead + 1}: the lead flips")
    S.anchor(drop_bar * S.bar)
    S.cue(t0, "hook: full groove + the song's hook from frame 0")


def i_runsfan(S, b, t0, t1, data):
    """Many simulated runs. A fan that ends down sinks the harmony (darker chords, breakout withheld); a fan that
    ends up gets a build into a drop on its first bar."""
    k = b.get("props", {}).get("simKey", "runs")
    sim = S.sim or {}
    med = sim.get(f"{k}_median")
    if not med and sim.get(k):
        med = np.median(np.array(sim[k]), axis=0).tolist()
    if not med:
        return i_default(S, b, t0, t1, data)
    m = med[-1] - 1
    if m < 0:
        L = min(0.9, abs(m) * 2.5)
        for kk in S.bars_in(t0, t1):
            bar = S.bars[kk]
            bar.deg, bar.energy, bar.drums, bar.label = S.depth_deg(L), 3, "half", f"runs end {fmt(m)}: sinking"
        S.melody(t0, t1, withhold=True, gain=0.8)
        S.cue(t0, f"runs median {fmt(m)} -> {S.name(S.depth_deg(L))}, half-time, breakout withheld")
    else:
        for kk in S.bars_in(t0, t1):
            S.bars[kk].energy, S.bars[kk].label = 4, f"runs end {fmt(m)}: lift"
        S.melody(t0, t1)
        if t0 >= S.bar:
            build(S, t0 - S.bar, t0, f"runs median {fmt(m)}")
        S.anchor(t0)


def i_distribution(S, b, t0, t1, data):
    """The bad tail of a distribution (the cost of the idea): a breakdown, hook without its breakout."""
    ks = list(S.bars_in(t0, t1))
    for j, kk in enumerate(ks):
        bar = S.bars[kk]
        bar.energy, bar.drums, bar.label = (1 if j < len(ks) - 1 else 2), "break", "the cost: breakdown"
    S.melody(t0, t1, withhold=True, gain=0.6)
    S.cue(t0, "distribution: breakdown, breakout withheld")


def i_rcompare(S, b, t0, t1, data):
    """The same dollars measured with different rulers (RCompare). Full groove from frame 0; a one-bar build drops
    exactly when the R readouts land (revealAt, on a bar line)."""
    reveal = t0 + b.get("props", {}).get("revealAt", 2.0)
    for k in S.bars_in(t0, t1):
        S.bars[k].energy, S.bars[k].label = 4, "hook: two rulers" if k < S.bar_of(reveal) else "the R readouts land"
    S.melody(t0, t1)
    S.ev(t0, "impact", size=0.7)
    if abs(reveal / S.bar - round(reveal / S.bar)) > 0.03:
        S.cue(reveal, "warning: the R readouts land off the bar grid (set revealAt to a bar)")
    if reveal - t0 >= S.bar - 1e-6:
        build(S, reveal - S.bar, reveal, "the rulers draw")
    S.anchor(reveal)
    S.cue(t0, "hook: full groove + the song's hook from frame 0")


def i_rruler(S, b, t0, t1, data):
    """R as a ruler (RRuler). Defining 1R: a quiet set-up (hats, pad, breakout withheld). Measuring: a build while the
    price climbs, dropping on the bar where it lands at its high (the last +R segment stamps); the dashed stop-out
    ghost gets a short fall of its own."""
    p = b.get("props", {})
    off = p.get("timeOffset", 0.0)
    path = p.get("path") or [[0, 50], [8.4, 50.3], [13.6, 58.0], [16, 58.0]]
    measure = t0 + p.get("measureAt", 99) - off
    if not (t0 <= measure < t1):
        for k in S.bars_in(t0, t1):
            S.bars[k].energy, S.bars[k].drums, S.bars[k].label = 3, "half", "1R defined: set-up"
        S.melody(t0, t1, withhold=True, gain=0.8)
        S.ev(t0 + p.get("zoneAt", 1.0) - off, "impact", size=0.5) if t0 <= t0 + p.get("zoneAt", 1.0) - off < t1 else None
        S.cue(t0, "1R defined: half-time groove, breakout withheld")
        return
    top = max(path, key=lambda kv: (kv[1], -kv[0]))
    land = t0 + top[0] - off
    if abs(land / S.bar - round(land / S.bar)) > 0.03:
        S.cue(land, "warning: the climb lands off the bar grid (time the path's high to a bar line)")
    land_bar = S.bar_of(land + 1e-3)
    for k in S.bars_in(t0, t1):
        S.bars[k].energy, S.bars[k].label = (3, "measuring: the climb") if k < land_bar else (4, "+R lands: drop")
    S.melody(t0, land_bar * S.bar, withhold=True, gain=0.9)
    S.melody(land_bar * S.bar, t1)
    build(S, max(t0, land_bar * S.bar - 2 * S.bar), land_bar * S.bar, "the price climbs the ruler")
    S.anchor(land_bar * S.bar)
    g = p.get("ghost")
    if g:
        g_end = t0 + g["at"] - off + g.get("dur", 1.0)
        if t0 < g_end <= t1:
            fall_fill(S, g_end, 0.1)
            S.cue(g_end, "the stop-out ghost: −1R, a short fall")


def i_rtower(S, b, t0, t1, data):
    """Trades counted in R (RTower): the groove counts the trades in; a one-bar build lands on the first bar line after
    the last trade is placed (the total), then the chorus energy carries the dollar conversion."""
    p = b.get("props", {})
    n = len(p.get("trades") or (S.sim or {}).get("trades") or [0] * p.get("n", 20))
    step = p.get("step") or p.get("dur", 4) / max(1, n)
    done = t0 + p.get("startAt", 0.2) + n * step
    land_bar = min(S.bar_of(t1 - 0.01), int(math.ceil(done / S.bar - 1e-3)))
    for k in S.bars_in(t0, t1):
        S.bars[k].energy, S.bars[k].label = (3, "trades counted in") if k < land_bar else (4, "the total in R")
    S.melody(t0, t1)
    if land_bar * S.bar - S.bar >= t0:
        build(S, land_bar * S.bar - S.bar, land_bar * S.bar, "the last trades land")
    S.anchor(land_bar * S.bar)


def i_seesaw(S, b, t0, t1, data):
    """Position sizing as a lever (Seesaw). Mode "shares" (a fixed share count): each wider stop tips the beam and the
    risk multiplies, so the harmony sinks like a loss (depth = 1 − 1/risk multiple) with a fall on each tip and the
    breakout withheld. Mode "risk": each move wobbles and re-levels: a small impact on the level, groove intact."""
    p = b.get("props", {})
    stops = p.get("stopDistance", [1, 2, 4])
    stops = stops if isinstance(stops, list) else [stops]
    mode, start, hold = p.get("mode", "risk"), p.get("startAt", 0.6), p.get("hold", 2.4)
    hook = b.get("kind") == "hook"
    if hook:
        S.ev(t0, "impact", size=0.7)
    if mode == "shares":
        marks = [(t0, 0.0)] + [(t0 + start + (i - 1) * hold + 0.6, 1 - stops[0] / stops[i]) for i in range(1, len(stops))]
        for j, (ta, L) in enumerate(marks):
            tb = marks[j + 1][0] if j + 1 < len(marks) else t1
            if j:
                fall_fill(S, ta, L)
            for k in S.bars_in(ta, tb):
                bar = S.bars[k]
                bar.deg = S.depth_deg(L) if L > 0 else None
                bar.energy = 4 if L == 0 else 3
                bar.label = f"risk x{stops[j] / stops[0]:g}"
            S.melody(ta, tb, withhold=L > 0, gain=1.0 if L == 0 else 0.8)
            S.cue(ta, f"risk x{stops[j] / stops[0]:g}" + (f" -> {S.name(S.depth_deg(L))}, breakout withheld" if L else ": level, the hook"))
        return
    for k in S.bars_in(t0, t1):
        S.bars[k].energy, S.bars[k].label = (4 if hook else 3), "sized to the risk: level"
    S.melody(t0, t1)
    for i in range(1, len(stops)):
        lv = t0 + start + (i - 1) * hold + 1.35
        if lv < t1:
            S.ev(lv, "impact", size=0.45)
            S.cue(lv, f"stop ${stops[i]:g}: shares re-sized, the beam levels")


# PivotStep.tsx PATH: the line crosses the wire at 52.997% of its length
PIVOT_CROSS_FRAC = 0.529974


def i_pivotstep(S, b, t0, t1, data):
    """A legend's pivotal point as our tripwire (PivotStep): WAIT = a breakdown under the wire (breakout withheld),
    a one-bar build, and the drop on the snap; SIT TIGHT = the chorus."""
    p = b.get("props", {})
    snap = t0 + p.get("drawAt", 0.2) + PIVOT_CROSS_FRAC * p.get("drawDur", 4.0)
    if abs(snap / S.bar - round(snap / S.bar)) > 0.03:
        S.cue(snap, "warning: the pivotal point snaps off the bar grid (adjust drawDur)")
    sb = S.bar_of(snap + 1e-3)
    for k in S.bars_in(t0, t1):
        bar = S.bars[k]
        bar.energy, bar.drums, bar.label = (2, "break", "wait: under the wire") if k < sb else (4, "full", "the snap: sit tight")
    S.melody(t0, sb * S.bar, withhold=True, gain=0.7)
    S.melody(sb * S.bar, t1)
    build(S, max(t0, sb * S.bar - S.bar), sb * S.bar, "price reaches the pivotal point")
    S.anchor(sb * S.bar)
    S.cue(snap, "the pivotal point snaps (tripwire)")


def i_fortuneline(S, b, t0, t1, data):
    """A legend's career line (FortuneLine). Wins: a build that drops on the bar where the win lands (or an impact
    when it lands between bars). Losses: a fall into the loss, then darker chords, half-time and the breakout withheld,
    each loss deeper than the last. Milestones only: the groove carries on."""
    p = b.get("props", {})
    rv = p.get("reveal") or {}
    y0, y1 = rv.get("from", 0), rv.get("to", 0)
    at, dur = rv.get("at", 0.2), rv.get("dur", 4)
    focus = {f["year"]: f["at"] for f in p.get("focus") or []}
    marks = []
    for e in p.get("events") or []:
        if e["kind"] == "note":
            continue
        if e["year"] in focus:
            te = t0 + focus[e["year"]]
        elif y0 < e["year"] <= y1 and y1 > y0 and e["kind"] in (p.get("show") or ["win", "loss", "note"]):
            te = t0 + at + dur * (e["year"] - y0) / (y1 - y0)
        else:
            continue
        if t0 <= te < t1:
            marks.append((te, e))
    marks.sort(key=lambda m: m[0])
    for k in S.bars_in(t0, t1):
        S.bars[k].energy, S.bars[k].label = 3, "his story"
    S.melody(t0, t1)
    depth = 0.25
    for te, e in marks:
        if e["kind"] == "win":
            near = round(te / S.bar) * S.bar
            if abs(te - near) < 0.12 * S.bar and near - S.bar >= t0:
                build(S, near - S.bar, near, f"{e['year']}: {e['label'].lower()}")
                S.anchor(near)
                for k in S.bars_in(near, t1):
                    S.bars[k].energy, S.bars[k].deg, S.bars[k].drums, S.bars[k].label = 4, None, "full", f"{e['year']}: the win"
                S.melody(near, t1)
            else:
                S.ev(te, "impact", size=0.7)
                S.cue(te, f"{e['year']}: {e['label'].lower()} (impact)")
        else:
            depth = min(0.9, depth + 0.2)
            fall_fill(S, te, depth)
            for k in S.bars_in(te, t1):
                bar = S.bars[k]
                bar.deg, bar.energy, bar.drums, bar.label = S.depth_deg(depth), 2 if depth > 0.6 else 3, "half", f"{e['year']}: {e['label'].lower()}"
            S.melody(te, t1, withhold=True, gain=0.75)
            S.cue(te, f"{e['year']}: {e['label'].lower()} -> {S.name(S.depth_deg(depth))}, half-time, breakout withheld")


CUP_CROSS_FRAC = 0.902939   # CupHandle: where along the drawn path the price breaks above the handle's high


def i_cuphandle(S, b, t0, t1, data):
    """The cup with handle (CupHandle). Drawing the cup and handle = a breakdown under the line (breakout withheld),
    a one-bar build, the drop on the snap through the buy point. Already drawn (startDrawn 1): the chorus; the loss
    line (stopAt) gets an impact on its bar."""
    p = b.get("props", {})
    if p.get("startDrawn", 0) >= CUP_CROSS_FRAC:
        for k in S.bars_in(t0, t1):
            S.bars[k].energy, S.bars[k].label = 4, "the rule: chorus"
        S.melody(t0, t1)
        if p.get("stopAt") is not None:
            S.ev(t0 + p["stopAt"], "impact", size=0.6)
            S.cue(t0 + p["stopAt"], "the loss line lands")
        return
    snap = t0 + p.get("drawAt", 0.2) + CUP_CROSS_FRAC * p.get("drawDur", 5.0)
    if abs(snap / S.bar - round(snap / S.bar)) > 0.03:
        S.cue(snap, "warning: the buy point snaps off the bar grid (adjust drawDur)")
    sb = S.bar_of(snap + 1e-3)
    for k in S.bars_in(t0, t1):
        bar = S.bars[k]
        bar.energy, bar.drums, bar.label = (2, "break", "the cup forms") if k < sb else (4, "full", "the break: chorus")
    S.melody(t0, sb * S.bar, withhold=True, gain=0.7)
    S.melody(sb * S.bar, t1)
    build(S, max(t0, sb * S.bar - S.bar), sb * S.bar, "price reaches the buy point")
    S.anchor(sb * S.bar)
    S.cue(snap, "the buy point snaps (tripwire)")


def i_averagedown(S, b, t0, t1, data):
    """Averaging down on a real chart (AverageDown). Each buy lands with a fall sized by how far the stock is below
    its high; the deeper it goes, the darker the chords (depth ladder), half-time below -50%, breakout withheld. The
    tells are a breakdown; the one-stop rule is the chorus with an impact where the stop fires."""
    p = b.get("props", {})
    bars = (data or {}).get("bars") or []
    if not bars:
        return i_default(S, b, t0, t1, data)
    if p.get("stopAt") is not None:
        for k in S.bars_in(t0, t1):
            S.bars[k].energy, S.bars[k].label = 4, "the rule: one stop"
        S.melody(t0, t1)
        S.ev(t0 + p["stopAt"], "impact", size=0.8)
        S.cue(t0 + p["stopAt"], "the stop: out small")
        return
    rv = p.get("reveal") or {}
    closes = [x["c"] for x in bars]
    n = len(closes)
    idx = lambda d: next((i for i, x in enumerate(bars) if x["t"] >= d), n - 1)
    i0, i1 = idx(rv.get("from", bars[0]["t"])), idx(rv.get("to", bars[-1]["t"]))
    at, dur = rv.get("at", 0.2), max(0.01, rv.get("dur", 4))
    pk = 0
    for i in range(n):
        if bars[i]["t"] <= p.get("peakBefore", "2000-12-31") and closes[i] > closes[pk]:
            pk = i
    P = closes[pk]
    first, step, mx = p.get("firstPct", 0.25), p.get("stepPct", 0.2), p.get("maxBuys", 5)
    buys = []
    for i in range(pk, n):
        if len(buys) >= mx:
            break
        last = closes[buys[-1]] if buys else None
        if (last is None and closes[i] <= P * (1 - first)) or (last is not None and closes[i] <= last * (1 - step)):
            buys.append(i)
    t_of = lambda i: t0 + at + dur * (i - i0) / max(1, i1 - i0)
    head_dd = 1 - min(closes[i0:i1 + 1] or [P]) / P if i1 > i0 else 1 - closes[i1] / P
    if p.get("tellsAt") is not None or i1 <= i0:
        L = head_dd
        for k in S.bars_in(t0, t1):
            bar = S.bars[k]
            bar.deg, bar.energy, bar.drums, bar.label = S.depth_deg(min(0.9, L)), 2, "break", f"the tells, {fmt(-L)}"
        S.melody(t0, t1, withhold=True, gain=0.6)
        S.cue(t0, f"tells: breakdown at depth {fmt(-L)}")
        return
    marks = [(t0, 0.0)] + [(t_of(i), 1 - closes[i] / P) for i in buys if i0 < i <= i1]
    if i1 > i0:
        lo = min(range(i0, i1 + 1), key=lambda i: closes[i])
        if not buys or lo > buys[-1]:
            marks.append((t_of(lo), 1 - closes[lo] / P))
    # buys closer than two beats merge into one fall (the deepest), so the runs never pile on each other
    merged = [marks[0]]
    for m in marks[1:]:
        if len(merged) > 1 and m[0] - merged[-1][0] < 2 * S.beat:
            merged[-1] = m
        else:
            merged.append(m)
    marks = merged
    for j, (ta, L) in enumerate(marks):
        tb = marks[j + 1][0] if j + 1 < len(marks) else t1
        if j:
            fall_fill(S, ta, L)
        for k in S.bars_in(ta, tb):
            bar = S.bars[k]
            bar.deg = S.depth_deg(L) if L >= 0.35 else None
            bar.energy = 4 if L < 0.3 else 3 if L < 0.6 else 2
            bar.drums = "full" if L < 0.5 else "half"
            bar.label = f"down {fmt(-L)}"
        S.melody(ta, tb, withhold=L >= 0.35, gain=1.0 if L < 0.5 else 0.7)


def i_twinpaths(S, b, t0, t1, data):
    """One run sized two ways (TwinPaths). Drawing: the groove with the breakout withheld while the drawdowns shade;
    the worst-drop markers (ddAt) get a fall the size of the loud line's drop; the end values (finalAt) land as the
    chorus."""
    p = b.get("props", {})
    tw = (S.sim or {}).get(p.get("simKey", "twin")) or {}
    dd = abs(min((tw.get("maxdd") or {"x": -0.2}).values()))
    if p.get("finalAt") is not None:
        for k in S.bars_in(t0, t1):
            S.bars[k].energy, S.bars[k].label = 4, "the end values"
        S.melody(t0, t1)
        S.ev(t0 + p["finalAt"], "impact", size=0.7)
        return
    for k in S.bars_in(t0, t1):
        S.bars[k].energy, S.bars[k].label = 3, "same trades, two sizes"
    S.melody(t0, t1, withhold=True, gain=0.85)
    if p.get("ddAt") is not None and t0 + p["ddAt"] < t1:
        fall_fill(S, t0 + p["ddAt"], dd)


def i_listcard(S, b, t0, t1, data):
    """A list (ListCard), read by beat kind. Mistakes: darker chords, half-time, breakout withheld, a fall when the
    second item (the slide) lands, and a one-bar build out of it into whatever comes next. Why-a-legend: the groove
    with the hook, saving the chorus for the rules. Anything else (rules, lessons, agreements): the chorus."""
    kind = b.get("kind", "")
    at = (b.get("props") or {}).get("at") or []
    if kind in ("mistakes", "misses", "failure"):
        L = 0.5
        for k in S.bars_in(t0, t1):
            bar = S.bars[k]
            bar.deg, bar.energy, bar.drums, bar.label = S.depth_deg(L), 2, "half", "the misses: darker, half-time"
        S.melody(t0, t1 - S.bar, withhold=True, gain=0.7)
        if len(at) > 1:
            fall_fill(S, S.bar_of(t0 + at[1] + S.bar * 0.5) * S.bar, L)
        if t1 - t0 >= 3 * S.bar:
            build(S, t1 - S.bar, t1, "out of the misses, into the rules")
        S.cue(t0, f"mistakes -> {S.name(S.depth_deg(L))}, half-time, breakout withheld")
        return
    if kind in ("why_legend", "who", "record"):
        for k in S.bars_in(t0, t1):
            S.bars[k].energy, S.bars[k].label = 3, kind
        S.melody(t0, t1)
        return
    return i_rule(S, b, t0, t1, data)


INTERPRETERS = {"ThePit": i_thepit, "Duel": i_duel, "RunsFan": i_runsfan, "Distribution": i_distribution, "CandleChart": i_candlechart, "Anatomy": i_candlechart, "MythCard": i_myth,
                "RuleCard": i_rule, "EndCard": i_end,
                "RCompare": i_rcompare, "RRuler": i_rruler, "RTower": i_rtower, "Seesaw": i_seesaw, "PivotStep": i_pivotstep,
                "FortuneLine": i_fortuneline, "ListCard": i_listcard,
                "CupHandle": i_cuphandle, "AverageDown": i_averagedown, "TwinPaths": i_twinpaths}
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


def snare():
    """A tight acoustic-style snare for breaks, drum & bass and hip hop: a tuned body under a burst of noise."""
    n = int(0.3 * SR)
    t = tt(n)
    f = 185 * (1 + 0.3 * np.exp(-t / 0.01))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05) * 0.55
    noise = hp(rng.standard_normal(n)) * np.exp(-t / 0.09) * 0.35
    return np.tanh(1.4 * (body + noise)) * 0.8


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


def additive(f, n, nh, tilt=1.0, decay=None, odd=False):
    """Band-limited saw-like tone (square-like with odd=True); `decay` gives a natural filter envelope."""
    t = tt(n)
    s = np.zeros(n)
    for h in range(1, nh + 1, 2 if odd else 1):
        if f * h > 14000:
            break
        a = 1 / h ** tilt
        if decay:
            a = a * np.exp(-t * decay * (h - 1))
        s += a * np.sin(2 * np.pi * f * h * t + 0.37 * h)
    return s


def _env(t, dur, attack, hold_decay, release):
    sus = np.exp(-dur / hold_decay)
    return np.minimum(1, t / attack) * np.where(t < dur, np.exp(-t / hold_decay), sus * np.exp(-(t - dur) / release))


def lead_note(m, dur, vel):
    """pluck: the v3 lead (saw with a filter envelope, a sub-octave body, delayed vibrato)."""
    n = int((dur + 0.35) * SR)
    t = tt(n)
    f = mtof(m)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.15) / 0.2, 0, 1)
    tone = additive(f, n, 14, 1.0, decay=3.0) * 0.55 + additive(f * 1.003, n, 8, 1.2, decay=4.0) * 0.35
    tone += np.sin(2 * np.pi * f * 0.5 * np.cumsum(vib) / SR) * 0.25          # sub-octave body
    env = np.minimum(1, t / 0.006) * np.where(t < dur, np.exp(-t / (0.9 + dur)), np.exp(-dur / (0.9 + dur)) * np.exp(-(t - dur) / 0.09))
    return tone * env * vel * 0.32


def supersaw(m, dur, vel):
    """Five detuned saws, slower attack, held: the big trance/house lead."""
    n = int((dur + 0.35) * SR)
    t = tt(n)
    f = mtof(m)
    tone = sum(additive(f * (1 + d), n, 10, 1.0, decay=1.2) for d in (-0.011, -0.005, 0.0, 0.006, 0.012)) / 3.0
    return tone * _env(t, dur, 0.014, 1.6 + dur, 0.14) * vel * 0.32


def square_lead(m, dur, vel):
    """A soft band-limited square with vibrato: hollow, vocal, cuts through without brightness."""
    n = int((dur + 0.3) * SR)
    t = tt(n)
    f = mtof(m)
    tone = additive(f, n, 15, 1.0, decay=2.0, odd=True) + 0.3 * np.sin(2 * np.pi * f * t)
    tone *= 1 + 0.003 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.12) / 0.2, 0, 1)
    return tone * _env(t, dur, 0.008, 1.2 + dur, 0.08) * vel * 0.3


def bell(m, dur, vel):
    """FM bell (ratio 3.5): a glassy, percussive lead that rings over the groove."""
    n = int((dur + 0.6) * SR)
    t = tt(n)
    f = mtof(m)
    idx = 2.2 * np.exp(-t / 0.18) + 0.25
    tone = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * 3.5 * f * t)) + 0.25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.3)
    return tone * np.minimum(1, t / 0.003) * np.exp(-t / (0.45 + 0.4 * dur)) * vel * 0.3


def glide(m, dur, vel, prev=None):
    """A mono saw that slides in from the previous note (portamento): a singing, vocal line."""
    n = int((dur + 0.3) * SR)
    t = tt(n)
    f1 = mtof(m)
    f0 = mtof(prev) if prev is not None else f1
    f = f1 + (f0 - f1) * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = sum(np.sin(h * ph + 0.37 * h) / h * np.exp(-t * 2.0 * (h - 1)) for h in range(1, 13) if f1 * h < 14000)
    return tone * _env(t, dur, 0.01, 1.4 + dur, 0.1) * vel * 0.3


LEADS = {"pluck": lead_note, "supersaw": supersaw, "square": square_lead, "bell": bell, "glide": glide}


def _phrase_lufs(fn):
    x = np.zeros(int(3.0 * SR))
    for i, m in enumerate((69, 72, 76, 74, 81, 79)):
        sig = fn(m, 0.4, 1.0)
        j = int(i * 0.45 * SR)
        x[j:j + len(sig)] += sig[: len(x) - j]
    return lufs(x)


# every lead patch sits at the pluck's loudness (BS.1770, so a bright bell is not louder than a hollow square)
LEAD_GAIN = {k: (1.0 if k == "pluck" else 10 ** ((_phrase_lufs(lead_note) - _phrase_lufs(fn)) / 20)) for k, fn in LEADS.items()}


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


def sub_note(m, dur, vel=0.8):
    """A long, round sub (hip hop / drum & bass): sine + a touch of second harmonic, slow decay."""
    n = int((dur + 0.02) * SR)
    t = tt(n)
    f = mtof(m)
    s = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(4 * np.pi * f * t)
    env = np.minimum(1, t / 0.006) * np.exp(-t / 1.1)
    env[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
    return np.tanh(1.3 * s) * env * vel * 0.55


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


def registers(song):
    """Bass tonic in E2..D#3; lead tonic placed so the hook's middle sits around C#5."""
    pc = song["key"] % 12
    root = 40 + ((pc - 4) % 12)
    med = float(np.median([n["semis"] for n in song["melody"]]))
    lead = min((pc + 12 * o for o in range(4, 7)), key=lambda r: abs(r + med - 73.5))
    return root, lead


def render(S, stems=None):
    """Mix the arrangement. `stems` (a dict) receives the pre-master buses for QA (lead audibility, balance)."""
    sg = S.song
    n = int(round(S.dur * SR))
    root, lead_root = registers(sg)
    G = GROOVES[sg["groove"]]
    drums = np.zeros((2, n))
    bass = np.zeros((2, n))
    chords = np.zeros((2, n))
    lead = np.zeros((2, n))
    fx = np.zeros((2, n))
    K, CL, HC, HO = kick(), clap(), hat(), hat(True)
    SN = snare() if G["snd"] == "snare" else CL
    lead_fn, lead_gain = LEADS[sg["lead"]], LEAD_GAIN[sg["lead"]]
    kicks = []
    step = S.beat / 4
    swing = sg.get("swing", 0.0)
    prev_m = None

    def swing_t(t, k):
        return t + (swing * step if k % 2 == 1 else 0.0)

    for bi, bar in enumerate(S.bars):
        t_bar = bi * S.bar
        offs = bar.ch["offs"]
        boff = offs[0]
        e = bar.energy
        # --- drums
        turn = G.get("turn") if bar.j % 4 == 3 else None
        kick_steps, snare_steps, ghosts = (turn or G)["kick"], (turn or G)["snare"], G["ghost"]
        if bar.drums == "half":
            kick_steps, snare_steps, ghosts = [0, 10], [8], []
        if bar.drums == "break":
            kick_steps, snare_steps, ghosts = [], [], []
        for k in range(16):
            t = swing_t(t_bar + k * step, k)
            if t >= S.dur:
                break
            if bar.drums == "none" or e == 0:
                continue
            if e >= 2 and k in kick_steps:
                place(drums, t, K, 0, 1.0)
                kicks.append(t)
            if e >= 3 and k in snare_steps:
                place(drums, t + G.get("lazy", 0.0) * S.beat, SN, 0.05, 0.85)
            if e >= 3 and k in ghosts:
                place(drums, t, SN, -0.1, 0.2)
            if e >= 1:
                hats = G["hats"]
                if hats == "house":
                    if k % 4 == 2:
                        place(drums, t, HO, 0.25, 0.55 if e >= 3 else 0.35)
                    elif e >= 3 or k % 2 == 0:
                        place(drums, t, HC, -0.25, 0.32 if k % 2 else 0.22)
                elif hats == "house16":
                    if k % 4 == 2:
                        place(drums, t, HO, 0.25, 0.5 if e >= 3 else 0.32)
                    elif e >= 2 or k % 2 == 0:
                        place(drums, t, HC, -0.25, (0.3, 0.18, 0.26, 0.2)[k % 4])
                elif hats == "offbeat":
                    if k % 4 == 2:
                        place(drums, t, HO, 0.25, 0.55 if e >= 3 else 0.35)
                    elif k % 4 == 3 and e >= 3:
                        place(drums, t, HC, -0.25, 0.2)
                else:   # eighths
                    if k % 2 == 0:
                        place(drums, t, HC, -0.2, 0.3 if k % 4 == 0 else 0.22)
                    if k == 14 and e >= 3:
                        place(drums, t, HO, 0.25, 0.35)
        # --- bass
        if e >= 3:
            if sg["bass"] == "rolling":       # offbeat eighths on the root, an octave jump to keep it moving
                for k in (2, 6, 10, 14):
                    bt = t_bar + k * step
                    if bt < S.dur:
                        place(bass, bt, bass_note(root + boff + (12 if k == 14 else 0), step * 1.6), 0, 0.9)
            else:
                voice = sub_note if sg["bass"] == "sub" else bass_note
                for k, ln, add, vel in BASSLINES[sg["bass"]]:
                    bt = t_bar + k * step
                    if bt < S.dur:
                        place(bass, bt, voice(root + boff + add, step * ln, vel), 0, 0.9)
        elif e == 2:
            place(bass, t_bar, bass_note(root + boff, S.bar * 0.9, 0.7), 0, 0.9)
        # --- chords: pad every bar; an arp (or offbeat stabs) at full energy
        notes = [root + 12 + v for v in offs]
        if e >= 1:
            place(chords, t_bar, pad_chord(notes, min(S.bar, S.dur - t_bar)), 0, 0.85 if e >= 3 else 0.7)
        if e >= 4:
            if sg["arp"] in ARPS:
                arp = sorted(notes) + [notes[0] + 12]
                pat = ARPS[sg["arp"]]
                for k in range(16):
                    at = swing_t(t_bar + k * step, k)
                    if at < S.dur:
                        place(chords, at, pluck(arp[pat[k % 8]] + 12, 0.35 if k % 2 else 0.5), (-0.4, 0.4)[k % 2], 0.6)
            else:
                for k in (2, 6, 10, 14):
                    at = t_bar + k * step
                    if at < S.dur:
                        for i, m in enumerate(sorted(notes)[1:]):
                            place(chords, at, pluck(m + 12, 0.32), (-0.3, 0.0, 0.3)[i % 3], 0.6)
        # --- the hook (or the sonic logo on the end card), every note bent into the bar's chord scale
        if bar.melody:
            withhold, gain = bar.melody
            src = songlib.logo_notes(S.mode) if bar.logo is not None else sg["melody"]
            idx = bar.logo if bar.logo is not None else bar.m
            for nt in sorted((x for x in src if x["bar"] == idx), key=lambda x: x["step"]):
                if withhold and nt["breakout"]:
                    continue                          # still in the pit: the breakout does not sound
                t = t_bar + nt["step"] * step
                if t < S.dur:
                    m = lead_root + songlib.fit(nt["semis"], bar.ch["scale"])
                    dur = nt["len"] * step * 0.92
                    sig = lead_fn(m, dur, 0.85 * gain, prev_m) if sg["lead"] == "glide" else lead_fn(m, dur, 0.85 * gain)
                    place(lead, t, sig, 0, lead_gain)
                    prev_m = m
    # --- story events
    tonic_scale = songlib.MODES[S.mode]
    for t, kind, p in S.events:
        if kind == "impact":
            place(fx, t, impact(p["size"]), 0, 0.7)
        elif kind == "riser":
            place(fx, t, riser(p["dur"], p.get("unresolved", False)), 0, 0.7)
        elif kind == "roll":
            d = p["dur"]
            tr = t
            while tr < t + d - 1e-6:
                x = (tr - t) / d
                place(drums, tr, CL, 0.0, 0.18 + 0.55 * x)
                tr += S.beat / 2 if x < 0.5 else S.beat / 4
        elif kind == "fall":
            m = songlib.fit(int(round(p["semis"])), tonic_scale)    # the fall walks down the key, not chromatically
            place(drums, t, tom(mtof(root + 12 + m)), 0.1, p["vel"])
            place(bass, t, bass_note(root + 12 + m, S.beat / 4 * 0.9, 0.6), 0, 0.8)
    # --- sidechain pump (the continuous motion) on bass, chords and a little on the lead
    pump = np.ones(n)
    for kt in kicks:
        i = int(kt * SR)
        L = min(n - i, int(S.beat * SR))
        if L > 0:
            pump[i:i + L] = np.minimum(pump[i:i + L], 1 - 0.6 * np.exp(-np.arange(L) / (0.075 * SR)))
    lead_bus = delay(lead, S.beat * 0.75)
    music = drums + bass * pump + chords * pump + lead_bus * (0.6 + 0.4 * pump)
    if stems is not None:
        stems.update(drums=drums, bass=bass * pump, chords=chords * pump, lead=lead_bus * (0.6 + 0.4 * pump))
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


def compose_spec(spec, song, data=None, sim=None):
    S = Arrangement(spec["duration_s"], song)
    S.sim = sim
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
    return S


def compose(eid, song=None):
    spec = json.load(open(os.path.join(ROOT, "episodes", eid, "spec.json")))
    dp = os.path.join(ROOT, "episodes", eid, "data.json")
    data = json.load(open(dp)) if os.path.exists(dp) else None
    sp = os.path.join(ROOT, "episodes", eid, "sim.json")
    sim = json.load(open(sp)) if os.path.exists(sp) else None
    song = song or songlib.load_or_design(eid, spec["pillar"])
    return spec, compose_spec(spec, song, data, sim)


def summary(S):
    sg = S.song
    return {"id": sg.get("id"), "key": sg["key_name"], "bpm": round(sg["bpm"], 2), "genre": sg["genre"], "groove": sg["groove"],
            "progression": songlib.names(sg), "lead": sg["lead"], "bass": sg["bass"], "arp": sg["arp"], "swing": sg.get("swing", 0)}


def main():
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    eid, report = a[0], "--report" in a
    song = json.load(open(a[a.index("--song") + 1])) if "--song" in a else None
    spec, S = compose(eid, song)
    if spec.get("score") is False:
        print(f"{eid}: score disabled in spec"); return
    sm = summary(S)
    print(f"{eid}: song {sm['id']} · {sm['key']} · {sm['bpm']:.1f} BPM {sm['genre']} ({sm['groove']}) · {' '.join(sm['progression'])} · "
          f"lead {sm['lead']}, bass {sm['bass']}, arp {sm['arp']} · bar {S.bar:.3f}s · {S.dur / S.bar:.2f} bars")
    for i, bar in enumerate(S.bars):
        mel = f"{S.phrase_label(bar)}{' (no breakout)' if bar.melody[0] else ''}" if bar.melody else "-"
        print(f"  bar {i + 1:2d} {i * S.bar:5.1f}s  {bar.ch['name']:4} energy {bar.energy} {bar.drums:5}  {mel:22} {bar.label}")
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
    # the tripwire snap in this song's key: its chime lands on the tonic (the logo's breakout note), E5..D#6
    tonic = 76 + ((S.song["key"] - 4) % 12)
    gen_cues.write_wav(os.path.join(out, f"{eid}-snap.wav"), gen_cues.master(gen_cues.snap(tonic).astype(np.float64)))
    if song is not None:
        print(f"audition only: wrote engine/public/score/{eid}.wav (score.json untouched)")
        return
    bars_out = [{"bar": i + 1, "t": round(i * S.bar, 3), "chord": b.ch["name"], "energy": b.energy, "drums": b.drums,
                 "melody": (S.phrase_label(b) + ("-" if b.melody[0] else "")) if b.melody else None, "label": b.label}
                for i, b in enumerate(S.bars)]
    sheet = {"id": eid, "song": sm, "genre": sm["genre"], "bpm": sm["bpm"], "bars": round(S.dur / S.bar, 2),
             "loop_aligned": abs(S.dur / S.bar - round(S.dur / S.bar)) < 0.02, "lufs": round(L, 1), "true_peak_db": round(P, 1),
             "generator": "scripts/sound/score.py (v4)", "arrangement": bars_out, "cues": S.cues}
    if S.end_card:
        sheet["end_card"] = S.end_card
    with open(os.path.join(ROOT, "episodes", eid, "score.json"), "w") as f:
        json.dump(sheet, f, indent=1)
    print(f"wrote engine/public/score/{eid}.wav, {eid}-snap.wav (snap chime on {songlib.KEY_NAMES[S.song['key']]}) and episodes/{eid}/score.json")


if __name__ == "__main__":
    main()
