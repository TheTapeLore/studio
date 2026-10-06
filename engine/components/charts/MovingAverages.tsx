import React from "react";
import { MA_COLOR } from "../../tokens";
import { sma } from "../../lib/finance";
import { useChart } from "./ChartContext";

/** Simple moving averages; 10/21/50/200 always wear the same colours (tokens.chart.ma). */
export const MovingAverages: React.FC<{ periods?: number[]; width?: number }> = ({ periods = [10, 21, 50, 200], width = 2.6 }) => {
  const s = useChart();
  const closes = s.bars.map((b) => b.c);
  const vis = Math.min(s.end, Math.ceil(s.reveal));
  return (
    <g>
      {periods.map((n) => {
        const m = sma(closes, n);
        const pts: string[] = [];
        for (let i = s.start; i < vis; i++) if (!Number.isNaN(m[i])) pts.push(`${pts.length ? "L" : "M"}${s.x(i).toFixed(1)},${s.y(m[i]).toFixed(1)}`);
        return pts.length > 1 ? <path key={n} d={pts.join("")} fill="none" stroke={MA_COLOR[String(n)] ?? MA_COLOR["50"]} strokeWidth={width * s.u} strokeLinejoin="round" opacity={0.95} /> : null;
      })}
    </g>
  );
};
