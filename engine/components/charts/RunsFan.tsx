import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, hexA } from "../../tokens";
import { clamp, fmtPct } from "../../lib/anim";
import { useEpisode } from "../../lib/useEpisode";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";

export interface RunsFanProps {
  /** Equity paths (1.0 = start). Default: sim.json `runs` (downsampled by the sim script). */
  runs?: number[][];
  /** Which sim.json key to read when `runs` is not given (e.g. "runs_2pct"). */
  simKey?: string;
  dur?: number;
  startAt?: number;
  /** Highlight the median path (Tape) and the worst-5% band (Ember). */
  showMedian?: boolean;
  showTail?: boolean;
  label?: string;
  /** Shared y-range, so two fans side by side compare honestly. */
  yRange?: [number, number];
}

const quantile = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
};

/**
 * What If Lab: many seeded runs unfolding at once as faint lines; the median path in Tape and the worst-5%
 * path in Ember, so the bad tail is never hidden behind the average.
 */
export const RunsFan: React.FC<RunsFanProps> = ({ runs, simKey = "runs", dur = 4, startAt = 0.2, showMedian = true, showTail = true, label, yRange }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const ep = useEpisode();
  const R = runs ?? ((ep?.sim?.[simKey] as number[][] | undefined) ?? []);
  if (!R.length) return null;
  const n = R[0].length;
  const p = clamp((frame / fps - startAt) / dur);
  const vis = Math.max(2, Math.ceil(p * n));
  const all = R.flat();
  const [lo, hi] = yRange ?? [Math.min(...all, 1), Math.max(...all, 1)];
  const padL = 90 * u, padB = 40 * u, padT = 50 * u;
  const X = (i: number) => padL + (i / (n - 1)) * (w - padL - 10 * u);
  const Y = (v: number) => padT + (h - padT - padB) * (1 - (v - lo) / (hi - lo));
  const path = (r: number[]) => r.slice(0, vis).map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("");
  const med: number[] = [], tail: number[] = [];
  for (let i = 0; i < n; i++) {
    const col = R.map((r) => r[i]);
    med.push(quantile(col, 0.5));
    tail.push(quantile(col, 0.05));
  }
  const fs = SIZE.tape * u;
  const ticks = [lo, 1, hi].filter((v, i, a) => a.indexOf(v) === i);
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {label ? (
        <text x={padL} y={padT - 18 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs}>
          {label}
        </text>
      ) : null}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={w} y1={Y(t)} y2={Y(t)} stroke={hexA(C.blueline, t === 1 ? 0.9 : 0.4)} strokeWidth={(t === 1 ? 2 : 1) * u} strokeDasharray={t === 1 ? undefined : `${4 * u} ${6 * u}`} />
          <text x={padL - 14 * u} y={Y(t) + fs * 0.35} fill={C.mist} fontFamily={FONT.mono} fontSize={fs} textAnchor="end">
            {fmtPct(t - 1, 0)}
          </text>
        </g>
      ))}
      {R.map((r, k) => (
        <path key={k} d={path(r)} fill="none" stroke={C.mist} strokeWidth={1.4 * u} opacity={Math.max(0.06, Math.min(0.35, 12 / R.length))} />
      ))}
      {showTail ? <path d={path(tail)} fill="none" stroke={C.ember} strokeWidth={5 * u} strokeLinejoin="round" /> : null}
      {showMedian ? <path d={path(med)} fill="none" stroke={C.tape} strokeWidth={5 * u} strokeLinejoin="round" /> : null}
      {p > 0.98 ? (
        <g fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 1.1}>
          {showMedian ? (
            <text x={w} y={Y(med[n - 1]) - 14 * u} fill={C.tape} textAnchor="end">
              {`MEDIAN ${fmtPct(med[n - 1] - 1, 0)}`}
            </text>
          ) : null}
          {showTail ? (
            <text x={w} y={Y(tail[n - 1]) + 34 * u} fill={C.ember} textAnchor="end">
              {`WORST 5% ${fmtPct(tail[n - 1] - 1, 0)}`}
            </text>
          ) : null}
        </g>
      ) : null}
    </svg>
  );
};
