#!/usr/bin/env python3
"""
Score an episode from its own data: "drawn from data, not hindsight", now also heard.

  python scripts/sound/score.py L0001            -> engine/public/score/L0001.wav + episodes/L0001/score.json
  python scripts/sound/score.py L0001 --report   -> cue sheet + loudness only

No samples, no loops, no licences (compliance rule 9): every voice is synthesised with numpy, deterministically.

How the music reads the episode
  Percent is pitch.  One semitone per 100/12 % (an octave = 100%). A fall of L is a quick descending run of 12·L
                     semitones; the climb back is a steady ascending run of 12·L/(1−L) semitones played at a fixed
                     "effort" pace (CLIMB_RATE notes per second). Small pits: the climb is barely longer than the fall.
                     −50%: the fall is a tritone, the climb a full octave. −75% and −90%: the climb cannot finish
                     before the beat ends, so it stays unresolved and fades upward. The asymmetry is heard, not told.
  Depth is darkness. The pad chord, filter brightness and a low drone follow the depth of the pit (or the drawdown
                     of a real chart): Dm9 near the surface, Bbmaj7, Gm9, E half-diminished, A7(b9) at the bottom.
  Charts sing.       A soft "price voice" traces revealed closes (pitch = % from the peak, same scale); when the
                     tripwire snaps the harmony resolves to D major (the release).
  Myths hold.        The misconception beat drops to one suspended note; the math lands as a chord.
  Rules resolve.     Bbmaj9 -> F/A -> Dm9, warm and settled.
  The mark is the motif. The end card plays the logo's own price path (tokens.mark: three shrinking pullbacks, then
                     the breakout) note by note as the line draws, and the wire snap lands on a D major chord.
Mix: a bed at about -24 LUFS that ducks under every sound cue, so captions, cues and silence still lead.
Every component the interpreter does not know gets a quiet, steady texture by beat kind.
"""
import json, math, os, sys, wave
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SR = 48000
BPM = 90                      # 0.667 s per beat = 20 frames at 30 fps: musical time lands on frames
BEAT = 60 / BPM
CLIMB_RATE = 6.0              # notes per second: the pace of "effort"
TARGET_LUFS = -24.0
SCALE = [0, 2, 3, 5, 7, 8, 10]  # D natural minor
TONIC = 62                    # D4
TOKENS = json.load(open(os.path.join(ROOT, "brand", "tokens.json")))

sys.path.insert(0, os.path.dirname(__file__))
from gen_cues import lufs, true_peak_db, filt  # same BS.1770 meter as the cues

rng = np.random.default_rng(1)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def quant(m):
    """Nearest D-minor scale note to a (fractional) MIDI pitch."""
    best = None
    for o in range(-3, 6):
        for d in SCALE:
            n = TONIC - 12 + 12 * o + d
            if best is None or abs(n - m) < abs(best - m):
                best = n
    return best


def scale_run(start, semis, direction):
    """Scale notes from `start` moving `semis` semitones up (+1) or down (-1), excluding the start note."""
    out, n = [], start
    target = start + direction * semis
    while (direction > 0 and n < target - 0.5) or (direction < 0 and n > target + 0.5):
        n = n + direction
        while (n - (TONIC - 12)) % 12 not in SCALE:
            n += direction
        out.append(n)
    return out


# ---------------------------------------------------------------- score model
class Score:
    def __init__(self, dur):
        self.dur = dur
        self.notes = []      # (t, dur, midi, vel, voice, pan)
        self.pads = []       # (t0, t1, [midis], brightness 0..1, gain)
        self.bass = []       # (t0, t1, midi, gain)
        self.ticks = []      # (t, vel)
        self.drone = []      # (t0, t1, depth 0..1)
        self.ducks = []      # times of sound cues to duck under
        self.cues = []       # human-readable cue sheet

    def cue(self, t, what):
        self.cues.append({"t": round(t, 2), "cue": what})

    def note(self, t, d, m, v=0.6, voice="pluck", pan=0.0):
        if 0 <= t < self.dur:
            self.notes.append((t, d, m, v, voice, pan))


