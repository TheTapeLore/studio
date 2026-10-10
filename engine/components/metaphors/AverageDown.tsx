import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, TYPE, hexA } from "../../tokens";
import { clamp, fmtMoney, prog } from "../../lib/anim";
import { useEpisode } from "../../lib/useEpisode";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";

export interface AverageDownProps {
  /** The line is drawn to `from` at frame 0 and on to `to` between `at` and `at + dur` (dates, YYYY-MM-DD). */
  reveal?: { from: string; to: string; at?: number; dur?: number };
  /** The averaging-down rule: first buy once the close is `firstPct` under the high, then one more buy each time
   *  it closes another `stepPct` under the last buy, `maxBuys` buys of `amount` dollars. */
  firstPct?: number;
  stepPct?: number;
  maxBuys?: number;
  amount?: number;
  showAvg?: boolean;
  showReadout?: boolean;
  /** Seconds: the falling bounce tops get connected (the tell). */
  tellsAt?: number | null;
  /** Seconds: the stop under the FIRST buy appears with its exit (the rule). */
  stopAt?: number | null;
  stopPct?: number;
  title?: string;
  /** Last date the chart's high is searched for (the top before the fall). */
  peakBefore?: string;
  /** Data override (gallery/demo); default: data.json bars. */
  bars?: WBar[];
}

interface WBar { t: string; c: number }

/**
 * Averaging down on a real chart, as % below the stock's high (prices are split-adjusted, so % reads honestly).
 * Every buy is computed from the closes with the rule above; the average cost (Ember, dashed) steps down with each
 * buy while the position grows; the readout shows money in vs what it is worth at the line's head.
 */
