import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, hexA } from "../../tokens";
import { fmtPct, lerp, prog } from "../../lib/anim";
import { recoveryGain } from "../../lib/finance";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";

export interface PitCurveProps {
  /** Dot position (fractional loss). */
  lossPct?: number;
  fromLossPct?: number;
  sweepAt?: number;
  sweepDur?: number;
  /** Max loss on the x axis and max gain on the y axis (fractions). */
  maxLoss?: number;
  maxGain?: number;
  /** Labelled points along the curve. */
  marks?: number[];
  drawAt?: number;
  drawDur?: number;
}

/**
 * The Pit as a curve: gain needed to recover vs loss taken, g = L / (1 − L), against the dashed
 * "symmetric" line g = L that intuition expects. The gap between them is the pit.
 */
export const PitCurve: React.FC<PitCurveProps> = ({
  lossPct = 0.5,
  fromLossPct,
  sweepAt = 1.2,
  sweepDur = 3,
  maxLoss = 0.9,
  maxGain = 4,
  marks = [0.1, 0.25, 0.5, 0.75],
  drawAt = 0.1,
  drawDur = 1.2,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const padL = 110 * u, padB = 80 * u, padT = 30 * u, padR = 40 * u;
  const pw = w - padL - padR, ph = h - padT - padB;
  const X = (l: number) => padL + (l / maxLoss) * pw;
  const Y = (g: number) => padT + ph * (1 - Math.min(g, maxGain * 1.04) / maxGain);
  const draw = prog(frame, fps, drawAt, drawDur, "draw");
  const L = fromLossPct === undefined ? lossPct : lerp(fromLossPct, lossPct, prog(frame, fps, sweepAt, sweepDur));
  const curve: string[] = [];
  const N = 160;
  for (let k = 0; k <= N * draw; k++) {
    const l = (k / N) * maxLoss;
    const g = recoveryGain(l);
    if (g > maxGain * 1.04) break;
    curve.push(`${curve.length ? "L" : "M"}${X(l).toFixed(1)},${Y(g).toFixed(1)}`);
  }
  const fs = SIZE.tape * u;
  const gTicks = [0, 1, 2, 3, 4].filter((g) => g <= maxGain);
  const lTicks = [0, 0.25, 0.5, 0.75].filter((l) => l <= maxLoss);
  const g = recoveryGain(L);
  const dotIn = prog(frame, fps, drawAt + drawDur * 0.8, 0.3);
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {gTicks.map((t) => (
        <g key={`g${t}`}>
          <line x1={padL} x2={padL + pw} y1={Y(t)} y2={Y(t)} stroke={hexA(C.blueline, 0.5)} strokeWidth={1.5 * u} />
          <text x={padL - 16 * u} y={Y(t) + fs * 0.35} fill={C.mist} fontFamily={FONT.mono} fontSize={fs} textAnchor="end">
            {fmtPct(t, 0)}
          </text>
        </g>
      ))}
      {lTicks.map((t) => (
        <text key={`l${t}`} x={X(t)} y={padT + ph + 40 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs} textAnchor="middle">
          {fmtPct(-t, 0)}
        </text>
      ))}
      <text x={padL + pw} y={padT + ph + 40 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs} textAnchor="end">
        LOSS
      </text>
      {/* legend, top-left where the curve never goes */}
      <g opacity={draw}>
        <line x1={padL + 20 * u} x2={padL + 70 * u} y1={padT + 30 * u} y2={padT + 30 * u} stroke={C.tape} strokeWidth={6 * u} strokeLinecap="round" />
        <text x={padL + 86 * u} y={padT + 30 * u + fs * 0.4} fill={C.tape} fontFamily={FONT.body} fontSize={SIZE.label * u}>
          gain needed to get back
        </text>
        <line x1={padL + 20 * u} x2={padL + 70 * u} y1={padT + 76 * u} y2={padT + 76 * u} stroke={C.mist} strokeWidth={3 * u} strokeDasharray={`${10 * u} ${9 * u}`} />
        <text x={padL + 86 * u} y={padT + 76 * u + fs * 0.4} fill={C.mist} fontFamily={FONT.body} fontSize={SIZE.label * u}>
          if gains and losses were equal
        </text>
      </g>
      {/* what intuition expects: a symmetric climb */}
      <line x1={X(0)} y1={Y(0)} x2={X(maxLoss * draw)} y2={Y(maxLoss * draw)} stroke={C.mist} strokeWidth={3 * u} strokeDasharray={`${10 * u} ${9 * u}`} />
      {/* the real climb */}
      <path d={curve.join("")} fill="none" stroke={C.tape} strokeWidth={6 * u} strokeLinecap="round" strokeLinejoin="round" />
      {marks.map((m, i) => {
        const o = prog(frame, fps, drawAt + drawDur * (m / maxLoss), 0.3);
        const gm = recoveryGain(m);
        if (gm > maxGain) return null;
        const near = Math.abs(L - m) < 0.07 && dotIn > 0;
        return (
          <g key={i} opacity={o}>
            <circle cx={X(m)} cy={Y(gm)} r={7 * u} fill={C.tape} />
            <text x={X(m) - 14 * u} y={Y(gm) - 16 * u} fill={C.tape} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 1.05} textAnchor="end" opacity={near ? 0 : 1}>
              {fmtPct(gm, 0)}
            </text>
          </g>
        );
      })}
      {/* the dot that rides the curve */}
      <g opacity={dotIn}>
        <line x1={X(L)} x2={X(L)} y1={Y(0)} y2={Y(g)} stroke={hexA(C.sodium, 0.5)} strokeWidth={2 * u} strokeDasharray={`${6 * u} ${6 * u}`} />
        <circle cx={X(L)} cy={Y(g)} r={14 * u} fill={C.sodium} />
        <text x={X(L) + 24 * u} y={Y(g) + 10 * u} fill={C.sodium} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 1.6}>
          {g > maxGain ? `${fmtPct(g, 0)} ↑` : fmtPct(g, 0)}
        </text>
      </g>
    </svg>
  );
};
