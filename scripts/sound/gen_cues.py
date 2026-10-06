#!/usr/bin/env python3
"""
Synthesise The Tape Lore sound cues from first principles (numpy only). No samples, no music, no licences.

  python scripts/sound/gen_cues.py            -> engine/public/sfx/*.wav (48 kHz, 16-bit, stereo)
  python scripts/sound/gen_cues.py --report   -> loudness/peak table only

Targets: about -14 LUFS (ITU-R BS.1770 K-weighted, integrated over the cue's active part), true-ish peak
(4x oversampled) at or below -1 dBFS. Short transients hit the peak ceiling before -14 LUFS; the ceiling wins.

Cues
  snap      the tripwire breaking: a dry crack, a bright wire twang that drops in pitch, a low recoil thump
  tick      a counter tick (numbers counting, rows appearing)
  click     a soft UI click (cards, options)
  whoosh    band-passed air sweeping up (transitions)
  tape-in   ticker tape unspooling: an accelerating ratchet with paper friction, ends with a clack
  tape-out  the tape rewinding: a decelerating ratchet
  dig       the pit being dug: a low, dull thud with dirt
  rise      the climb: a soft rising swell
"""
import os, sys, wave
import numpy as np

SR = 48000
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "engine", "public", "sfx")
TARGET_LUFS = -14.0
CEIL_DB = -1.2
rng = np.random.default_rng(20261006)  # fixed seed: identical cues every run


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def biquad(x, b, a):
    """Direct form I biquad (normalised so a[0] == 1)."""
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    b0, b1, b2 = b
    _, a1, a2 = a
    for n in range(len(x)):
        xn = x[n]
        yn = b0 * xn + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1, y2, y1 = x1, xn, y1, yn
        y[n] = yn
    return y


def rbj(kind, f0, q=0.707, gain_db=0.0):
    w = 2 * np.pi * f0 / SR
    cw, sw = np.cos(w), np.sin(w)
    alpha = sw / (2 * q)
    A = 10 ** (gain_db / 40)
    if kind == "lp":
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]; a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "hp":
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]; a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "bp":
        b = [alpha, 0, -alpha]; a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "hs":
        sq = 2 * np.sqrt(A) * alpha
        b = [A * ((A + 1) + (A - 1) * cw + sq), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - sq)]
        a = [(A + 1) - (A - 1) * cw + sq, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - sq]
    else:
        raise ValueError(kind)
    return [v / a[0] for v in b], [1.0, a[1] / a[0], a[2] / a[0]]


def filt(x, kind, f0, q=0.707, gain_db=0.0):
    b, a = rbj(kind, f0, q, gain_db)
    return biquad(x, b, a)


def sweep_bp(x, f_start, f_end, q=1.2, block=256):
    """Band-pass whose centre glides exponentially (block-wise coefficients)."""
    y = np.zeros_like(x)
    n = len(x)
    state = [0.0, 0.0, 0.0, 0.0]
    for s in range(0, n, block):
        frac = s / max(1, n - 1)
        f = f_start * (f_end / f_start) ** frac
        b, a = rbj("bp", f, q)
        x1, x2, y1, y2 = state
        for k in range(s, min(n, s + block)):
            xn = x[k]
            yn = b[0] * xn + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2
            x2, x1, y2, y1 = x1, xn, y1, yn
            y[k] = yn
        state = [x1, x2, y1, y2]
    return y


def env(t, attack, decay):
    a = np.clip(t / max(attack, 1e-6), 0, 1)
    return a * np.exp(-np.maximum(t - attack, 0) / decay)


def noise(n):
    return rng.standard_normal(n)


# ---------- loudness ----------
def k_weight(x):
    # BS.1770 pre-filter (high shelf ~ +4 dB above 1.5 kHz) + RLB high-pass (~38 Hz)
    y = filt(x, "hs", 1681.97, q=0.7072, gain_db=3.9998)
    return filt(y, "hp", 38.135, q=0.5003)


def lufs(x):
    y = k_weight(x)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    if len(y) < blk:
        y = np.pad(y, (0, blk - len(y)))
    pw = np.array([np.mean(y[i:i + blk] ** 2) for i in range(0, len(y) - blk + 1, hop)])
    pw = pw[pw > 10 ** ((-70 + 0.691) / 10)]
    if not len(pw):
        return -70.0
    rel = -0.691 + 10 * np.log10(np.mean(pw)) - 10
    gated = pw[-0.691 + 10 * np.log10(pw) > rel]
    return -0.691 + 10 * np.log10(np.mean(gated if len(gated) else pw))


def true_peak_db(x):
    # 4x oversampling by FFT zero-padding
    n = len(x)
    X = np.fft.rfft(x, n)
    Y = np.zeros(2 * n + 1, dtype=complex)
    Y[: len(X)] = X
    y = np.fft.irfft(Y, 4 * n) * 4
    return 20 * np.log10(np.max(np.abs(y)) + 1e-12)


def master(x, fade_ms=4):
    x = x - np.mean(x)
    f = int(fade_ms / 1000 * SR)
    x[:f] *= np.linspace(0, 1, f)
    x[-f * 3:] *= np.linspace(1, 0, f * 3)
    g_lufs = 10 ** ((TARGET_LUFS - lufs(x)) / 20)
    g_peak = 10 ** ((CEIL_DB - true_peak_db(x)) / 20)
    # Transients reach the peak ceiling long before -14 LUFS. Allow up to 9 dB of soft limiting (tanh), never more:
    # enough to make the snap read at a sensible loudness without smearing the crack.
    g = min(g_lufs, g_peak * 10 ** (9 / 20))
    x = x * g
    c = 10 ** (CEIL_DB / 20)
    if np.max(np.abs(x)) > c:
        x = c * np.tanh(x / c)
    for _ in range(3):  # oversampled peaks can still sit above the ceiling after limiting
        tp = true_peak_db(x)
        if tp <= CEIL_DB:
            break
        x = x * 10 ** ((CEIL_DB - tp - 0.05) / 20)
    return x


