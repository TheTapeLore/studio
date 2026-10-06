import { Easing, interpolate } from "remotion";
import { EASE, Bezier } from "../tokens";

const curves: Record<string, (t: number) => number> = {};
export const ease = (name: keyof typeof EASE | "linear" = "standard") => {
  if (name === "linear") return (t: number) => t;
  if (!curves[name]) {
    const [a, b, c, d] = EASE[name] as Bezier;
    curves[name] = Easing.bezier(a, b, c, d);
  }
  return curves[name];
};

/** 0..1 progress of an animation that starts at `startS` and lasts `durS` seconds. */
export const prog = (
  frame: number,
  fps: number,
  startS: number,
  durS: number,
  curve: keyof typeof EASE | "linear" = "standard",
) => {
  const p = interpolate(frame, [startS * fps, (startS + Math.max(durS, 1 / fps)) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return ease(curve)(p);
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

/** Seeded PRNG (mulberry32). Gallery and demo data are reproducible and labelled simulated. */
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const gauss = (r: () => number) => {
  const u = Math.max(r(), 1e-9), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

export const fmtPct = (x: number, digits = 0, sign = true) => {
  const v = x * 100;
  const s = Math.abs(v).toFixed(digits);
  if (!sign) return `${s}%`;
  return `${v < 0 ? "−" : "+"}${s}%`;
};

export const fmtNum = (x: number, digits = 0) =>
  x.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const fmtMoney = (x: number, digits = 0) => `${x < 0 ? "−" : ""}$${fmtNum(Math.abs(x), digits)}`;

/** Split "text [[sodium]] text" into parts. */
export const parseMarks = (s: string) => {
  const out: { text: string; hi: boolean }[] = [];
  const re = /\[\[(.+?)\]\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), hi: false });
    out.push({ text: m[1], hi: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last), hi: false });
  return out;
};