CHORDS = [  # (depth threshold, name, bass, voicing)
    (0.15, "Dm9", 50, [62, 65, 69, 72, 76]),
    (0.35, "Bbmaj7", 46, [58, 62, 65, 69, 74]),
    (0.60, "Gm9", 43, [58, 62, 65, 69, 70]),
    (0.80, "Eø7", 40, [55, 58, 62, 64, 67]),
    (1.01, "A7b9", 45, [57, 61, 64, 67, 70]),
]
DMAJ = ("D(add9)", 50, [62, 66, 69, 74, 76])


def chord_for(depth):
    for th, name, b, v in CHORDS:
        if depth < th:
            return name, b, v
    return CHORDS[-1][1:]


def harmony(S, t0, t1, depth, gain=0.5, label=None):
    name, b, v = chord_for(depth)
    S.pads.append((t0, t1, v, max(0.15, 1 - depth), gain))
    S.bass.append((t0, t1, b, 0.55 * gain + 0.25 * depth))
    if depth > 0.3:
        S.drone.append((t0, t1, depth))
    S.cue(t0, label or f"{name} (depth {depth:.2f})")


def pulse(S, t0, t1, vel=0.35, every=0.5):
    """Ticker-tape clock on eighth notes: time passing, quietly."""
    t = math.ceil(t0 / (BEAT * every)) * BEAT * every
    while t < t1 - 0.05:
        accent = 1.0 if abs((t / BEAT) % 2) < 1e-6 else 0.7
        S.ticks.append((t, vel * accent))
        t += BEAT * every


def fall_climb(S, t_fall, fall_dur, t_climb, climb_end, L, start=74):
    """The heart of The Pit: the fall spans 12·L semitones fast; the climb needs 12·L/(1−L) at a steady pace."""
    gain = L / (1 - L) if L < 1 else 99
    fall = scale_run(start, 12 * L, -1)
    for i, n in enumerate(fall):
        f = (i + 1) / max(1, len(fall))
        S.note(t_fall + fall_dur * (f ** 0.7) * 0.9, 0.5, n, 0.55, "pluck", -0.3)
    floor = fall[-1] if fall else start
    climb = scale_run(floor, 12 * gain, +1)
    room = max(0.0, climb_end - t_climb)
    fits = int(room * CLIMB_RATE)
    played = climb[:fits]
    for i, n in enumerate(played):
        top = max(0.0, (n - 84) / 24)                                     # fade as it runs out of range
        S.note(t_climb + i / CLIMB_RATE, 0.45, n, 0.5 * (1 - 0.8 * min(1, top)) * (0.9 + 0.1 * (i % 2)), "pluck", 0.3)
    resolved = len(played) == len(climb)
    if resolved and played:
        S.note(t_climb + len(played) / CLIMB_RATE, 1.6, played[-1] - 12, 0.45, "bell", 0.0)
    S.cue(t_fall, f"fall {fmt(-L)}: {len(fall)} notes down in {fall_dur:.2f}s")
    S.cue(t_climb, f"climb {fmt(gain)}: {len(climb)} notes needed, {len(played)} played" + ("" if resolved else " - UNRESOLVED"))
    S.ducks += [t_fall, t_climb]


def fmt(x):
    return f"{'+' if x >= 0 else '−'}{abs(x) * 100:.0f}%"


