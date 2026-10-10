import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, TYPE, hexA } from "../../tokens";
import { clamp, prog } from "../../lib/anim";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";

export interface StopMapStop {
  /** "pct": a fixed % below the buy. "chart": just under the base (box) low. */
  kind: "pct" | "chart";
  label: string;
  /** Who uses it, small text under the label. */
  who?: string;
  at: number;
  pct?: number;
}

export interface StopMapProps {
  /** Base depth as a fraction of the box top (0.15 = the box low is 15% under its top). */
  depth?: number;
  stops?: StopMapStop[];
  drawAt?: number;
  drawDur?: number;
  note?: string;
}

// a base: chop inside a box, then the break through its top (x 0..1000, y as fraction of box top price)
const PATH: [number, number][] = [
  [0, 0.93], [70, 0.97], [130, 0.88], [200, 0.98], [260, 0.87], [330, 0.96], [390, 0.9], [450, 0.99], [500, 0.94],
  [560, 1.0], [600, 1.03], [660, 1.01], [720, 1.06], [790, 1.04], [860, 1.1], [930, 1.08], [1000, 1.13],
];

/**
 * Where does the stop go? One illustrated breakout, two schools of stop placement drawn as lines under the buy:
 * a fixed % below the price you paid, or just under the low of the base the stock broke out of. The box top is the
 * breakout line (the frame's one Sodium); stops are Ember. An illustration, labelled as one.
 */
export const StopMap: React.FC<StopMapProps> = ({
  depth = 0.14,
  stops = [
    { kind: "pct", label: "8% BELOW YOUR BUY", who: "O'NEIL", at: 1.5, pct: 0.08 },
    { kind: "chart", label: "UNDER THE BOX LOW", who: "DARVAS · KOVNER", at: 3.0 },
  ],
  drawAt = 0.2,
  drawDur = 1.6,
  note = "ILLUSTRATION · NOT A CHART",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const fs = SIZE.tape * u;
  const top = 1.0, low = 1 - depth;
  const buy = 1.01;
  const ymax = 1.16, ymin = Math.min(low, buy * (1 - Math.max(...stops.map((s) => s.pct ?? 0)))) - 0.05;
  const plot = { x: 10 * u, y: 40 * u, w: w * 0.62, h: h - 110 * u };
  const X = (x: number) => plot.x + (plot.w * x) / 1000;
  const Y = (v: number) => plot.y + plot.h * (1 - (v - ymin) / (ymax - ymin));
  const p = prog(frame, fps, drawAt, drawDur, "linear");
  const shownX = p * 1000;
  const pts: string[] = [];
  for (let i = 0; i < PATH.length; i++) {
    const [x, y] = PATH[i];
    if (x <= shownX) pts.push(`${X(x).toFixed(1)},${Y(y).toFixed(1)}`);
    else {
      const [x0, y0] = PATH[i - 1];
      const f = (shownX - x0) / (x - x0);
      pts.push(`${X(shownX).toFixed(1)},${Y(y0 + (y - y0) * f).toFixed(1)}`);
      break;
    }
  }
  const boxA = prog(frame, fps, drawAt, 0.4);
  const buyA = clamp((shownX - 575) / 40);
  const right = w - 10 * u;
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {/* the base, boxed */}
      <g opacity={boxA}>
        <rect x={X(0)} y={Y(top)} width={X(560) - X(0)} height={Y(low) - Y(top)} fill={hexA(C.blueline, 0.18)} stroke={hexA(C.blueline, 0.9)} strokeWidth={2 * u} />
        <line x1={X(0)} x2={right} y1={Y(top)} y2={Y(top)} stroke={C.sodium} strokeWidth={4 * u} />
        <text x={X(10)} y={Y(top) - 14 * u} fill={C.sodium} fontFamily={FONT.mono} fontWeight={600} fontSize={fs} letterSpacing={TYPE.mono.tracking}>
          BREAKOUT LINE
        </text>
        <text x={X(10)} y={Y(low) + 32 * u} fill={C.mist} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 0.9} letterSpacing={TYPE.mono.tracking}>
          THE BASE (A "BOX")
        </text>
      </g>
      <polyline points={pts.join(" ")} fill="none" stroke={C.tape} strokeWidth={8 * u} strokeLinejoin="round" strokeLinecap="round" />
      <g opacity={buyA}>
        <circle cx={X(575)} cy={Y(buy)} r={12 * u} fill={C.tape} stroke={C.abyss} strokeWidth={3 * u} />
        <text x={X(575)} y={Y(buy) - 26 * u} fill={C.tape} fontFamily={FONT.mono} fontWeight={600} fontSize={fs} textAnchor="middle">
          BUY
        </text>
      </g>
      {stops.map((s, i) => {
        const a = prog(frame, fps, s.at, 0.4);
        if (a <= 0) return null;
        const v = s.kind === "pct" ? buy * (1 - (s.pct ?? 0.08)) : low - 0.01;
        const y = Y(v);
        const x0 = X(575);
        return (
          <g key={i} opacity={a}>
            <line x1={x0} x2={x0 + (right - x0) * a} y1={y} y2={y} stroke={C.ember} strokeWidth={4 * u} strokeDasharray={s.kind === "pct" ? `${14 * u} ${8 * u}` : undefined} />
            <line x1={x0} x2={x0} y1={Y(buy)} y2={y} stroke={hexA(C.ember, 0.5)} strokeWidth={2 * u} />
            <text x={right} y={y - 14 * u} fill={C.ember} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 1.05} textAnchor="end" letterSpacing="0.06em">
              {s.label}
            </text>
            {s.who ? (
              <text x={right} y={y + 32 * u} fill={C.tape} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 0.95} textAnchor="end" letterSpacing={TYPE.mono.tracking}>
                {s.who}
              </text>
            ) : null}
          </g>
        );
      })}
      {note ? (
        <text x={right} y={h - 4 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs * 0.8} textAnchor="end" letterSpacing={TYPE.mono.tracking} opacity={0.8}>
          {note}
        </text>
      ) : null}
    </svg>
  );
};
