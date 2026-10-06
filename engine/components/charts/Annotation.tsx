import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, hexA } from "../../tokens";
import { prog } from "../../lib/anim";
import { barIndex, priceAt, useChart } from "./ChartContext";

export interface AnnotationSpec {
  at: number | string;
  price?: number | "h" | "l" | "c" | "o";
  text: string;
  /** Label offset from the point, in 1080-units. */
  dx?: number;
  dy?: number;
  color?: "tape" | "mist" | "ember" | "lichen" | "sodium";
  /** Seconds after the bar appears. */
  delay?: number;
}

/** A labelled point: dot, hairline leader, and a short label on an Abyss plate. Appears with its bar. */
export const Annotation: React.FC<AnnotationSpec> = ({ at, price = "h", text, dx = 0, dy = -90, color = "tape", delay = 0.1 }) => {
  const s = useChart();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const i = barIndex(s.bars, at, s.start);
  const p = prog(frame, fps, s.timeOfBar(i) + delay, 0.35);
  if (p <= 0) return null;
  const x = s.x(i);
  const y = s.y(priceAt(s.bars, i, price));
  const fs = SIZE.label * s.u;
  const tw = text.length * fs * 0.53 + 28 * s.u;
  let lx = x + dx * s.u;
  const ly = y + dy * s.u;
  lx = Math.max(s.plot.x + tw / 2, Math.min(s.plot.x + s.plot.w - tw / 2, lx));
  const col = C[color];
  return (
    <g opacity={p}>
      <line x1={x} y1={y} x2={lx} y2={ly + (dy < 0 ? fs * 0.7 : -fs * 0.7)} stroke={hexA(col, 0.8)} strokeWidth={2 * s.u} />
      <circle cx={x} cy={y} r={6 * s.u} fill={col} />
      <rect x={lx - tw / 2} y={ly - fs * 0.75} width={tw} height={fs * 1.5} rx={8 * s.u} fill={hexA(C.abyss, 0.88)} stroke={hexA(col, 0.6)} strokeWidth={1.5 * s.u} />
      <text x={lx} y={ly + fs * 0.33} fill={col} fontFamily={FONT.body} fontWeight={700} fontSize={fs} textAnchor="middle">
        {text}
      </text>
    </g>
  );
};