# ---------------------------------------------------------------- interpreters (one per component)
def i_thepit(S, b, t0, t1, data):
    p = b.get("props", {})
    keys = p.get("keys")
    if keys:
        # keyframed sweep: every new depth is a fall + the climb it would need, until the next change
        holds = []
        for (ka, la), (kb, lb) in zip(keys, keys[1:]):
            if lb != la:
                holds.append((t0 + ka, t0 + kb, lb))
        prev = keys[0][1]
        first_end = holds[0][0] if holds else t1
        fall_climb(S, t0 + 0.1, 0.35, t0 + 0.5, first_end - 0.05, prev)
        harmony(S, t0, first_end, prev, 0.45)
        for k, (ta, tb, L) in enumerate(holds):
            nxt = holds[k + 1][0] if k + 1 < len(holds) else t1
            fall_climb(S, ta, max(0.3, tb - ta), tb + 0.05, nxt - 0.1, L, start=74)
            harmony(S, ta, nxt, L, 0.45 + 0.2 * L)
        pulse(S, t0, t1, 0.25 + 0.1 * max(k[1] for k in keys))
        return
    L = p.get("lossPct", 0.5)
    dig_at = t0 + p.get("digAt", 0.15)
    dig_dur = p.get("digDur", 0.8)
    climb_at = t0 + p.get("climbAt", 1.05)
    harmony(S, t0, t1, 0.0 if b.get("kind") == "hook" else min(L, 0.45), 0.4)
    fall_climb(S, dig_at, dig_dur, climb_at, t1 - 0.2, L)
    if b.get("kind") != "hook":
        pulse(S, t0, t1, 0.22)


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
    snap_t = None
    if tw.get("price"):
        start_i = next((i for i, x in enumerate(bars) if x["t"] >= str(tw.get("from", ""))), 0)
        k = next((i for i in range(start_i + 1, n) if closes[i] > tw["price"]), None)
        if k is not None:
            snap_t = t0 + rev_at + rev_dur * (k + 1) / n
            S.ducks.append(snap_t)
    # the price voice: one note per eighth note, pitch = % from the running peak (12 semitones = 100%)
    step = BEAT / 2
    t = t0 + rev_at
    while t < min(t1, t0 + rev_at + rev_dur):
        i = min(n - 1, int((t - t0 - rev_at) / rev_dur * n))
        dd = 1 - closes[i] / peak[i]
        S.note(t, step * 1.6, quant(74 - 12 * dd), 0.32, "price", 0.15)
        t += step
    # harmony follows the drawdown, but only changes on bar lines (2 beats) and only for a real move (hysteresis)
    end_h = snap_t if snap_t else t1
    bar = 2 * BEAT
    seg_start, seg_depth = t0, 0.0
    t = t0
    while t < end_h - 0.05:
        i = min(n - 1, max(0, int((t + bar / 2 - t0 - rev_at) / rev_dur * n)))
        dd = float(1 - closes[i] / peak[i])
        if abs(dd - seg_depth) >= 0.2:
            harmony(S, seg_start, t, seg_depth, 0.42, f"chart drawdown {seg_depth:.2f}")
            seg_start, seg_depth = t, round(dd, 2)
        t += bar
    harmony(S, seg_start, end_h, seg_depth, 0.42, f"chart drawdown {seg_depth:.2f}")
    if snap_t and snap_t < t1:
        name, bass, v = DMAJ
        S.pads.append((snap_t, t1, v, 1.0, 0.55))
        S.bass.append((snap_t, t1, bass, 0.5))
        for j, m in enumerate([62, 66, 69, 74]):
            S.note(snap_t + 0.02 * j, 2.5, m, 0.5, "bell", -0.2 + 0.13 * j)
        S.cue(snap_t, "tripwire snaps: resolve to D major")
    pulse(S, t0, end_h, 0.32)


def i_myth(S, b, t0, t1, data):
    fact = t0 + b.get("props", {}).get("factAt", 1.6)
    S.pads.append((t0, fact, [69], 0.3, 0.35))   # one suspended note: wait
    S.cue(t0, "myth: one held A, no pulse")
    S.pads.append((fact, t1, [62, 65, 69, 72], 0.5, 0.45))
    S.bass.append((fact, t1, 38, 0.6))
    for j, m in enumerate([50, 57, 62, 65]):
        S.note(fact + 0.03 * j, 2.2, m, 0.55, "pluck", -0.2 + 0.13 * j)
    S.cue(fact, "the math lands: D minor")
    S.ducks.append(fact)


