import React from "react";
import { C, CHART, FONT, SIZE } from "../../tokens";
import { useEpisode } from "../../lib/useEpisode";
import { Bar } from "../../lib/spec";
import { useChart } from "./ChartContext";

/**
 * Relative strength line: close / benchmark close, drawn in its own band at the top of the price pane.
 * New RS highs that arrive before a new price high are ringed — the leader shows itself early.
 */
export const RSLine: React.FC<{ benchmark?: Bar[]; band?: number; markLeads?: boolean; leadLabel?: string }> = ({ benchmark, band = 0.26, markLeads = true, leadLabel }) => {
  const s = useChart();
  const ep = useEpisode();
  const bm = benchmark ?? ep?.data?.benchmark?.bars;
  if (!bm?.length) return null;
  const byDate = new Map(bm.map((b) => [b.t, b.c]));
  const ratio = s.bars.map((b, i) => b.c / (byDate.get(b.t) ?? bm[Math.min(i, bm.length - 1)].c));
  let lo = Infinity, hi = -Infinity;
  for (let i = s.start; i < s.end; i++) {
    lo = Math.min(lo, ratio[i]);
    hi = Math.max(hi, ratio[i]);
  }
  const top = s.plot.y + 40 * s.u; // below the chart title row
  const y = (r: number) => top + s.plot.h * band * (1 - (r - lo) / (hi - lo || 1));
  const vis = Math.min(s.end, Math.ceil(s.reveal));
  const pts: string[] = [];
  const leads: number[] = [];
  let rsHi = -Infinity, pxHi = -Infinity;
  for (let i = s.start; i < vis; i++) {
    pts.push(`${pts.length ? "L" : "M"}${s.x(i).toFixed(1)},${y(ratio[i]).toFixed(1)}`);
    if (i > s.start + 10 && ratio[i] > rsHi && s.bars[i].c <= pxHi) leads.push(i);
    rsHi = Math.max(rsHi, ratio[i]);
    pxHi = Math.max(pxHi, s.bars[i].c);
  }
  return (
    <g>
      <text x={s.x(s.start)} y={y(ratio[s.start]) - 14 * s.u} fill={CHART.rsLine} fontFamily={FONT.mono} fontWeight={600} fontSize={SIZE.tape * s.u * 0.9}>
        RS
      </text>
      <path d={pts.join("")} fill="none" stroke={CHART.rsLine} strokeWidth={2.6 * s.u} strokeLinejoin="round" />
      {markLeads
        ? leads.slice(-1).map((i) => (
            <g key={i}>
              <circle cx={s.x(i)} cy={y(ratio[i])} r={9 * s.u} fill="none" stroke={C.lichen} strokeWidth={2.5 * s.u} />
              {leadLabel ? (
                <text x={s.x(i) + 18 * s.u} y={y(ratio[i]) + 8 * s.u} fill={C.lichen} fontFamily={FONT.mono} fontWeight={600} fontSize={SIZE.tape * s.u}>
                  {leadLabel}
                </text>
              ) : null}
            </g>
          ))
        : null}
    </g>
  );
};
