import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, hexA } from "../../tokens";
import { fmtPct, prog } from "../../lib/anim";
import { useEpisode } from "../../lib/useEpisode";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";

export interface DistributionProps {
  /** Outcome per run (e.g. max drawdown as −0.23, or final return). Default: sim.json `values[simKey]`. */
  values?: number[];
  simKey?: string;
  bins?: number;
  /** What one value means, for the axis label. */
  label?: string;
  /** "low" when smaller is worse (drawdowns, returns): the bad tail is the left 5%. */
  badSide?: "low" | "high";
  range?: [number, number];
  drawAt?: number;
  /** "pct" (default: returns, drawdowns) or "count" (e.g. a losing streak, with `unit` after the number). */
  format?: "pct" | "count";
  unit?: string;
}

const q = (s: number[], p: number) => s[Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)))];

/** Histogram of simulated outcomes with the median and the bad 5% tail marked — both always shown. */
export const Distribution: React.FC<DistributionProps> = ({ values, simKey = "final", bins = 30, label = "OUTCOME PER RUN", badSide = "low", range, drawAt = 0.2, format = "pct", unit = "" }) => {
  const F = (v: number) => (format === "count" ? `${Math.round(v)}${unit}` : fmtPct(v, 0));
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const ep = useEpisode();
  const V = values ?? ((ep?.sim?.values as Record<string, number[]> | undefined)?.[simKey] ?? []);
  if (!V.length) return null;
  const s = [...V].sort((a, b) => a - b);
  const [lo, hi] = range ?? [s[0], s[s.length - 1]];
  const counts = Array(bins).fill(0);
  for (const v of V) counts[Math.min(bins - 1, Math.max(0, Math.floor(((v - lo) / (hi - lo || 1)) * bins)))]++;
  const max = Math.max(...counts);
  const padB = 90 * u, padT = 70 * u;
  const barTop = padT + 64 * u; // bars stay under the two labels
  const bw = w / bins;
  const X = (v: number) => ((v - lo) / (hi - lo || 1)) * w;
  const med = q(s, 0.5);
  const tail = badSide === "low" ? q(s, 0.05) : q(s, 0.95);
  const grow = prog(frame, fps, drawAt, 1.0, "draw");
  const marks = prog(frame, fps, drawAt + 1.0, 0.4);
  const fs = SIZE.tape * u;
  const charW = fs * 1.1 * 0.64; // Martian Mono 600 advance, label size
  const place = (x: number, text: string, prefer: "start" | "end") => {
    const tw = text.length * charW;
    const side = prefer === "end" ? (x - 10 * u - tw < 0 ? "start" : "end") : x + 10 * u + tw > w ? "end" : "start";
    return { x: x + (side === "start" ? 10 : -10) * u, textAnchor: side } as const;
  };
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {counts.map((c, i) => {
        const x0 = lo + ((hi - lo) * i) / bins;
        const bad = badSide === "low" ? x0 + (hi - lo) / bins <= tail : x0 >= tail;
        const bh = ((h - barTop - padB) * c * grow) / (max || 1);
        return <rect key={i} x={i * bw + 1.5 * u} y={h - padB - bh} width={bw - 3 * u} height={bh} fill={bad ? hexA(C.ember, 0.85) : hexA(C.mist, 0.55)} />;
      })}
      <line x1={0} x2={w} y1={h - padB} y2={h - padB} stroke={C.blueline} strokeWidth={2 * u} />
      <text x={0} y={h - padB + 40 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs}>
        {F(lo)}
      </text>
      <text x={w} y={h - padB + 40 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs} textAnchor="end">
        {F(format === "count" ? hi - (hi - lo) / bins : hi)}
      </text>
      <text x={w / 2} y={h - padB + 76 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs} textAnchor="middle">
        {`${label} · ${V.length.toLocaleString("en-US")} RUNS`}
      </text>
      <g opacity={marks} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 1.1}>
        <line x1={X(med)} x2={X(med)} y1={padT - 10 * u} y2={h - padB} stroke={C.tape} strokeWidth={4 * u} />
        {/* labels point away from each other (the median's toward the bulk, the tail's toward its own side) and
            flip sides rather than leave the chart */}
        <text {...place(X(med), `MEDIAN ${F(med)}`, badSide === "low" ? "start" : "end")} y={padT} fill={C.tape}>{`MEDIAN ${F(med)}`}</text>
        <line x1={X(tail)} x2={X(tail)} y1={padT + 40 * u} y2={h - padB} stroke={C.ember} strokeWidth={4 * u} />
        <text {...place(X(tail), `WORST 5% ${F(tail)}`, badSide === "low" ? "end" : "start")} y={padT + 40 * u} fill={C.ember}>
          {`WORST 5% ${F(tail)}`}
        </text>
      </g>
    </svg>
  );
};