export const AverageDown: React.FC<AverageDownProps> = ({
  reveal = { from: "1999-06-01", to: "2003-06-30", at: 0.2, dur: 4 },
  firstPct = 0.25,
  stepPct = 0.2,
  maxBuys = 5,
  amount = 10000,
  showAvg = true,
  showReadout = true,
  tellsAt = null,
  stopAt = null,
  stopPct = 0.08,
  title = "CISCO (CSCO) · WEEKLY CLOSE · % BELOW ITS MARCH 2000 HIGH",
  peakBefore = "2000-12-31",
  bars: barsProp,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const ep = useEpisode();
  const bars: WBar[] = barsProp ?? (ep?.data?.bars ?? []).map((b) => ({ t: b.t, c: b.c }));
  if (!bars.length) return null;
  const n = bars.length;
  const idxOf = (d: string) => {
    const i = bars.findIndex((b) => b.t >= d);
    return i < 0 ? n - 1 : i;
  };
  let pk = 0;
  for (let i = 0; i < n && bars[i].t <= peakBefore; i++) if (bars[i].c > bars[pk].c) pk = i;
  const P = bars[pk].c;
  // buys
  const buys: number[] = [];
  for (let i = pk; i < n && buys.length < maxBuys; i++) {
    const last = buys.length ? bars[buys[buys.length - 1]].c : null;
    if (last === null ? bars[i].c <= P * (1 - firstPct) : bars[i].c <= last * (1 - stepPct)) buys.push(i);
  }
  // reveal
  const i0 = idxOf(reveal.from), i1 = idxOf(reveal.to);
  const t = frame / fps;
  const head = Math.round(i0 + (i1 - i0) * clamp((t - (reveal.at ?? 0.2)) / Math.max(0.01, reveal.dur ?? 4)));
  const fs = SIZE.tape * u;
  const ro = showReadout ? 200 * u : 60 * u;
  const pad = { l: 96 * u, r: 16 * u, t: ro, b: 56 * u };
  const ymin = -0.95, ymax = 0.08;
  const X = (i: number) => pad.l + ((w - pad.l - pad.r) * i) / (n - 1);
  const Y = (pct: number) => pad.t + (h - pad.t - pad.b) * (1 - (pct - ymin) / (ymax - ymin));
  const pctAt = (i: number) => bars[i].c / P - 1;
  const pts = bars.slice(0, head + 1).map((b, i) => `${X(i).toFixed(1)},${Y(b.c / P - 1).toFixed(1)}`).join(" ");
  // position at the head
  const done = buys.filter((b) => b <= head);
  const shares = done.reduce((s, b) => s + amount / bars[b].c, 0);
  const invested = done.length * amount;
  const worth = shares * bars[head].c;
  const avg = shares ? invested / shares : 0;
  // falling bounce tops (the tell): highs of +-6 weeks after the peak, each lower than the one before
  const tops: number[] = [];
  for (let i = pk + 6; i < n - 6; i++) {
    let isTop = true;
    for (let k = i - 6; k <= i + 6; k++) if (bars[k].c > bars[i].c) { isTop = false; break; }
    if (isTop && (!tops.length || bars[i].c < bars[tops[tops.length - 1]].c)) tops.push(i);
  }
  const tellA = tellsAt === null ? 0 : prog(frame, fps, tellsAt, 0.6);
  const stopA = stopAt === null ? 0 : prog(frame, fps, stopAt, 0.4);
  const first = buys[0];
  const stopPx = first !== undefined ? bars[first].c * (1 - stopPct) : 0;
  const stopHit = first !== undefined ? bars.findIndex((b, i) => i > first && b.c <= stopPx) : -1;
  const ticks = [0, -0.25, -0.5, -0.75];
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <text x={0} y={28 * u} fill={C.mist} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 0.92} letterSpacing="0.08em">
        {title}
      </text>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={w - pad.r} y1={Y(v)} y2={Y(v)} stroke={hexA(C.blueline, v === 0 ? 0.9 : 0.4)} strokeWidth={(v === 0 ? 2 : 1) * u} strokeDasharray={v === 0 ? undefined : `${6 * u} ${8 * u}`} />
          <text x={pad.l - 12 * u} y={Y(v) + fs * 0.35} fill={C.mist} fontFamily={FONT.mono} fontSize={fs * 0.9} textAnchor="end">
            {v === 0 ? "HIGH" : `${Math.round(v * 100)}%`}
          </text>
        </g>
      ))}
      {[2000, 2001, 2002, 2003].map((yr) => {
        const i = idxOf(`${yr}-01-01`);
        return (
          <text key={yr} x={X(i)} y={h - 14 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs * 0.9} textAnchor="middle">
            {yr}
          </text>
        );
      })}
      <polyline points={pts} fill="none" stroke={C.tape} strokeWidth={5 * u} strokeLinejoin="round" />
      {/* the tell: bounce tops, each lower */}
      {tellA > 0 ? (
        <g opacity={tellA}>
          <polyline points={tops.filter((i) => i <= head).map((i) => `${X(i).toFixed(1)},${Y(pctAt(i)).toFixed(1)}`).join(" ")} fill="none" stroke={C.ember} strokeWidth={3 * u} strokeDasharray={`${10 * u} ${7 * u}`} />
          {tops.filter((i) => i <= head).map((i) => <circle key={i} cx={X(i)} cy={Y(pctAt(i))} r={7 * u} fill={C.ember} />)}
          <text x={X(tops[0] ?? pk) + 20 * u} y={Y(pctAt(tops[0] ?? pk)) - 24 * u} fill={C.ember} fontFamily={FONT.mono} fontWeight={600} fontSize={fs}>
            EACH BOUNCE TOPPED LOWER
          </text>
        </g>
      ) : null}
      {/* average cost */}
      {showAvg && done.length ? (
        <polyline
          points={done.map((b, k) => {
            const sh = done.slice(0, k + 1).reduce((s, j) => s + amount / bars[j].c, 0);
            const a = ((k + 1) * amount) / sh / P - 1;
            const xEnd = X(k + 1 < done.length ? done[k + 1] : head);
            return `${X(b).toFixed(1)},${Y(a).toFixed(1)} ${xEnd.toFixed(1)},${Y(a).toFixed(1)}`;
          }).join(" ")}
          fill="none"
          stroke={C.ember}
          strokeWidth={3 * u}
          strokeDasharray={`${12 * u} ${8 * u}`}
        />
      ) : null}
      {showAvg && done.length ? (
        <text x={w - pad.r} y={Y(avg / P - 1) - 12 * u} fill={C.ember} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 0.95} textAnchor="end">
          YOUR AVERAGE COST
        </text>
      ) : null}
      {done.map((b, k) => (
        <g key={b}>
          <circle cx={X(b)} cy={Y(pctAt(b))} r={11 * u} fill={C.abyss} stroke={C.tape} strokeWidth={4 * u} />
          <text x={X(b) - 20 * u} y={Y(pctAt(b)) + (k === 0 ? -20 * u : fs * 0.35)} fill={C.tape} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 0.9} textAnchor="end">
            {`BUY ${k + 1}`}
          </text>
        </g>
      ))}
      {/* the rule: one buy, a stop under it */}
      {stopA > 0 && first !== undefined ? (
        <g opacity={stopA}>
          <line x1={X(first)} x2={X(stopHit < 0 ? head : stopHit)} y1={Y(stopPx / P - 1)} y2={Y(stopPx / P - 1)} stroke={C.sodium} strokeWidth={4 * u} />
          {stopHit > 0 ? <circle cx={X(stopHit)} cy={Y(stopPx / P - 1)} r={11 * u} fill={C.sodium} /> : null}
          <text x={X(stopHit < 0 ? head : stopHit) + 70 * u} y={Y(stopPx / P - 1) - 14 * u} fill={C.sodium} fontFamily={FONT.mono} fontWeight={600} fontSize={fs} letterSpacing="0.06em">
            {`STOP ${Math.round(stopPct * 100)}% UNDER BUY 1: OUT, −${fmtMoney(amount * stopPct)}`}
          </text>
        </g>
      ) : null}
      {showReadout && done.length ? (
        <g>
          <text x={0} y={70 * u} fill={C.mist} fontFamily={FONT.mono} fontWeight={600} fontSize={fs} letterSpacing={TYPE.mono.tracking}>
            {`MONEY IN ${fmtMoney(invested)}`}
          </text>
          <text x={0} y={162 * u} fill={worth >= invested ? C.tape : C.ember} fontFamily={FONT.display} fontWeight={900} fontSize={SIZE.h2 * u}>
            {`WORTH ${fmtMoney(Math.round(worth / 100) * 100)}`}
          </text>
          <text x={w - pad.r} y={162 * u} fill={worth >= invested ? C.tape : C.ember} fontFamily={FONT.display} fontWeight={900} fontSize={SIZE.h2 * u} textAnchor="end">
            {`${worth >= invested ? "+" : "−"}${Math.abs(Math.round((worth / invested - 1) * 100))}%`}
          </text>
        </g>
      ) : null}
    </svg>
  );
};
