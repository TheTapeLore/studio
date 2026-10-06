import React from "react";
import { C, CHART, hexA } from "../../tokens";
import { clamp } from "../../lib/anim";
import { useChart } from "./ChartContext";

/** Volume bars under the price pane; a dashed 50-bar average shows volume drying up. */
export const VolumePane: React.FC<{ avg?: number }> = ({ avg = 50 }) => {
  const s = useChart();
  if (!s.vol) return null;
  const { vol, bars, start, end } = s;
  let max = 0;
  for (let i = start; i < end; i++) max = Math.max(max, bars[i].v);
  const yv = (v: number) => vol.y + vol.h * (1 - v / (max || 1));
  const vis = Math.min(end, Math.ceil(s.reveal));
  const out: React.ReactNode[] = [];
  for (let i = start; i < vis; i++) {
    const b = bars[i];
    const x = s.x(i);
    out.push(<rect key={i} x={x - s.bodyW / 2} y={yv(b.v)} width={s.bodyW} height={vol.y + vol.h - yv(b.v)} fill={b.c >= b.o ? CHART.volumeUp : CHART.volumeDown} opacity={clamp(s.reveal - i)} />);
  }
  const pts: string[] = [];
  for (let i = Math.max(start, avg - 1); i < vis; i++) {
    let sum = 0;
    for (let k = i - avg + 1; k <= i; k++) sum += bars[Math.max(0, k)].v;
    pts.push(`${pts.length ? "L" : "M"}${s.x(i).toFixed(1)},${yv(sum / avg).toFixed(1)}`);
  }
  return (
    <g>
      <line x1={vol.x} x2={vol.x + vol.w} y1={vol.y + vol.h} y2={vol.y + vol.h} stroke={hexA(C.blueline, 0.8)} strokeWidth={1.5 * s.u} />
      {out}
      {pts.length > 1 ? <path d={pts.join("")} fill="none" stroke={C.mist} strokeWidth={2 * s.u} strokeDasharray={`${6 * s.u} ${6 * s.u}`} opacity={0.8} /> : null}
    </g>
  );
};
