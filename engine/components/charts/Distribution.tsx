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
}

const q = (s: number[], p: number) => s[Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)))];

/** Histogram of simulated outcomes with the median and the bad 5% tail marked — both always shown. */
export const Distribution: React.FC<DistributionProps> = ({ values, simKey = "final", bins = 30, label = "OUTCOME PER RUN", badSide = "low", range, drawAt = 0.2 }) => {
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
  const padB = 90 * u, padT = 60 * u;
  const bw = w / bins;
  const X = (v: number) => ((v - lo) / (hi - lo || 1)) * w;
  const med = q(s, 0.5);
  const tail = badSide === "low" ? q(s, 0.05) : q(s, 0.95);
  const grow = prog(frame, fps, drawAt, 1.0, "draw");
  const marks = prog(frame, fps, drawAt + 1.0, 0.4);
  const fs = SIZE.tape * u;
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {counts.map((c, i) => {
        const x0 = lo + ((hi - lo) * i) / bins;
        const bad = badSide === "low" ? x0 + (hi - lo) / bins <= tail : x0 >= tail;
        const bh = ((h - padT - padB) * c * grow) / (max || 1);
        return <rect key={i} x={i * bw + 1.5 * u} y={h - padB - bh} width={bw - 3 * u} height={bh} fill={bad ? hexA(C.ember, 0.85) : hexA(C.mist, 0.55)} />;
      })}
      <line x1={0} x2={w} y1={h - padB} y2={h - padB} stroke={C.blueline} strokeWidth={2 * u} />
      <text x={0} y={h - padB + 40 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs}>
        {fmtPct(lo, 0)}
      </text>
      <text x={w} y={h - padB + 40 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs} textAnchor="end">
        {fmtPct(hi, 0)}
      </text>
      <text x={w / 2} y={h - padB + 76 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs} textAnchor="middle">
        {`${label} · ${V.length.toLocaleString("en-US")} RUNS`}
      </text>
      <g opacity={marks} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 1.1}>
        <line x1={X(med)} x2={X(med)} y1={padT - 10 * u} y2={h - padB} stroke={C.tape} strokeWidth={4 * u} />
        <text x={X(med) + 10 * u} y={padT} fill={C.tape}>{`MEDIAN ${fmtPct(med, 0)}`}</text>
        <line x1={X(tail)} x2={X(tail)} y1={padT + 40 * u} y2={h - padB} stroke={C.ember} strokeWidth={4 * u} />
        <text x={X(tail) + (badSide === "low" ? 10 : -10) * u} y={padT + 40 * u} fill={C.ember} textAnchor={badSide === "low" ? "start" : "end"}>
          {`WORST 5% ${fmtPct(tail, 0)}`}
        </text>
      </g>
    </svg>
  );
};
