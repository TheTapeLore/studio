import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, hexA } from "../../tokens";
import { clamp, fmtPct, prog } from "../../lib/anim";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";

export interface ThrottleProps {
  /** Notional ÷ equity. */
  leverage?: number;
  maxLeverage?: number;
  /** Leverage at which the redline starts. */
  redline?: number;
  /** Underlying moves per step (fractions). Both directions are always shown. */
  moveSeries?: number[];
  dur?: number;
}

/**
 * Leverage as a throttle with a redline. The gauge needle = notional ÷ equity. Below it, the same underlying
 * path drawn twice: unlevered, and levered (compounded per step, floored at −100% = wiped out).
 * Gains and losses get equal room (compliance rule 3).
 */
export const Throttle: React.FC<ThrottleProps> = ({ leverage = 5, maxLeverage = 10, redline = 6, moveSeries = [0.02, 0.03, -0.01, 0.02, -0.04, -0.03, 0.01, -0.05, 0.02, -0.03, -0.02, 0.04], dur = 4 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const needleP = prog(frame, fps, 0.2, 0.9, "snap");
  const lev = 1 + (leverage - 1) * needleP;
  const gR = Math.min(w * 0.36, h * 0.3);
  const gx = w / 2, gy = gR + 30 * u;
  const ang = (v: number) => Math.PI + (v / maxLeverage) * Math.PI; // 0 at left, max at right
  const pt = (v: number, r: number) => [gx + Math.cos(ang(v)) * r, gy + Math.sin(ang(v)) * r];
  const arc = (a: number, b: number, r: number) => {
    const [x1, y1] = pt(a, r), [x2, y2] = pt(b, r);
    return `M${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2}`;
  };
  const [nx, ny] = pt(lev, gR * 0.86);
  // the two paths
  const p = clamp((frame / fps - 1.1) / dur);
  const steps = moveSeries.length;
  const shown = Math.floor(p * steps);
  let base = 1, levd = 1, wiped = -1;
  const pb: number[] = [0], pl: number[] = [0];
  moveSeries.forEach((m, i) => {
    base *= 1 + m;
    levd = levd <= 0 ? 0 : levd * (1 + leverage * m);
    if (levd <= 0 && wiped < 0) wiped = i + 1;
    levd = Math.max(0, levd);
    pb.push(base - 1);
    pl.push(levd - 1);
  });
  const cTop = gy + 130 * u, cH = h - cTop - 30 * u;
  const yMax = Math.max(0.2, ...pl.map(Math.abs), ...pb.map(Math.abs));
  const Y = (v: number) => cTop + cH / 2 - (v / yMax) * (cH / 2);
  const X = (i: number) => (i / steps) * (w - 160 * u);
  const path = (arr: number[]) => arr.slice(0, shown + 1).map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("");
  const fs = SIZE.tape * u;
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <path d={arc(0, maxLeverage, gR)} fill="none" stroke={C.blueline} strokeWidth={22 * u} />
      <path d={arc(redline, maxLeverage, gR)} fill="none" stroke={C.ember} strokeWidth={22 * u} />
      {Array.from({ length: maxLeverage + 1 }).map((_, v) => {
        const [x1, y1] = pt(v, gR - 22 * u), [x2, y2] = pt(v, gR - 40 * u), [tx, ty] = pt(v, gR - 66 * u);
        return (
          <g key={v}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.mist} strokeWidth={3 * u} />
            {v % 2 === 0 || v === 1 ? (
              <text x={tx} y={ty + fs * 0.35} fill={C.mist} fontFamily={FONT.mono} fontSize={fs} textAnchor="middle">
                {`${v}x`}
              </text>
            ) : null}
          </g>
        );
      })}
      <line x1={gx} y1={gy} x2={nx} y2={ny} stroke={C.tape} strokeWidth={10 * u} strokeLinecap="round" />
      <circle cx={gx} cy={gy} r={18 * u} fill={C.tape} />
      <text x={gx} y={gy + 56 * u} fill={lev >= redline ? C.ember : C.tape} fontFamily={FONT.display} fontWeight={900} fontSize={SIZE.h2 * u} textAnchor="middle">
        {`${lev.toFixed(1)}x`}
      </text>
      {/* paths */}
      <line x1={0} x2={w - 160 * u} y1={Y(0)} y2={Y(0)} stroke={hexA(C.mist, 0.6)} strokeWidth={2 * u} strokeDasharray={`${6 * u} ${6 * u}`} />
      <rect x={0} y={Y(-1)} width={w - 160 * u} height={Math.max(0, cTop + cH - Y(-1))} fill={hexA(C.ember, 0.12)} />
      <path d={path(pb)} fill="none" stroke={C.mist} strokeWidth={3 * u} />
      <path d={path(pl)} fill="none" stroke={C.tape} strokeWidth={5 * u} />
      <text x={w} y={Y(pb[shown]) + fs * 0.35} fill={C.mist} fontFamily={FONT.mono} fontSize={fs} textAnchor="end">
        {`1x ${fmtPct(pb[shown], 0)}`}
      </text>
      <text x={w} y={Y(pl[shown]) + fs * 0.35 + (Math.abs(Y(pl[shown]) - Y(pb[shown])) < 30 * u ? 34 * u : 0)} fill={pl[shown] < 0 ? C.ember : C.lichen} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 1.1} textAnchor="end">
        {`${leverage}x ${fmtPct(pl[shown], 0)}`}
      </text>
      {wiped > 0 && shown >= wiped ? (
        <text x={X(wiped)} y={Y(-1) + 40 * u} fill={C.ember} fontFamily={FONT.mono} fontWeight={600} fontSize={fs} textAnchor="middle">
          WIPED OUT
        </text>
      ) : null}
      <text x={0} y={cTop - 14 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs}>
        SAME MOVES, TWO THROTTLES
      </text>
    </svg>
  );
};