# ---------- cues ----------
def snap():
    t = t_axis(0.55)
    crack = noise(len(t)) * env(t, 0.0004, 0.006)
    crack = filt(crack, "hp", 2500)
    f0 = 1480 * (1 - 0.16 * (1 - np.exp(-t / 0.05)))
    phase = 2 * np.pi * np.cumsum(f0) / SR
    twang = (np.sin(phase) + 0.45 * np.sin(2.01 * phase) + 0.2 * np.sin(3.03 * phase)) * env(t, 0.001, 0.09)
    thump = np.sin(2 * np.pi * np.cumsum(95 * np.exp(-t / 0.08) + 45) / SR) * env(t, 0.002, 0.05)
    recoil = filt(noise(len(t)), "bp", 5200, q=2.5) * env(t - 0.03, 0.002, 0.03) * (t > 0.03)
    return 1.0 * crack + 0.35 * twang + 0.55 * thump + 0.25 * recoil


def tick():
    t = t_axis(0.09)
    s = np.sin(2 * np.pi * 2300 * t) * env(t, 0.0003, 0.006) + 0.4 * filt(noise(len(t)), "hp", 4000) * env(t, 0.0002, 0.002)
    return s


def click():
    t = t_axis(0.07)
    s = np.sin(2 * np.pi * 900 * t) * env(t, 0.0005, 0.01) + 0.3 * filt(noise(len(t)), "bp", 3000, q=1.5) * env(t, 0.0002, 0.004)
    return s


def whoosh():
    t = t_axis(0.5)
    n = sweep_bp(noise(len(t)), 350, 2800, q=1.4)
    shape = np.sin(np.pi * np.clip(t / 0.5, 0, 1)) ** 1.6
    return n * shape


def ratchet(dur, r0, r1, clack=True):
    t = t_axis(dur)
    out = np.zeros(len(t))
    rate = r0 + (r1 - r0) * (t / dur)
    pos = np.cumsum(rate) / SR
    idx = np.where(np.diff(np.floor(pos)) > 0)[0]
    click_t = t_axis(0.012)
    c = filt(noise(len(click_t)), "bp", 3400, q=2.0) * env(click_t, 0.0002, 0.0025)
    for i in idx:
        amp = 0.6 + 0.4 * rng.random()
        end = min(len(out), i + len(c))
        out[i:end] += amp * c[: end - i]
    friction = sweep_bp(noise(len(t)), 900 if r1 > r0 else 2400, 2400 if r1 > r0 else 900, q=0.9) * 0.18
    friction *= np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.8
    out += friction
    if clack:
        k = t_axis(0.05)
        ck = (filt(noise(len(k)), "bp", 1800, q=1.2) + 0.6 * np.sin(2 * np.pi * 420 * k)) * env(k, 0.0003, 0.012)
        tail = np.zeros(len(k))
        out = np.concatenate([out, tail])
        st = int((dur - 0.02) * SR)
        out[st:st + len(k)] += 0.9 * ck
    return out


def tape_in():
    return ratchet(0.62, 16, 44, clack=True)


def tape_out():
    return ratchet(0.52, 40, 14, clack=False)


def dig():
    t = t_axis(0.45)
    f = 72 * np.exp(-t / 0.25) + 38
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t, 0.003, 0.11)
    dirt = filt(filt(noise(len(t)), "lp", 900), "hp", 120) * env(t, 0.004, 0.07)
    return body + 0.5 * dirt


def rise():
    t = t_axis(0.8)
    f = 280 * (2.0 ** (t / 0.8))
    tone = (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(2 * np.pi * np.cumsum(2 * f) / SR))
    shape = np.clip(t / 0.55, 0, 1) ** 1.5 * np.exp(-np.maximum(t - 0.6, 0) / 0.06)
    air = sweep_bp(noise(len(t)), 500, 2600, q=1.2) * 0.35
    return (0.5 * tone + air) * shape


CUES = {"snap": snap, "tick": tick, "click": click, "whoosh": whoosh, "tape-in": tape_in, "tape-out": tape_out, "dig": dig, "rise": rise}


def write_wav(path, x):
    pcm = np.clip(x, -1, 1)
    pcm = (pcm * 32767).astype("<i2")
    stereo = np.repeat(pcm[:, None], 2, axis=1).reshape(-1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(stereo.tobytes())


def main():
    report_only = "--report" in sys.argv
    os.makedirs(OUT, exist_ok=True)
    print(f"{'cue':10} {'dur':>6} {'LUFS':>7} {'peak dBTP':>10}")
    bad = 0
    for name, fn in CUES.items():
        x = master(fn().astype(np.float64))
        L, P = lufs(x), true_peak_db(x)
        if P > -1.0:
            bad += 1
        print(f"{name:10} {len(x)/SR:6.2f} {L:7.1f} {P:10.2f}")
        if not report_only:
            write_wav(os.path.join(OUT, f"{name}.wav"), x)
    if not report_only:
        print(f"wrote {len(CUES)} cues to {os.path.relpath(OUT, ROOT)}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
