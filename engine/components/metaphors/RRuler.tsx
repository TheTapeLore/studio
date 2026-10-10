import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, TYPE, hexA } from "../../tokens";
import { clamp, fmtMoney } from "../../lib/anim";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";
import { fmtR } from "./RCompare";

export interface RRulerProps {
  entry?: number;
  stop?: number;
  shares?: number;
  /** Price path as [storyTime s, price] keyframes (linear). Story time = beat time + timeOffset. */
  path?: [number, number][];
  /** Lets a later beat continue the same picture (transition "cut"): its story time starts here. */
  timeOffset?: number;
  /** Story span shown on the x axis (seconds). */
  span?: number;
  /** Story seconds: entry + stop + the 1R zone appear; the live R readout starts. */
  zoneAt?: number;
  measureAt?: number;
  /** A dashed "other outcome" to the stop: drawn from story time `at`, starting at story time `from`. */
  ghost?: { at: number; from: number; dur?: number } | null;
  yRange?: [number, number];
}

const DEFAULT_PATH: [number, number][] = [
  [0, 50], [1.2, 50.6], [2.2, 49.6], [3.4, 50.9], [4.6, 49.4], [5.8, 50.4], [7.0, 49.8], [8.4, 50.3],
  [9.2, 51.6], [9.8, 52.6], [10.4, 52.0], [11.0, 54.2], [11.6, 53.5], [12.2, 56.3], [12.8, 55.6], [13.6, 58.0], [16, 58.0],
];

const at = (path: [number, number][], t: number) => {
  if (t <= path[0][0]) return path[0][1];
  for (let i = 1; i < path.length; i++) {
    if (t <= path[i][0]) {
      const [t0, p0] = path[i - 1], [t1, p1] = path[i];
      const f = (t - t0) / Math.max(1e-6, t1 - t0);
      return p0 + (p1 - p0) * f;
    }
  }
  return path[path.length - 1][1];
};

/**
 * R as a ruler. Entry and stop fix 1R (Ember zone: what you lose if the stop hits). As price climbs, the same
 * ruler is stamped above the entry, segment by segment (+1R, +2R ...), and the live readout counts in R with
 * dollars underneath. The readout is the frame's one Sodium once it is positive.
 */