def i_rule(S, b, t0, t1, data):
    seq = [("Bbmaj9", 46, [58, 62, 65, 69, 72]), ("F/A", 45, [57, 60, 65, 69, 72]), ("Dm9", 50, [62, 65, 69, 72, 76])]
    seg = (t1 - t0) / len(seq)
    for k, (name, bass, v) in enumerate(seq):
        a = t0 + k * seg
        S.pads.append((a, a + seg + 0.4, v, 0.75, 0.5))
        S.bass.append((a, a + seg, bass, 0.5))
        S.note(a + 0.02, 1.5, v[-1], 0.35, "bell", 0.2)
        S.cue(a, f"rule: {name}")
    pulse(S, t0, t1, 0.18, every=1.0)


def bezier_y_at_x(x, p):
    """CSS cubic-bezier(p0,p1,p2,p3): y for a given x (same curve the engine uses for 'draw')."""
    x1, y1, x2, y2 = p
    def bx(t): return 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t ** 2 * x2 + t ** 3
    def by(t): return 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 * y2 + t ** 3
    lo, hi = 0.0, 1.0
    for _ in range(40):
        m = (lo + hi) / 2
        if bx(m) < x: lo = m
        else: hi = m
    return by((lo + hi) / 2)


def time_for_progress(frac, at, dur, ease):
    lo, hi = 0.0, 1.0
    for _ in range(40):
        m = (lo + hi) / 2
        if bezier_y_at_x(m, ease) < frac: lo = m
        else: hi = m
    return at + hi * dur


