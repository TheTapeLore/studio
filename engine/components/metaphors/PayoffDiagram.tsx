import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, hexA } from "../../tokens";
import { fmtMoney, prog } from "../../lib/anim";
import { Leg, legsPnl } from "../../lib/finance";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";

export interface PayoffDiagramProps {
  legs?: Leg[];
  /** Underlying price range [lo, hi]. */
  underlyingRange?: [number, number];
  /** Days left for the "today" curve (0 = expiry only). */
  daysLeft?: number;
  /** Multiplier (100 for US equity options). */
  multiplier?: number;
  drawAt?: number;
}

/**
 * Options payoff. Solid Tape line = at expiry; hollow Tape line = today (Black–Scholes). The loss region is
 * shaded Ember and the gain region Lichen with equal weight, and max loss is labelled as large as max gain
 * (compliance rule 3).
 */
export const PayoffDiagram: React.FC<PayoffDiagramProps> = ({
  legs = [{ type: "call", side: "long", strike: 100, premium: 4.5, iv: 0.3 }],
  underlyingRange = [75, 130],
  daysLeft = 30,
  multiplier = 100,
  drawAt = 0.2,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const [lo, hi] = underlyingRange;
  const N = 200;
  const xs = Array.from({ length: N + 1 }, (_, i) => lo + ((hi - lo) * i) / N);
  const exp = xs.map((s) => legsPnl(legs, s, 0) * multiplier);
  const now = xs.map((s) => legsPnl(legs, s, daysLeft) * multiplier);
  const yAbs = Math.max(...exp.map(Math.abs), ...now.map(Math.abs)) * 1.1;
  const padL = 30 * u, padR = 30 * u, padT = 70 * u, padB = 120 * u;
  const X = (s: number) => padL + ((s - lo) / (hi - lo)) * (w - padL - padR);
  const Y = (v: number) => padT + (h - padT - padB) * (0.5 - v / (2 * yAbs));
  const draw = prog(frame, fps, drawAt, 1.2, "draw");
  const cut = Math.floor(draw * N);
  const line = (arr: number[]) => arr.slice(0, cut + 1).map((v, i) => `${i ? "L" : "M"}${X(xs[i]).toFixed(1)},${Y(v).toFixed(1)}`).join("");
  const area = (sign: 1 | -1) => {
    const pts: string[] = [`M${X(xs[0])},${Y(0)}`];
    for (let i = 0; i <= cut; i++) pts.push(`L${X(xs[i]).toFixed(1)},${Y(sign > 0 ? Math.max(0, exp[i]) : Math.min(0, exp[i])).toFixed(1)}`);
    pts.push(`L${X(xs[cut])},${Y(0)} Z`);
    return pts.join("");
  };
  // true extremes: price can fall to 0 and rise without limit
  const at = (s: number) => legsPnl(legs, s, 0) * multiplier;
  const far = hi * 50;
  const slopeUp = at(far * 2) - at(far);
  const maxLoss = Math.min(...exp, at(0)), maxGain = Math.max(...exp, at(0));
  const openGain = slopeUp > 1e-6;
  const openLoss = slopeUp < -1e-6;
  const bes = xs.filter((_, i) => i > 0 && Math.sign(exp[i]) !== Math.sign(exp[i - 1]) && exp[i - 1] !== 0);
  const labels = prog(frame, fps, drawAt + 1.1, 0.4);
  const fs = SIZE.label * u * 1.1;
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <path d={area(1)} fill={hexA(C.lichen, 0.22)} />
      <path d={area(-1)} fill={hexA(C.ember, 0.22)} />
      <line x1={padL} x2={w - padR} y1={Y(0)} y2={Y(0)} stroke={C.mist} strokeWidth={2 * u} />
      {daysLeft > 0 ? (
        <>
          <path d={line(now)} fill="none" stroke={C.tape} strokeWidth={9 * u} strokeLinejoin="round" />
          <path d={line(now)} fill="none" stroke={C.prussian} strokeWidth={4 * u} strokeLinejoin="round" />
        </>
      ) : null}
      <path d={line(exp)} fill="none" stroke={C.tape} strokeWidth={6 * u} strokeLinejoin="round" />
      {legs.filter((g) => g.strike).map((g, i) => (
        <g key={i} opacity={labels}>
          <line x1={X(g.strike!)} x2={X(g.strike!)} y1={Y(0) - 10 * u} y2={Y(0) + 10 * u} stroke={C.mist} strokeWidth={3 * u} />
          <text x={X(g.strike!)} y={h - padB + 50 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={SIZE.tape * u} textAnchor="middle">
            {`K ${g.strike}`}
          </text>
        </g>
      ))}
      {bes.map((b, i) => (
        <g key={`be${i}`} opacity={labels}>
          <circle cx={X(b)} cy={Y(0)} r={8 * u} fill={C.tape} />
          <text x={X(b)} y={h - padB + 86 * u} fill={C.tape} fontFamily={FONT.mono} fontSize={SIZE.tape * u} textAnchor="middle">
            {`BREAKEVEN ${b.toFixed(1)}`}
          </text>
        </g>
      ))}
      <g opacity={labels} fontFamily={FONT.mono} fontWeight={600} fontSize={fs}>
        <text x={padL} y={padT - 24 * u} fill={C.lichen}>
          {openGain ? "MAX GAIN: OPEN-ENDED" : `MAX GAIN ${fmtMoney(maxGain)}`}
        </text>
        <text x={padL} y={h - padB + 14 * u} fill={C.ember} dy={0}>
          {openLoss ? "MAX LOSS: OPEN-ENDED" : `MAX LOSS ${fmtMoney(maxLoss)}`}
        </text>
      </g>
      <g opacity={labels} fontFamily={FONT.mono} fontSize={SIZE.tape * u} fill={C.mist}>
        <text x={w - padR} y={h - padB + 14 * u} textAnchor="end">
          {daysLeft > 0 ? `SOLID = EXPIRY · HOLLOW = ${daysLeft}D LEFT` : "AT EXPIRY"}
        </text>
      </g>
    </svg>
  );
};
