import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, CHART, FONT, SIZE, hexA } from "../../tokens";
import { clamp, fmtPct, gauss, rng } from "../../lib/anim";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";

export interface RaceSeries { name: string; values: number[] }
export interface TheRaceProps {
  /** Each runner's value over time (prices or an index); the race uses % change from the first value. */
  series?: RaceSeries[];
  /** Name (or index) of the runner to light in Sodium; default = the leader at the end. */
  highlight?: string | number | null;
  /** Seconds the race takes. */
  dur?: number;
  startAt?: number;
  /** Draw the highlighted runner's path behind it (its RS line). */
  showRSLine?: boolean;
  /** Label for the window, e.g. "2019–2020". */
  window?: string;
  seed?: number;
}

const demoSeries = (seed: number): RaceSeries[] => {
  const r = rng(seed);
  const names = ["ALFA", "BRVO", "CHRL", "DLTA", "ECHO", "FXTR"];
  return names.map((name, k) => {
    let v = 100;
    const drift = k === 2 ? 0.006 : (r() - 0.45) * 0.004;
    return { name, values: Array.from({ length: 120 }, () => (v *= 1 + drift + gauss(r) * 0.015)) };
  });
};

/** Relative strength as a race: runners in lanes, position = % change; the leader pulls ahead before the crowd notices. */
export const TheRace: React.FC<TheRaceProps> = ({ series, highlight = null, dur = 5, startAt = 0.3, showRSLine = true, window, seed = 3 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const S = series ?? demoSeries(seed);
  const len = Math.min(...S.map((s) => s.values.length));
  const p = clamp((frame / fps - startAt) / dur);
  const idx = Math.max(0, Math.floor(p * (len - 1)));
  const pct = S.map((s) => s.values.map((v) => v / s.values[0] - 1));
  const lo = Math.min(...pct.flat(), 0), hi = Math.max(...pct.flat(), 0.01);
  const finalLeader = pct.reduce((b, s, i) => (s[len - 1] > pct[b][len - 1] ? i : b), 0);
  const hiIdx = highlight === null ? finalLeader : typeof highlight === "number" ? highlight : Math.max(0, S.findIndex((s) => s.name === highlight));
  const labelW = 120 * u, valW = 150 * u;
  const trackX0 = labelW, trackX1 = w - valW;
  const X = (v: number) => trackX0 + ((v - lo) / (hi - lo)) * (trackX1 - trackX0);
  const laneH = Math.min(110 * u, (h - 80 * u) / S.length);
  const top = 60 * u;
  const zeroX = X(0);
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <text x={0} y={30 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={SIZE.tape * u}>
        {`% CHANGE${window ? ` · ${window}` : ""}`}
      </text>
      <line x1={zeroX} x2={zeroX} y1={top - 10 * u} y2={top + laneH * S.length} stroke={hexA(C.mist, 0.6)} strokeWidth={2 * u} strokeDasharray={`${6 * u} ${6 * u}`} />
      {S.map((s, i) => {
        const y = top + laneH * (i + 0.5);
        const on = i === hiIdx;
        const v = pct[i][idx];
        const col = on ? C.sodium : C.tape;
        const trail: string[] = [];
        if (on && showRSLine) {
          // RS line: this runner vs the field average, time on x, drawn inside its own lane
          const rs = pct[i].map((v, k) => v - pct.reduce((a, s2) => a + s2[k], 0) / pct.length);
          const rlo = Math.min(...rs), rhi = Math.max(...rs, rlo + 1e-6);
          for (let k = 0; k <= idx; k++) {
            const xx = trackX0 + (k / (len - 1)) * (trackX1 - trackX0);
            const yy = y + laneH * 0.36 - ((rs[k] - rlo) / (rhi - rlo)) * laneH * 0.72;
            trail.push(`${k ? "L" : "M"}${xx.toFixed(1)},${yy.toFixed(1)}`);
          }
        }
        return (
          <g key={s.name}>
            <line x1={trackX0} x2={trackX1} y1={y} y2={y} stroke={hexA(C.blueline, 0.9)} strokeWidth={2 * u} />
            {trail.length > 1 ? <path d={trail.join("")} fill="none" stroke={hexA(CHART.rsLine, 0.8)} strokeWidth={3 * u} /> : null}
            <text x={0} y={y + 9 * u} fill={on ? C.tape : C.mist} fontFamily={FONT.mono} fontWeight={on ? 600 : 400} fontSize={SIZE.label * u * 0.9}>
              {s.name}
            </text>
            <circle cx={X(v)} cy={y} r={(on ? 20 : 14) * u} fill={col} opacity={on ? 1 : 0.75} />
            <text x={w} y={y + 9 * u} fill={on ? C.tape : C.mist} fontFamily={FONT.mono} fontWeight={on ? 600 : 400} fontSize={SIZE.label * u * 0.9} textAnchor="end">
              {fmtPct(v, 0)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
