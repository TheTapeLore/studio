import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, TYPE, hexA } from "../../tokens";
import { clamp, prog } from "../../lib/anim";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";

export interface RangeSeries {
  /** Short name on the panel, e.g. "COCA-COLA (KO)". */
  name: string;
  /** Each day's range as a %: (high ÷ low − 1) × 100, oldest first. */
  ranges: number[];
}

export interface RangeBarsProps {
  series: RangeSeries[];
  /** The bars grow in from `drawAt` over `drawDur` seconds. */
  drawAt?: number;
  drawDur?: number;
  /** Seconds: each panel's average (its ADR%) draws as a dashed line with its value. */
  adrAt?: number | null;
  /** A stop this far from the price, in %, drawn across both panels at `stopAt` s; days whose range reached it light up. */
  stop?: number | null;
  stopAt?: number | null;
  title?: string;
  /** Top of the shared % scale. */
  max?: number;
}

/**
 * ADR% as a picture: one bar per day, height = that day's high-to-low range in %. Same scale for every stock, so a
 * calm stock and a wild one sit side by side honestly. The dashed line is the average (the ADR%); the stop line
 * shows how many ordinary days would have reached a stop that far away.
 */
export const RangeBars: React.FC<RangeBarsProps> = ({ series, drawAt = 0.2, drawDur = 1.6, adrAt = null, stop = null, stopAt = null, title = "DAILY RANGE, HIGH TO LOW · LAST 20 TRADING DAYS", max }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const fs = SIZE.tape * u;
  const top = max ?? Math.ceil(Math.max(...series.flatMap((s) => s.ranges), stop ?? 0) + 0.5);
  const head = 46 * u;
  const gapY = 30 * u;
  const panelH = (h - head - gapY * (series.length - 1)) / series.length;
  const axisW = 70 * u;
  const adrA = adrAt === null ? 0 : prog(frame, fps, adrAt, 0.5);
  const stopA = stopAt === null || stop === null ? 0 : prog(frame, fps, stopAt, 0.4);
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <text x={0} y={22 * u} fill={C.mist} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 0.9} letterSpacing={TYPE.mono.tracking}>
        {title}
      </text>
      {series.map((s, k) => {
        const y0 = head + k * (panelH + gapY);
        const plotTop = y0 + 44 * u, plotBot = y0 + panelH;
        const Y = (v: number) => plotBot - ((plotBot - plotTop) * v) / top;
        const n = s.ranges.length;
        const bw = (w - axisW) / n;
        const adr = s.ranges.reduce((a, b) => a + b, 0) / n;
        const hits = stop === null ? 0 : s.ranges.filter((r) => r >= stop).length;
        return (
          <g key={s.name}>
            <text x={0} y={y0 + 28 * u} fill={C.tape} fontFamily={FONT.display} fontWeight={800} fontSize={SIZE.label * u * 1.2}>
              {s.name}
            </text>
            {[0, Math.round(top / 2), top].map((v) => (
              <g key={v}>
                <line x1={0} x2={w - axisW} y1={Y(v)} y2={Y(v)} stroke={hexA(C.blueline, v === 0 ? 0.9 : 0.35)} strokeWidth={(v === 0 ? 2 : 1) * u} />
                <text x={w - axisW + 12 * u} y={Y(v) + fs * 0.35} fill={C.mist} fontFamily={FONT.mono} fontSize={fs * 0.85}>
                  {`${v}%`}
                </text>
              </g>
            ))}
            {s.ranges.map((r, i) => {
              const g = clamp((frame / fps - drawAt - (drawDur * i) / n) / 0.25);
              const hit = stopA > 0 && r >= (stop ?? Infinity);
              return (
                <rect key={i} x={i * bw + bw * 0.18} y={Y(r * g)} width={bw * 0.64} height={plotBot - Y(r * g)} fill={hit ? hexA(C.ember, 0.35 + 0.55 * stopA) : hexA(C.tape, 0.82)} />
              );
            })}
            {adrA > 0 ? (
              <g opacity={adrA}>
                <line x1={0} x2={(w - axisW) * adrA} y1={Y(adr)} y2={Y(adr)} stroke={C.tape} strokeWidth={3 * u} strokeDasharray={`${12 * u} ${8 * u}`} />
                <text x={w - axisW - 8 * u} y={Y(adr) - 12 * u} fill={C.tape} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 1.15} textAnchor="end">
                  {`ADR ${adr.toFixed(1)}%`}
                </text>
              </g>
            ) : null}
            {stopA > 0 && stop !== null ? (
              <g opacity={stopA}>
                <line x1={0} x2={w - axisW} y1={Y(stop)} y2={Y(stop)} stroke={C.sodium} strokeWidth={3.5 * u} />
                <text x={w - axisW} y={y0 + 28 * u} fill={hits ? C.ember : C.mist} fontFamily={FONT.display} fontWeight={800} fontSize={SIZE.label * u * 1.2} textAnchor="end">
                  {`${hits} OF ${n} DAYS MOVED ${stop}%+`}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
};