export const RRuler: React.FC<RRulerProps> = ({
  entry = 50,
  stop = 48,
  shares = 50,
  path = DEFAULT_PATH,
  timeOffset = 0,
  span = 16,
  zoneAt = 1.0,
  measureAt = 8.4,
  ghost = null,
  yRange = [45.5, 59.5],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const T = frame / fps + timeOffset;
  const R = entry - stop;
  const oneR = R * shares;
  const fs = SIZE.tape * u;
  const headH = 150 * u;
  const plot = { x: 96 * u, y: headH, w: w - 96 * u - 190 * u, h: h - headH - 20 * u };
  const y = (p: number) => plot.y + plot.h * (1 - (p - yRange[0]) / (yRange[1] - yRange[0]));
  const x = (t: number) => plot.x + plot.w * clamp(t / span);
  const pNow = at(path, T);
  const local = (s: number) => (s - timeOffset) * fps; // story seconds -> this sequence's frames
  const zone = clamp((frame - local(zoneAt)) / (0.5 * fps));
  // the drawn path up to now
  const pts: string[] = [];
  const step = 0.05;
  for (let t = 0; t <= Math.min(T, span) + 1e-6; t += step) pts.push(`${x(t).toFixed(1)},${y(at(path, t)).toFixed(1)}`);
  pts.push(`${x(Math.min(T, span)).toFixed(1)},${y(pNow).toFixed(1)}`);
  // ruler segments stamped above the entry as price crosses each level (they stay once earned)
  const maxP = Math.max(...path.filter(([t]) => t <= T).map(([, p]) => p), pNow);
  const levels = Math.floor((yRange[1] - entry) / R);
  const rulerX = plot.x + plot.w + 40 * u;
  const rulerW = 52 * u;
  const segs: React.ReactNode[] = [];
  for (let k = 1; k <= levels; k++) {
    const lvl = entry + k * R;
    let crossT = Infinity;
    for (let t = 0; t <= span; t += 0.02) if (at(path, t) >= lvl - 1e-6) { crossT = t; break; }
    const a = maxP >= lvl - 1e-6 ? clamp((T - crossT) / 0.25) : 0;
    if (a <= 0) continue;
    const yTop = y(lvl), yBot = y(lvl - R);
    segs.push(
      <g key={k} opacity={a}>
        <line x1={plot.x} x2={plot.x + plot.w} y1={yTop} y2={yTop} stroke={C.blueline} strokeWidth={2 * u} strokeDasharray={`${8 * u} ${8 * u}`} />
        <rect x={rulerX} y={yTop + (yBot - yTop) * (1 - a)} width={rulerW} height={(yBot - yTop) * a} fill={hexA(C.blueline, 0.35)} stroke={C.tape} strokeWidth={2.5 * u} />
        <text x={rulerX + rulerW + 10 * u} y={(yTop + yBot) / 2 + fs * 0.35} fill={C.tape} fontFamily={FONT.mono} fontWeight={600} fontSize={fs}>
          {`+${k}R`}
        </text>
      </g>,
    );
  }
  // live readout
  const rNow = (pNow - entry) / R;
  const measuring = T >= measureAt;
  const rShown = Math.round(rNow * 10) / 10;
  const readColor = !measuring ? C.tape : rShown > 0.05 ? C.sodium : rShown < -0.05 ? C.ember : C.tape;
  // ghost: the other outcome, dashed, to the stop
  let ghostEl: React.ReactNode = null;
  if (ghost) {
    const g = clamp((T - ghost.at) / (ghost.dur ?? 1.0));
    if (g > 0) {
      const x0 = x(ghost.from), y0 = y(at(path, ghost.from));
      const x1 = x(ghost.from + 2.4), y1 = y(stop);
      const xm = x0 + (x1 - x0) * g, ym = y0 + (y1 - y0) * (g * g * (3 - 2 * g));
      const lab = clamp((T - ghost.at - (ghost.dur ?? 1.0)) / 0.3);
      ghostEl = (
        <g>
          <line x1={x0} y1={y0} x2={xm} y2={ym} stroke={C.ember} strokeWidth={5 * u} strokeDasharray={`${12 * u} ${9 * u}`} strokeLinecap="round" />
          <circle cx={xm} cy={ym} r={9 * u} fill={C.ember} />
          <g opacity={lab}>
            <text x={x1 - 12 * u} y={y1 + 64 * u} fill={C.ember} fontFamily={FONT.display} fontWeight={900} fontSize={SIZE.label * u * 1.5}>
              {`${fmtR(-1)} · ${fmtMoney(-oneR)}`}
            </text>
          </g>
        </g>
      );
    }
  }
  const ticks: number[] = [];
  for (let p = Math.ceil(yRange[0] / 2) * 2; p <= yRange[1]; p += 2) ticks.push(p);
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {/* price axis */}
      {ticks.map((p) => (
        <text key={p} x={plot.x - 16 * u} y={y(p) + fs * 0.35} fill={C.mist} fontFamily={FONT.mono} fontSize={fs * 0.9} textAnchor="end">
          {`$${p}`}
        </text>
      ))}
      {/* the 1R zone: entry to stop */}
      <g opacity={zone}>
        <rect x={plot.x} y={y(entry)} width={plot.w * zone} height={y(stop) - y(entry)} fill={hexA(C.ember, 0.16)} />
        <line x1={plot.x} x2={plot.x + plot.w * zone} y1={y(stop)} y2={y(stop)} stroke={C.ember} strokeWidth={4 * u} />
        <line x1={plot.x} x2={plot.x + plot.w * zone} y1={y(entry)} y2={y(entry)} stroke={C.tape} strokeWidth={3 * u} strokeDasharray={`${10 * u} ${8 * u}`} />
        <text x={plot.x + plot.w - 10 * u} y={y(entry) - 14 * u} fill={C.tape} fontFamily={FONT.mono} fontWeight={600} fontSize={fs} textAnchor="end" letterSpacing={TYPE.mono.tracking}>
          {`ENTRY $${entry}`}
        </text>
        <text x={plot.x + 14 * u} y={y(stop) + 34 * u} fill={C.ember} fontFamily={FONT.mono} fontWeight={600} fontSize={fs} letterSpacing={TYPE.mono.tracking}>
          {`STOP $${stop}`}
        </text>
        <rect x={rulerX} y={y(entry)} width={rulerW} height={y(stop) - y(entry)} fill={hexA(C.ember, 0.3)} stroke={C.ember} strokeWidth={2.5 * u} />
        <text x={rulerX + rulerW + 10 * u} y={(y(entry) + y(stop)) / 2 + fs * 0.35} fill={C.ember} fontFamily={FONT.mono} fontWeight={600} fontSize={fs}>
          1R
        </text>
      </g>
      {segs}
      <polyline points={pts.join(" ")} fill="none" stroke={C.tape} strokeWidth={5 * u} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(Math.min(T, span))} cy={y(pNow)} r={10 * u} fill={C.tape} />
      {ghostEl}
      {/* header: what 1R is, then the live count */}
      <g opacity={zone}>
        <text x={0} y={46 * u} fill={C.mist} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 1.05} letterSpacing={TYPE.mono.tracking}>
          {`1R = $${entry} − $${stop} = $${R} × ${shares} SHARES = ${fmtMoney(oneR)}`}
        </text>
      </g>
      {measuring ? (
        <g>
          <text x={0} y={128 * u} fill={readColor} fontFamily={FONT.display} fontWeight={900} fontSize={SIZE.h2 * u * 1.05}>
            {fmtR(rShown)}
          </text>
          <text x={w} y={120 * u} fill={C.mist} fontFamily={FONT.mono} fontWeight={600} fontSize={SIZE.label * u} textAnchor="end">
            {`${rShown * oneR >= 0 ? "+" : "−"}${fmtMoney(Math.abs(Math.round(rShown * oneR)))}`}
          </text>
        </g>
      ) : null}
    </svg>
  );
};
