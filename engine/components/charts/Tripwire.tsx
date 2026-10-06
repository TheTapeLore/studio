import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { CHART, FONT, SIZE } from "../../tokens";
import { prog } from "../../lib/anim";
import { Sfx } from "../layout/Sfx";
import { barIndex, useChart } from "./ChartContext";

export interface TripwireSpec {
  price: number;
  /** Bar where the wire is strung (index or date). */
  from?: number | string;
  /** Bar that breaks it: index, date, or "auto" = first close above the price after `from`. */
  snapAt?: number | string | "auto" | null;
  label?: string;
  sfx?: boolean;
}

/**
 * The pivot. A Sodium wire at `price`; when the snapping bar appears it breaks and both ends recoil upward
 * (tokens.chart.tripwire.recoilPx), with the snap sound.
 */
export const Tripwire: React.FC<TripwireSpec> = ({ price, from, snapAt = "auto", label, sfx = true }) => {
  const s = useChart();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const i0 = barIndex(s.bars, from, s.start);
  let si: number | null = null;
  if (snapAt === "auto") {
    const k = s.bars.findIndex((b, i) => i > i0 && i < s.end && b.c > price);
    si = k < 0 ? null : k;
  } else if (snapAt !== null && snapAt !== undefined) si = barIndex(s.bars, snapAt, s.end - 1);
  const t0 = s.timeOfBar(i0) - 0.2;
  const draw = prog(frame, fps, Math.max(0, t0), 0.45, "draw");
  if (s.reveal < i0) return null;
  const snapS = si === null ? Infinity : s.timeOfBar(si);
  const snap = prog(frame, fps, snapS, 0.18, "snap");
  const y = s.y(price);
  const x0 = s.x(i0) - s.step / 2;
  const x1 = s.plot.x + s.plot.w;
  const sw = 4.2 * s.u;
  const rp = CHART.tripwire.recoilPx * s.u;
  const lbl = label ? (
    <text x={x0 + 4 * s.u} y={y - 14 * s.u} fill={CHART.tripwire.color} fontFamily={FONT.mono} fontWeight={600} fontSize={SIZE.tape * s.u} letterSpacing="0.12em">
      {label}
    </text>
  ) : null;
  if (si === null || snap <= 0) {
    return (
      <g>
        <line x1={x0} x2={x0 + (x1 - x0) * draw} y1={y} y2={y} stroke={CHART.tripwire.color} strokeWidth={sw} strokeLinecap="round" />
        {lbl}
      </g>
    );
  }
  const X = s.x(si);
  const gap = 18 * s.u * snap;
  const curl = rp * snap;
  return (
    <g>
      <path d={`M${x0},${y} L${X - gap - 24 * s.u},${y} Q${X - gap - 5 * s.u},${y} ${X - gap},${y - curl}`} fill="none" stroke={CHART.tripwire.color} strokeWidth={sw} strokeLinecap="round" />
      <path d={`M${X + gap},${y - curl} Q${X + gap + 5 * s.u},${y} ${X + gap + 24 * s.u},${y} L${x1},${y}`} fill="none" stroke={CHART.tripwire.color} strokeWidth={sw} strokeLinecap="round" />
      {lbl}
      {sfx && Number.isFinite(snapS) ? (
        <foreignObject width={1} height={1}>
          <Sfx name="snap" at={snapS} />
        </foreignObject>
      ) : null}
    </g>
  );
};
