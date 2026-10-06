import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, hexA } from "../../tokens";
import { clamp, fmtMoney, prog } from "../../lib/anim";
import { useLayout } from "../layout/layout";
import { Sfx } from "../layout/Sfx";
import { useStage } from "../layout/Stage";

export interface RopeProps {
  /** Account equity at the start (dollars). */
  equity?: number;
  initialMargin?: number;
  maintenance?: number;
  /** Daily change in the position's value (dollars, + or −). */
  moves?: number[];
  dur?: number;
  startAt?: number;
}

/**
 * Futures margin as rope slack. The rope ties your account to the position; slack = equity above the
 * maintenance level. Losses take up the slack; at maintenance the rope snaps (margin call).
 */
export const Rope: React.FC<RopeProps> = ({ equity = 15000, initialMargin = 12000, maintenance = 11000, moves = [600, -900, -1400, 500, -1800, -1200], dur = 4.5, startAt = 0.4 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const path = [equity];
  moves.forEach((m) => path.push(path[path.length - 1] + m));
  const callIdx = path.findIndex((v) => v < maintenance);
  const t = clamp((frame / fps - startAt) / dur) * moves.length;
  const k = Math.floor(t), f = t - k;
  const eq = k >= moves.length ? path[moves.length] : path[k] + (path[k + 1] - path[k]) * prog(f * fps, fps, 0, 0.6);
  const snapped = callIdx > 0 && t >= callIdx;
  const snapS = callIdx > 0 ? startAt + (callIdx / moves.length) * dur : Infinity;
  const snapP = snapped ? prog(frame, fps, snapS, 0.25, "snap") : 0;
  const slack = clamp((eq - maintenance) / (equity - maintenance + 1e-9));
  // anchors
  const ax = w * 0.12, bx = w * 0.88, ay = h * 0.34;
  const sag = slack * h * 0.22;
  const midX = (ax + bx) / 2;
  const fs = SIZE.tape * u;
  const ropeCol = slack < 0.25 ? C.ember : C.tape;
  // equity chart
  const cy0 = h * 0.62, cy1 = h * 0.95;
  const lo = Math.min(...path, maintenance) * 0.97, hi = Math.max(...path, initialMargin) * 1.02;
  const Y = (v: number) => cy1 - ((v - lo) / (hi - lo)) * (cy1 - cy0);
  const X = (i: number) => ax + (i / moves.length) * (bx - ax);
  const pts = path.slice(0, Math.min(path.length, k + 1)).map((v, i) => `${i ? "L" : "M"}${X(i)},${Y(v)}`);
  pts.push(`L${X(Math.min(t, moves.length))},${Y(eq)}`);
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {/* anchors */}
      <rect x={ax - 70 * u} y={ay - 60 * u} width={120 * u} height={120 * u} rx={14 * u} fill={hexA(C.abyss, 0.8)} stroke={C.blueline} strokeWidth={3 * u} />
      <text x={ax - 10 * u} y={ay - 78 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs} textAnchor="middle">
        ACCOUNT
      </text>
      <text x={ax - 10 * u} y={ay + 10 * u} fill={C.tape} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 1.05} textAnchor="middle">
        {fmtMoney(eq)}
      </text>
      <rect x={bx - 50 * u} y={ay - 60 * u} width={120 * u} height={120 * u} rx={14 * u} fill={hexA(C.abyss, 0.8)} stroke={C.blueline} strokeWidth={3 * u} />
      <text x={bx + 10 * u} y={ay - 78 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs} textAnchor="middle">
        1 CONTRACT
      </text>
      {/* the rope */}
      {!snapped ? (
        <path d={`M${ax + 50 * u},${ay} Q${midX},${ay + sag * 2} ${bx - 50 * u},${ay}`} fill="none" stroke={ropeCol} strokeWidth={8 * u} strokeLinecap="round" />
      ) : (
        <>
          <path d={`M${ax + 50 * u},${ay} Q${midX - 120 * u},${ay + 40 * u * snapP} ${midX - 30 * u - 60 * u * snapP},${ay + 80 * u * snapP}`} fill="none" stroke={C.ember} strokeWidth={8 * u} strokeLinecap="round" />
          <path d={`M${bx - 50 * u},${ay} Q${midX + 120 * u},${ay + 40 * u * snapP} ${midX + 30 * u + 60 * u * snapP},${ay + 80 * u * snapP}`} fill="none" stroke={C.ember} strokeWidth={8 * u} strokeLinecap="round" />
          <text x={midX} y={ay - 30 * u} fill={C.ember} fontFamily={FONT.display} fontWeight={900} fontSize={SIZE.h2 * u} textAnchor="middle" opacity={snapP}>
            Margin call
          </text>
        </>
      )}
      <text x={midX} y={ay + sag + 70 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs} textAnchor="middle" opacity={snapped ? 0 : 1}>
        {`SLACK ${fmtMoney(Math.max(0, eq - maintenance))}`}
      </text>
      {/* equity vs maintenance */}
      <line x1={ax} x2={bx} y1={Y(maintenance)} y2={Y(maintenance)} stroke={C.ember} strokeWidth={3 * u} strokeDasharray={`${10 * u} ${8 * u}`} />
      <text x={bx} y={Y(maintenance) + 32 * u} fill={C.ember} fontFamily={FONT.mono} fontSize={fs} textAnchor="end">
        {`MAINTENANCE ${fmtMoney(maintenance)}`}
      </text>
      <line x1={ax} x2={bx} y1={Y(initialMargin)} y2={Y(initialMargin)} stroke={hexA(C.mist, 0.6)} strokeWidth={2 * u} strokeDasharray={`${6 * u} ${8 * u}`} />
      <text x={ax} y={Y(initialMargin) - 12 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs} textAnchor="start">
        {`INITIAL ${fmtMoney(initialMargin)}`}
      </text>
      <path d={pts.join("")} fill="none" stroke={C.tape} strokeWidth={4 * u} strokeLinejoin="round" />
      {Number.isFinite(snapS) ? <Sfx name="snap" at={snapS} /> : null}
    </svg>
  );
};
