import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, hexA } from "../../tokens";
import { clamp } from "../../lib/anim";
import { Bar } from "../../lib/spec";
import { useEpisode } from "../../lib/useEpisode";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";

export interface InnerChartProps {
  bars?: Bar[];
  /** Emotion value per bar (−1 despair … +1 euphoria). Default: built from price (how far above/below its recent range). */
  emotionCurve?: number[];
  /** Labels pinned to bars. Default: euphoria at the emotional high, despair at the low. */
  labels?: { at: number; text: string }[];
  dur?: number;
  startAt?: number;
}

/** A smooth cycle used when no data is given (simulated). */
const demoCloses = (n = 160) => Array.from({ length: n }, (_, i) => 100 + 22 * Math.sin((i / n) * Math.PI * 2.4) + i * 0.08 + 4 * Math.sin(i / 3.1));

/**
 * The Operator: price on top, the trader's emotion below as a dotted Sodium line. Emotion follows price
 * (euphoria near highs, despair near lows) — exactly out of phase with the disciplined action.
 */
export const InnerChart: React.FC<InnerChartProps> = ({ bars, emotionCurve, labels, dur = 5, startAt = 0.3 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const ep = useEpisode();
  const closes = (bars ?? ep?.data?.bars)?.map((b) => b.c) ?? demoCloses();
  const n = closes.length;
  const raw = closes.map((c, i) => {
    const win = closes.slice(Math.max(0, i - 40), i + 1);
    const lo = Math.min(...win), hi = Math.max(...win);
    return hi === lo ? 0 : ((c - lo) / (hi - lo)) * 2 - 1;
  });
  const emo = emotionCurve ?? raw.map((_, i) => {
    const w0 = raw.slice(Math.max(0, i - 4), i + 1);
    return (w0.reduce((a, b) => a + b, 0) / w0.length) * 0.9;
  });
  const p = clamp((frame / fps - startAt) / dur);
  const vis = Math.max(2, Math.floor(p * n));
  const topH = h * 0.5, gap = 40 * u;
  const lo = Math.min(...closes), hi = Math.max(...closes);
  const X = (i: number) => (i / (n - 1)) * (w - 10 * u);
  const Yp = (v: number) => 20 * u + (topH - 30 * u) * (1 - (v - lo) / (hi - lo));
  const e0 = topH + gap, e1 = h - 30 * u;
  const Ye = (v: number) => e0 + (e1 - e0) * (0.5 - v / 2);
  const pPath = closes.slice(0, vis).map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Yp(v).toFixed(1)}`).join("");
  const ePath = emo.slice(0, vis).map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Ye(v).toFixed(1)}`).join("");
  const iMax = emo.indexOf(Math.max(...emo)), iMin = emo.indexOf(Math.min(...emo.slice(10)));
  const L = labels ?? [
    { at: iMax, text: "Euphoria: want to buy more" },
    { at: iMin, text: "Despair: want to quit" },
  ];
  const fs = SIZE.label * u;
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <text x={0} y={14 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={SIZE.tape * u}>
        PRICE
      </text>
      <path d={pPath} fill="none" stroke={C.tape} strokeWidth={4 * u} strokeLinejoin="round" />
      <line x1={0} x2={w} y1={Ye(0)} y2={Ye(0)} stroke={hexA(C.blueline, 0.8)} strokeWidth={2 * u} />
      <text x={0} y={e0 - 10 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={SIZE.tape * u}>
        HOW IT FEELS
      </text>
      <path d={ePath} fill="none" stroke={C.sodium} strokeWidth={5 * u} strokeDasharray={`${2 * u} ${10 * u}`} strokeLinecap="round" />
      {L.filter((l) => l.at < vis).map((l, k) => (
        <g key={k}>
          <line x1={X(l.at)} x2={X(l.at)} y1={Yp(closes[l.at])} y2={Ye(emo[l.at])} stroke={hexA(C.mist, 0.5)} strokeWidth={2 * u} strokeDasharray={`${4 * u} ${6 * u}`} />
          <text x={Math.min(w - 10 * u, Math.max(10 * u, X(l.at)))} y={Math.max(e0 + 50 * u, Math.min(e1 - 4 * u, Ye(emo[l.at]) + (emo[l.at] > 0 ? 50 * u : -22 * u)))} fill={C.tape} fontFamily={FONT.body} fontWeight={700} fontSize={fs} textAnchor={X(l.at) > w * 0.7 ? "end" : X(l.at) < w * 0.3 ? "start" : "middle"}>
            {l.text}
          </text>
        </g>
      ))}
    </svg>
  );
};
