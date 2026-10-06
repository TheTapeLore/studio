import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, hexA } from "../../tokens";
import { fmtPct, prog } from "../../lib/anim";
import { barIndex, priceAt, useChart } from "./ChartContext";

export interface MeasureSpec {
  from: number | string;
  to: number | string;
  fromPrice?: number | "h" | "l" | "c" | "o";
  toPrice?: number | "h" | "l" | "c" | "o";
  /** Where the bracket stands: at the `to` bar (default), the `from` bar, or a fixed bar. */
  x?: "to" | "from" | number | string;
  /** Force a colour; default Ember for a fall, Lichen for a rise. */
  color?: "ember" | "lichen" | "sodium" | "tape";
  label?: string;
  side?: "left" | "right";
  delay?: number;
  digits?: number;
}

/** A vertical bracket between two prices with the % change computed from the data. */
export const PercentMeasure: React.FC<MeasureSpec> = ({ from, to, fromPrice = "h", toPrice = "l", x = "to", color, label, side = "right", delay = 0.15, digits = 0 }) => {
  const s = useChart();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const i = barIndex(s.bars, from, s.start);
  const j = barIndex(s.bars, to, s.end - 1);
  const p = prog(frame, fps, s.timeOfBar(j) + delay, 0.5, "draw");
  if (p <= 0) return null;
  const a = priceAt(s.bars, i, fromPrice);
  const b = priceAt(s.bars, j, toPrice);
  const pct = (b - a) / a;
  const col = C[color ?? (pct < 0 ? "ember" : "lichen")];
  const xi = x === "to" ? j : x === "from" ? i : barIndex(s.bars, x, j);
  const bx = s.x(xi) + (side === "right" ? 1 : -1) * 22 * s.u;
  const ya = s.y(a), yb = s.y(b);
  const yNow = ya + (yb - ya) * p;
  const tick = 12 * s.u;
  const fs = SIZE.label * s.u * 1.15;
  const text = label ?? fmtPct(pct, digits);
  const tx = bx + (side === "right" ? 16 : -16) * s.u;
  return (
    <g>
      <line x1={s.x(i)} x2={bx} y1={ya} y2={ya} stroke={hexA(col, 0.5)} strokeWidth={1.5 * s.u} strokeDasharray={`${5 * s.u} ${5 * s.u}`} />
      <line x1={bx - tick} x2={bx + tick} y1={ya} y2={ya} stroke={col} strokeWidth={3 * s.u} />
      <line x1={bx} x2={bx} y1={ya} y2={yNow} stroke={col} strokeWidth={3 * s.u} />
      {p > 0.98 ? <line x1={bx - tick} x2={bx + tick} y1={yb} y2={yb} stroke={col} strokeWidth={3 * s.u} /> : null}
      <rect x={side === "right" ? tx - 8 * s.u : tx - text.length * fs * 0.66 - 8 * s.u} y={(ya + yNow) / 2 - fs * 0.75} width={text.length * fs * 0.66 + 16 * s.u} height={fs * 1.5} rx={6 * s.u} fill={hexA(C.abyss, 0.85)} opacity={p} />
      <text x={tx} y={(ya + yNow) / 2 + fs * 0.35} fill={col} fontFamily={FONT.mono} fontWeight={600} fontSize={fs} textAnchor={side === "right" ? "start" : "end"} opacity={p}>
        {text}
      </text>
    </g>
  );
};
