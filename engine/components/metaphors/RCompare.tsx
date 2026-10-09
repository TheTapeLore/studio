import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, TYPE, hexA } from "../../tokens";
import { clamp, fmtMoney, prog } from "../../lib/anim";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";

export interface RCompareProps {
  /** The same dollar gain in every column. */
  gain?: number;
  /** One column per risk (1R in dollars). */
  risks?: number[];
  /** Seconds: bars rise, rulers draw, the R readouts land (score.py drops the music on `revealAt`). */
  barsAt?: number;
  rulersAt?: number;
  revealAt?: number;
}

/** +5R, +0.25R, −1R (two decimals at most, no trailing zeros). */
export const fmtR = (r: number) => `${r >= 0 ? "+" : "−"}⁠${parseFloat(Math.abs(r).toFixed(2))}R`;

/**
 * The same dollar result measured with different rulers. Each column: the gain as a Lichen bar (same height in
 * every column), and beside it a ruler of 1R segments (1R = that column's risk). A small risk stacks many segments
 * under the bar; a big one is a single segment the bar barely starts to fill. The R readout lands last; the biggest
 * one is the frame's one Sodium.
 */
export const RCompare: React.FC<RCompareProps> = ({ gain = 500, risks = [100, 2000], barsAt = 0.1, rulersAt = 0.55, revealAt = 2.0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const t = frame / fps;
  const n = risks.length;
  const rs = risks.map((r) => gain / r);
  const best = rs.indexOf(Math.max(...rs));
  const maxRisk = Math.max(...risks);
  const headH = 120 * u;
  const footH = 150 * u;
  const plotH = h - headH - footH;
  // the tallest ruler (the biggest 1R) fills the plot; the gain bar is drawn to the same dollar scale
  const pxPerDollar = plotH / Math.max(maxRisk, gain);
  const barH = gain * pxPerDollar;
  const base = headH + plotH;
  const colW = w / n;
  const fs = SIZE.tape * u;
  const grow = prog(frame, fps, barsAt, 0.4);
  const reveal = prog(frame, fps, revealAt, 0.35, "snap");
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {risks.map((risk, i) => {
        const cx = colW * i + colW / 2;
        const bw = Math.min(150 * u, colW * 0.3);
        const rw = Math.min(70 * u, colW * 0.14);
        const bx = cx - bw - 14 * u;
        const rx = cx + 14 * u;
        const segH = risk * pxPerDollar;
        const segs = Math.ceil(gain / risk - 1e-9);
        const shownSegs = Math.max(1, segs);
        const drawSpan = 1.3;
        const segEls: React.ReactNode[] = [];
        for (let k = 0; k < shownSegs; k++) {
          const a = clamp((t - rulersAt - (k / shownSegs) * drawSpan * 0.85) / Math.max(0.12, (drawSpan / shownSegs) * 0.9));
          if (a <= 0) continue;
          const y1 = base - k * segH;
          const hh = segH * a;
          segEls.push(
            <g key={k}>
              <rect x={rx} y={y1 - hh} width={rw} height={hh} fill={hexA(C.blueline, 0.28)} stroke={C.tape} strokeWidth={2.5 * u} />
              {segs > 1 && a >= 1 ? (
                <text x={rx + rw + 10 * u} y={y1 - segH / 2 + fs * 0.35} fill={C.mist} fontFamily={FONT.mono} fontSize={fs * 0.9}>
                  {`${k + 1}R`}
                </text>
              ) : null}
            </g>,
          );
        }
        const r = rs[i];
        const isBest = i === best;
        return (
          <g key={i}>
            <text x={cx} y={50 * u} fill={C.mist} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 1.1} textAnchor="middle" letterSpacing={TYPE.mono.tracking}>
              {`RISKED ${fmtMoney(risk)}`}
            </text>
            <text x={cx} y={92 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs * 0.9} textAnchor="middle" letterSpacing={TYPE.mono.tracking} opacity={prog(frame, fps, rulersAt, 0.3)}>
              {`1R = ${fmtMoney(risk)}`}
            </text>
            {/* the gain: identical in every column */}
            <rect x={bx} y={base - barH * grow} width={bw} height={barH * grow} fill={hexA(C.lichen, 0.85)} rx={3 * u} />
            <text x={bx + bw / 2} y={base - barH * grow - 16 * u} fill={C.lichen} fontFamily={FONT.mono} fontWeight={600} fontSize={SIZE.label * u} textAnchor="middle" opacity={grow}>
              {`+${fmtMoney(gain)}`}
            </text>
            {segEls}
            {segs === 1 && risk > gain ? (
              <text x={rx + rw + 10 * u} y={base - segH / 2} fill={C.mist} fontFamily={FONT.mono} fontSize={fs * 0.9} opacity={prog(frame, fps, rulersAt + drawSpan, 0.3)}>
                1R
              </text>
            ) : null}
            <line x1={cx - colW * 0.42} x2={cx + colW * 0.42} y1={base} y2={base} stroke={C.blueline} strokeWidth={3 * u} />
            <text
              x={cx}
              y={base + 104 * u}
              fill={isBest ? C.sodium : C.tape}
              fontFamily={FONT.display}
              fontWeight={900}
              fontSize={SIZE.h1 * u * (isBest ? 1 : 0.8)}
              textAnchor="middle"
              opacity={reveal}
              transform={`translate(0 ${(1 - reveal) * 20 * u})`}
            >
              {fmtR(r)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
