// Small, exact helpers. Everything on screen is computed from these, not typed in by hand.
import { Bar } from "./spec";

/** Gain needed to recover from a fractional loss L (0.5 -> 1.0). */
export const recoveryGain = (loss: number) => (loss >= 1 ? Infinity : loss / (1 - loss));

export const sma = (xs: number[], n: number) =>
  xs.map((_, i) => {
    if (i < n - 1) return NaN;
    let s = 0;
    for (let k = i - n + 1; k <= i; k++) s += xs[k];
    return s / n;
  });

export const ema = (xs: number[], n: number) => {
  const k = 2 / (n + 1);
  const out: number[] = [];
  xs.forEach((x, i) => out.push(i === 0 ? x : x * k + out[i - 1] * (1 - k)));
  return out;
};

export const atr = (bars: Bar[], n = 14) => {
  const tr = bars.map((b, i) => (i === 0 ? b.h - b.l : Math.max(b.h - b.l, Math.abs(b.h - bars[i - 1].c), Math.abs(b.l - bars[i - 1].c))));
  return sma(tr, n);
};

const erf = (x: number) => {
  const s = Math.sign(x);
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
};
export const normCdf = (x: number) => 0.5 * (1 + erf(x / Math.SQRT2));

/** Black–Scholes price (no dividends). T in years. */
export const bs = (type: "call" | "put", S: number, K: number, T: number, r: number, iv: number) => {
  if (T <= 0) return type === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
  const d1 = (Math.log(S / K) + (r + (iv * iv) / 2) * T) / (iv * Math.sqrt(T));
  const d2 = d1 - iv * Math.sqrt(T);
  return type === "call"
    ? S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2)
    : K * Math.exp(-r * T) * normCdf(-d2) - S * normCdf(-d1);
};

export interface Leg { type: "call" | "put" | "stock"; side: "long" | "short"; strike?: number; premium?: number; qty?: number; iv?: number; dte?: number }

/** Value of a position per unit at underlying price S. atExpiry=false uses Black–Scholes with remaining days. */
export const legsPnl = (legs: Leg[], S: number, daysLeft: number, r = 0.03) =>
  legs.reduce((acc, g) => {
    const q = (g.qty ?? 1) * (g.side === "long" ? 1 : -1);
    if (g.type === "stock") return acc + q * (S - (g.premium ?? 0));
    const val = bs(g.type, S, g.strike ?? S, Math.max(daysLeft, 0) / 365, r, g.iv ?? 0.3);
    return acc + q * (val - (g.premium ?? 0));
  }, 0);

/** Synthetic random-walk bars. Only for the gallery and demos; always labelled simulated on screen. */
export const simBars = (n: number, seed: number, start = 50, drift = 0.0015, vol = 0.02): Bar[] => {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const g = () => Math.sqrt(-2 * Math.log(Math.max(r(), 1e-9))) * Math.cos(2 * Math.PI * r());
  const out: Bar[] = [];
  let c = start;
  for (let i = 0; i < n; i++) {
    const o = c * (1 + g() * vol * 0.3);
    c = o * (1 + drift + g() * vol);
    const h = Math.max(o, c) * (1 + Math.abs(g()) * vol * 0.5);
    const l = Math.min(o, c) * (1 - Math.abs(g()) * vol * 0.5);
    out.push({ t: `D${i}`, o, h, l, c, v: Math.round(1e6 * (0.6 + r())) });
  }
  return out;
};

/** A synthetic volatility-contraction base: shrinking pullbacks under a pivot, drying volume, then a breakout. */
export const vcpBars = (seed = 7): { bars: Bar[]; pivot: number; contractions: [number, number][]; breakoutIdx: number } => {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pivot = 100;
  // key points (index, close) of three shrinking pullbacks then the break
  const keys: [number, number][] = [[0, 72], [16, 99], [26, 78], [38, 99.5], [45, 88], [54, 99], [58, 94], [63, 99.2], [66, 108], [72, 114]];
  const closes: number[] = [];
  for (let k = 0; k < keys.length - 1; k++) {
    const [i0, c0] = keys[k], [i1, c1] = keys[k + 1];
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / (i1 - i0);
      const s = 0.5 - 0.5 * Math.cos(Math.PI * t);
      closes.push(c0 + (c1 - c0) * s + (r() - 0.5) * 1.6 * (i < 54 ? 1 : 0.4));
    }
  }
  closes.push(keys[keys.length - 1][1]);
  const bars: Bar[] = closes.map((c, i) => {
    const o = i === 0 ? c : closes[i - 1] + (r() - 0.5) * 0.8;
    const spread = i < 26 ? 2.4 : i < 45 ? 1.6 : i < 63 ? 0.9 : 2.2;
    const h = Math.max(o, c) + r() * spread;
    const l = Math.min(o, c) - r() * spread;
    const dry = i < 26 ? 1 : i < 45 ? 0.75 : i < 63 ? 0.45 : 2.6;
    return { t: `D${i}`, o, h, l, c, v: Math.round(1e6 * dry * (0.7 + r() * 0.6)) };
  });
  return { bars, pivot, contractions: [[16, 26], [38, 45], [54, 58]], breakoutIdx: 64 };
};
