import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, CHART, FONT, SIZE, TYPE } from "../../tokens";
import { clamp, prog } from "../../lib/anim";
import { useLayout } from "../layout/layout";
import { Sfx } from "../layout/Sfx";
import { useStage } from "../layout/Stage";

export interface PivotStepProps {
  /** Seconds: the line starts drawing, and how long the whole path takes. */
  drawAt?: number;
  drawDur?: number;
  /** Phase labels under the line: waiting, the break, holding. */
  labels?: [string, string, string];
  wireLabel?: string;
  sfx?: boolean;
  note?: string;
  /** Path x positions (0..1000) where he added to the winner: a marker + ADD label as the line passes. */
  adds?: number[];
}

// The idea as a path in a 1000 x 600 box (y down): chop under the line, one decisive step through it, a long run.
const PATH: [number, number][] = [
  [0, 420], [60, 380], [110, 440], [170, 330], [230, 410], [290, 318], [345, 392], [400, 312], [440, 360],
  [470, 300], [490, 180], [560, 205], [620, 150], [690, 170], [760, 105], [830, 122], [900, 60], [1000, 40],
];
const WIRE_Y = 300;

const lengthOf = (pts: [number, number][]) => {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return acc;
};

/**
 * A legend's pivotal point as our tripwire (the lineage of the brand's signature): price chops under a Sodium wire
 * (WAIT), steps through it once (ACT: the wire snaps, with the snap sound), then runs (SIT TIGHT). An illustration
 * of the idea, labelled as one: no data, no ticker.
 */
export const PivotStep: React.FC<PivotStepProps> = ({
  drawAt = 0.2,
  drawDur = 4.0,
  labels = ["WAIT", "ACT", "SIT TIGHT"],
  wireLabel = "PIVOTAL POINT",
  sfx = true,
  note = "ILLUSTRATION · NOT A CHART",
  adds = [],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const box = { x: 0, y: 70 * u, w, h: h - 170 * u };
  const k = Math.min(box.w / 1000, box.h / 600);
  const ox = box.x + (box.w - 1000 * k) / 2, oy = box.y + (box.h - 600 * k) / 2;
  const X = (x: number) => ox + x * k, Y = (y: number) => oy + y * k;
  const acc = lengthOf(PATH);
  const total = acc[acc.length - 1];
  const p = prog(frame, fps, drawAt, drawDur, "linear");
  const L = p * total;
  // visible points up to length L
  const pts: [number, number][] = [PATH[0]];
  for (let i = 1; i < PATH.length; i++) {
    if (acc[i] <= L) pts.push(PATH[i]);
    else {
      const f = (L - acc[i - 1]) / (acc[i] - acc[i - 1]);
      if (f > 0) pts.push([PATH[i - 1][0] + (PATH[i][0] - PATH[i - 1][0]) * f, PATH[i - 1][1] + (PATH[i][1] - PATH[i - 1][1]) * f]);
      break;
    }
  }
  // the crossing: segment 9 -> 10 goes through the wire
  const ci = PATH.findIndex(([, y], i) => i > 0 && y < WIRE_Y - 1 && PATH[i - 1][1] >= WIRE_Y - 1);
  const [ax, ay] = PATH[ci - 1], [bx, byy] = PATH[ci];
  const cf = (ay - WIRE_Y) / (ay - byy);
  const crossX = ax + (bx - ax) * cf;
  const crossLen = acc[ci - 1] + (acc[ci] - acc[ci - 1]) * cf;
  const snapS = drawAt + (crossLen / total) * drawDur;
  const snap = prog(frame, fps, snapS, 0.18, "snap");
  const wireDraw = prog(frame, fps, 0, 0.5, "draw");
  const sw = 5 * u;
  const rp = CHART.tripwire.recoilPx * u;
  const wy = Y(WIRE_Y), x0 = X(0), x1 = X(1000), xc = X(crossX);
  const gap = 20 * u * snap, curl = rp * snap;
  const fs = SIZE.tape * u;
  const lab = (i: number, x: number, y: number, showAt: number) => (
    <text x={X(x)} y={Y(y)} fill={i === 1 ? C.tape : C.mist} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 1.15} textAnchor="middle" letterSpacing={TYPE.mono.tracking} opacity={clamp((L - showAt) / 60)}>
      {labels[i]}
    </text>
  );
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {snap <= 0 ? (
        <line x1={x0} x2={x0 + (x1 - x0) * wireDraw} y1={wy} y2={wy} stroke={C.sodium} strokeWidth={sw} strokeLinecap="round" />
      ) : (
        <g>
          <path d={`M${x0},${wy} L${xc - gap - 26 * u},${wy} Q${xc - gap - 6 * u},${wy} ${xc - gap},${wy - curl}`} fill="none" stroke={C.sodium} strokeWidth={sw} strokeLinecap="round" />
          <path d={`M${xc + gap},${wy - curl} Q${xc + gap + 6 * u},${wy} ${xc + gap + 26 * u},${wy} L${x1},${wy}`} fill="none" stroke={C.sodium} strokeWidth={sw} strokeLinecap="round" />
        </g>
      )}
      <text x={x0} y={wy - 18 * u} fill={C.sodium} fontFamily={FONT.mono} fontWeight={600} fontSize={fs} letterSpacing="0.12em" opacity={wireDraw}>
        {wireLabel}
      </text>
      <polyline points={pts.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(" ")} fill="none" stroke={C.tape} strokeWidth={11 * u} strokeLinejoin="round" strokeLinecap="round" />
      {adds.map((ax) => {
        // the add sits on the path at x = ax
        const i = PATH.findIndex(([x]) => x >= ax);
        if (i <= 0) return null;
        const [x0p, y0p] = PATH[i - 1], [x1p, y1p] = PATH[i];
        const f = (ax - x0p) / Math.max(1e-6, x1p - x0p);
        const ay = y0p + (y1p - y0p) * f;
        const lenAt = acc[i - 1] + (acc[i] - acc[i - 1]) * f;
        const a = clamp((L - lenAt) / 40);
        if (a <= 0) return null;
        return (
          <g key={ax} opacity={a}>
            <circle cx={X(ax)} cy={Y(ay)} r={11 * u} fill={C.abyss} stroke={C.tape} strokeWidth={4 * u} />
            <text x={X(ax)} y={Y(ay) + 46 * u} fill={C.mist} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 0.9} textAnchor="middle" letterSpacing={TYPE.mono.tracking}>
              ADD
            </text>
          </g>
        );
      })}
      {lab(0, 220, 500, acc[3])}
      {lab(1, crossX + 70, WIRE_Y + 62, crossLen)}
      {lab(2, 905, 165, acc[16])}
      {note ? (
        <text x={w} y={h - 8 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs * 0.8} textAnchor="end" letterSpacing={TYPE.mono.tracking} opacity={0.8}>
          {note}
        </text>
      ) : null}
      {sfx ? (
        <foreignObject width={1} height={1}>
          <Sfx name="snap" at={snapS} />
        </foreignObject>
      ) : null}
    </svg>
  );
};