def i_end(S, b, t0, t1, data):
    """The sonic logo: the mark's price path, note by note, as it draws (EndCard: drawAt 0.15, drawDur 1.0)."""
    pts = TOKENS["mark"]["price_path_512"]
    wy = TOKENS["mark"]["wire_y_512"]
    ease = TOKENS["motion"]["ease"]["draw"]
    seg = [math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
    total = sum(seg)
    (x1, y1), (x2, y2) = pts[-2], pts[-1]
    cross = x1 + (x2 - x1) * (y1 - wy) / (y1 - y2)
    cross_len = sum(seg[:-1]) + math.dist(pts[-2], (cross, wy))
    S.pads.append((t0, t1, [62, 65, 69], 0.4, 0.3))
    acc = 0.0
    for i, (x, y) in enumerate(pts):
        if i:
            acc += seg[i - 1]
        t = time_for_progress(acc / total, t0 + 0.15, 1.0, ease)
        m = quant(TONIC + 12 + (wy - y) / 14)
        if i < len(pts) - 1:
            S.note(t, 0.6, m, 0.5, "pluck", -0.4 + 0.12 * i)
    snap = time_for_progress(cross_len / total, t0 + 0.15, 1.0, ease)
    name, bass, v = DMAJ
    S.pads.append((snap, t1 + 2, v, 1.0, 0.55))
    S.bass.append((snap, t1, 38, 0.6))
    for j, m in enumerate([50, 62, 66, 69, 74, 78]):
        S.note(snap + 0.015 * j, 3.0, m, 0.55, "bell", -0.3 + 0.12 * j)
    S.cue(t0 + 0.15, "sonic logo: the mark's path as notes")
    S.cue(snap, "wire snaps: D major")
    S.ducks.append(snap)


def i_default(S, b, t0, t1, data):
    kind = b.get("kind", "build")
    depth = {"hook": 0.0, "question": 0.1, "breaks": 0.7, "tells": 0.5, "split": 0.4}.get(kind, 0.2)
    harmony(S, t0, t1, depth, 0.4, f"{kind}: default texture")
    if kind not in ("hook", "question", "quote", "term"):
        pulse(S, t0, t1, 0.2)


INTERPRETERS = {"ThePit": i_thepit, "CandleChart": i_candlechart, "Anatomy": i_candlechart, "MythCard": i_myth,
                "RuleCard": i_rule, "EndCard": i_end}
KIND_DEFAULT = {"end": "EndCard", "misconception": "MythCard", "rule": "RuleCard", "the_rule": "RuleCard"}


# ---------------------------------------------------------------- synthesis
def env_adsr(n, a, r, sr=SR):
    e = np.ones(n)
    na, nr = min(n, int(a * sr)), min(n, int(r * sr))
    if na: e[:na] = np.linspace(0, 1, na) ** 2
    if nr: e[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return e


def add(buf, start, sig, pan=0.0):
    i = int(start * SR)
    if i >= buf.shape[1] or i + len(sig) <= 0:
        return
    j = min(buf.shape[1], i + len(sig))
    s = sig[: j - i]
    lg, rg = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
    buf[0, i:j] += s * lg * 1.414
    buf[1, i:j] += s * rg * 1.414


def v_pluck(f, d, vel):
    n = int((d + 1.2) * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for k, (amp, dec) in enumerate([(1.0, 1.1), (0.45, 0.6), (0.2, 0.35), (0.1, 0.2)], start=1):
        s += amp * np.sin(2 * np.pi * f * k * (1 + 0.0007 * k * k) * t) * np.exp(-t / dec)
    ham = np.diff(rng.standard_normal(n + 1)) * np.exp(-t / 0.004) * 0.08   # felt hammer: a 4 ms breath of noise
    return (s + ham) * env_adsr(n, 0.004, 0.25) * vel


def v_bell(f, d, vel):
    n = int((d + 1.5) * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 2.2) + 0.25 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.8)
    return s * env_adsr(n, 0.01, 0.6) * vel


def v_price(f, d, vel):
    n = int(d * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.15 * np.sin(4 * np.pi * f * t)
    return s * env_adsr(n, 0.03, d * 0.6) * vel


VOICES = {"pluck": v_pluck, "bell": v_bell, "price": v_price}


def render(S):
    n = int((S.dur + 3) * SR)
    dry = np.zeros((2, n))
    send = np.zeros((2, n))
    # pads: detuned additive saws, harmonics limited by brightness (darker = fewer harmonics)
    for t0, t1, mids, bright, gain in S.pads:
        d = max(0.2, t1 - t0) + 1.2
        m = int(d * SR)
        t = np.arange(m) / SR
        e = env_adsr(m, 0.9, 1.4)
        nh = 2 + int(8 * bright)
        for mi in mids:
            for det, pan in ((-0.004, -0.5), (0.004, 0.5)):
                f = mtof(mi) * (1 + det)
                s = sum((1 / h) * np.sin(2 * np.pi * f * h * t + h) for h in range(1, nh + 1) if f * h < 7000)
                add(send, t0, s * e * gain * 0.05, pan)
    # bass
    for t0, t1, mi, gain in S.bass:
        d = max(0.2, t1 - t0) + 0.4
        m = int(d * SR)
        t = np.arange(m) / SR
        f = mtof(mi)
        s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
        add(dry, t0, s * env_adsr(m, 0.25, 0.6) * gain * 0.22)
    # drone: low D with slow beating, grows with depth
    for t0, t1, depth in S.drone:
        d = max(0.2, t1 - t0) + 0.8
        m = int(d * SR)
        t = np.arange(m) / SR
        s = np.sin(2 * np.pi * mtof(38) * t) + np.sin(2 * np.pi * mtof(38) * 1.003 * t)
        add(dry, t0, s * env_adsr(m, 1.0, 0.8) * depth * 0.09)
    # notes
    for t, d, mi, vel, voice, pan in S.notes:
        sig = VOICES[voice](mtof(mi), d, vel) * 0.32
        add(dry, t, sig, pan)
        add(send, t, sig * 0.7, pan)
    # ticker clock
    click_t = np.arange(int(0.03 * SR)) / SR
    click = filt(rng.standard_normal(len(click_t)), "bp", 5200, q=3.0) * np.exp(-click_t / 0.004)
    for t, vel in S.ticks:
        add(dry, t, click * vel * 0.18, 0.25 if int(t / (BEAT / 2)) % 2 else -0.25)
    # room: decorrelated exponential-noise impulse responses, FFT convolution
    ir_n = int(2.4 * SR)
    ti = np.arange(ir_n) / SR
    wet = np.zeros_like(send)
    size = 1 << (n + ir_n).bit_length()
    for c in range(2):
        ir = filt(rng.standard_normal(ir_n), "lp", 5000) * np.exp(-ti / 0.55)
        ir[: int(0.012 * SR)] = 0
        ir /= np.sqrt(np.sum(ir ** 2))
        wet[c] = np.fft.irfft(np.fft.rfft(send[c], size) * np.fft.rfft(ir, size), size)[:n]
    mix = dry + send * 0.35 + wet * 0.9
    # duck under every sound cue (-6 dB, 60 ms down, 450 ms back)
    g = np.ones(n)
    for t in S.ducks:
        i = int(t * SR)
        a, r = int(0.06 * SR), int(0.45 * SR)
        seg = np.concatenate([np.linspace(1, 0.5, a), np.linspace(0.5, 1, r)])
        j0 = max(0, i - a // 2)
        j1 = min(n, j0 + len(seg))
        g[j0:j1] = np.minimum(g[j0:j1], seg[: j1 - j0])
    mix *= g
    mix = mix[:, : int(S.dur * SR)]
    fade_in, fade_out = int(0.8 * SR), int(0.7 * SR)
    mix[:, :fade_in] *= np.linspace(0, 1, fade_in)
    mix[:, -fade_out:] *= np.linspace(1, 0, fade_out)
    mono = mix.mean(axis=0)
    gain = 10 ** ((TARGET_LUFS - lufs(mono)) / 20)
    mix *= gain
    tp = true_peak_db(mix[0])
    if tp > -3:
        mix *= 10 ** ((-3 - tp) / 20)
    return mix


def write_wav(path, mix):
    pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2").T.reshape(-1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def compose(eid):
    spec = json.load(open(os.path.join(ROOT, "episodes", eid, "spec.json")))
    dp = os.path.join(ROOT, "episodes", eid, "data.json")
    data = json.load(open(dp)) if os.path.exists(dp) else None
    S = Score(spec["duration_s"])
    for b in spec["beats"]:
        comp = b.get("component") or KIND_DEFAULT.get(b.get("kind"))
        INTERPRETERS.get(comp, i_default)(S, b, b["t"], b["t"] + b["dur"], data)
        if b.get("sfx"):
            S.ducks.append(b["t"] + b.get("sfx_at", 0))
    S.cues.sort(key=lambda c: c["t"])
    return spec, S


def main():
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    eid, report = a[0], "--report" in a
    spec, S = compose(eid)
    if spec.get("score") is False:
        print(f"{eid}: score disabled in spec"); return
    mix = render(S)
    L, P = lufs(mix.mean(axis=0)), true_peak_db(mix[0])
    for c in S.cues:
        print(f"{c['t']:6.2f}s  {c['cue']}")
    print(f"{eid}: {len(S.notes)} notes, {len(S.pads)} pad chords, {len(S.ticks)} ticks · {L:.1f} LUFS, {P:.1f} dBTP")
    if report:
        return
    out = os.path.join(ROOT, "engine", "public", "score")
    os.makedirs(out, exist_ok=True)
    write_wav(os.path.join(out, f"{eid}.wav"), mix)
    json.dump({"id": eid, "bpm": BPM, "key": "D minor", "lufs": round(L, 1), "true_peak_db": round(P, 1),
               "generator": "scripts/sound/score.py", "cues": S.cues},
              open(os.path.join(ROOT, "episodes", eid, "score.json"), "w"), indent=1)
    print(f"wrote engine/public/score/{eid}.wav and episodes/{eid}/score.json")


if __name__ == "__main__":
    main()
