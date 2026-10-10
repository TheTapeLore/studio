import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, CHART, FONT, SIZE, TYPE, hexA } from "../../tokens";
import { clamp, prog } from "../../lib/anim";
import { useLayout } from "../layout/layout";
import { Sfx } from "../layout/Sfx";
import { useStage } from "../layout/Stage";

export interface CupHandleProps {
  drawAt?: number;
  drawDur?: number;
  /** Seconds at which each part's label appears (cup, handle, pivot/breakout). Default: as the line reaches it. */
  labelsAt?: { cup?: number; handle?: number; pivot?: number; volume?: number };
  /** Seconds: the loss line 7-8% under the buy appears. */
  stopAt?: number | null;
  stopLabel?: string;
  sfx?: boolean;
  note?: string;
  /** Story continuity across beats (transition "cut"): start already drawn this far (0..1). */
  startDrawn?: number;
}

// the shape in a 1000 x 600 box (y down): left lip, rounded cup, right lip, a small handle drifting down, the break
const PATH: [number, number][] = [
  [0, 120], [40, 90], [80, 110], [130, 190], [190, 290], [260, 365], [330, 400], [400, 405], [470, 385], [540, 330],
  [600, 250], [650, 170], [690, 125], [720, 112], [750, 150], [780, 175], [810, 160], [840, 182], [870, 165],
  [900, 118], [930, 70], [970, 40], [1000, 20],
];
const PIVOT_Y = 112;
// weekly volume, relative (dries up in the handle, surges on the break)
const VOL = [0.55, 0.5, 0.6, 0.7, 0.65, 0.5, 0.45, 0.4, 0.45, 0.5, 0.55, 0.6, 0.55, 0.5, 0.4, 0.32, 0.28, 0.3, 0.26, 0.95, 1.0, 0.8, 0.7];

const lengths = (pts: [number, number][]) => {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return acc;
};

/**
 * The cup with handle, drawn and named part by part: a rounded dip (the cup), a smaller dip near the top (the handle,
 * with volume drying up), then the break above the handle's high (the pivot, the frame's one Sodium, snapping) on a
 * volume surge. Optional: the loss line 7-8% under the buy. An illustration of the pattern, labelled as one.
 */
export const CupHandle: React.FC<CupHandleProps> = ({ drawAt = 0.2, drawDur = 5, labelsAt = {}, stopAt = null, stopLabel = "SELL IF IT FALLS 7–8% BELOW YOUR BUY", sfx = true, note = "ILLUSTRATION · NOT A CHART", startDrawn = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const fs = SIZE.tape * u;
  const volH = h * 0.16;
  const box = { x: 0, y: 40 * u, w, h: h - 40 * u - volH - 60 * u };
  const k = Math.min(box.w / 1000, box.h / 560);
  const ox = (w - 1000 * k) / 2, oy = box.y + (box.h - 560 * k) / 2;
  const X = (x: number) => ox + x * k, Y = (y: number) => oy + y * k;
  const acc = lengths(PATH);
  const total = acc[acc.length - 1];
  const p = startDrawn + (1 - startDrawn) * prog(frame, fps, drawAt, drawDur, "linear");
  const L = p * total;
  const pts: [number, number][] = [PATH[0]];
  for (let i = 1; i < PATH.length; i++) {
    if (acc[i] <= L) pts.push(PATH[i]);
    else {
      const f = (L - acc[i - 1]) / (acc[i] - acc[i - 1]);
      pts.push([PATH[i - 1][0] + (PATH[i][0] - PATH[i - 1][0]) * f, PATH[i - 1][1] + (PATH[i][1] - PATH[i - 1][1]) * f]);
      break;
    }
  }
  const headX = pts[pts.length - 1][0];
  // the break: first crossing above the pivot after the handle
  const ci = PATH.findIndex(([x, y], i) => i > 0 && x > 850 && y < PIVOT_Y && PATH[i - 1][1] >= PIVOT_Y);
  const [ax, ay] = PATH[ci - 1], [bx, by] = PATH[ci];
  const cf = (ay - PIVOT_Y) / (ay - by);
  const crossX = ax + (bx - ax) * cf;
  const crossLen = acc[ci - 1] + (acc[ci] - acc[ci - 1]) * cf;
  const snapS = drawAt + ((crossLen / total - startDrawn) / Math.max(1e-6, 1 - startDrawn)) * drawDur;
  const snap = startDrawn * total >= crossLen ? 1 : prog(frame, fps, snapS, 0.18, "snap");
  const lab = (key: keyof NonNullable<CupHandleProps["labelsAt"]>, reachX: number) => {
    const s = labelsAt[key];
    return s !== undefined ? prog(frame, fps, s, 0.35) : clamp((headX - reachX) / 40);
  };
  const wy = Y(PIVOT_Y), xa = X(560), xb = X(1000), xc = X(crossX);
  const gap = 16 * u * snap, curl = CHART.tripwire.recoilPx * u * snap;
  const sw = 4.5 * u;
  const stopA = stopAt === null ? 0 : prog(frame, fps, stopAt, 0.4);
  const stopY = Y(PIVOT_Y + 80); // about 8% under the pivot at this sketch's scale (the cup is ~30% deep)
  const volTop = h - volH - 20 * u;
  const bw = (1000 * k) / VOL.length;
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {/* the pivot: the handle's high, the line it breaks */}
      <g opacity={lab("pivot", 700)}>
        {snap <= 0 ? (
          <line x1={xa} x2={xb} y1={wy} y2={wy} stroke={C.sodium} strokeWidth={sw} strokeLinecap="round" />
        ) : (
          <g>
            <path d={`M${xa},${wy} L${xc - gap - 22 * u},${wy} Q${xc - gap - 5 * u},${wy} ${xc - gap},${wy - curl}`} fill="none" stroke={C.sodium} strokeWidth={sw} strokeLinecap="round" />
            <path d={`M${xc + gap},${wy - curl} Q${xc + gap + 5 * u},${wy} ${xc + gap + 22 * u},${wy} L${xb},${wy}`} fill="none" stroke={C.sodium} strokeWidth={sw} strokeLinecap="round" />
          </g>
        )}
        <text x={xa} y={wy - 16 * u} fill={C.sodium} fontFamily={FONT.mono} fontWeight={600} fontSize={fs} letterSpacing="0.1em">
          BUY POINT: TOP OF THE HANDLE
        </text>
      </g>
      <polyline points={pts.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(" ")} fill="none" stroke={C.tape} strokeWidth={10 * u} strokeLinejoin="round" strokeLinecap="round" />
      <text x={X(330)} y={Y(470)} fill={C.tape} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 1.2} textAnchor="middle" letterSpacing={TYPE.mono.tracking} opacity={lab("cup", 360)}>
        CUP
      </text>
      <text x={X(790)} y={Y(250)} fill={C.tape} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 1.2} textAnchor="middle" letterSpacing={TYPE.mono.tracking} opacity={lab("handle", 800)}>
        HANDLE
      </text>
      {/* volume */}
      {VOL.map((v, i) => {
        const xi = ox + i * bw;
        const reached = clamp((headX - (i / (VOL.length - 1)) * 1000) / 30);
        if (reached <= 0) return null;
        const surge = i >= 19 && i <= 20;
        return <rect key={i} x={xi + bw * 0.15} y={volTop + volH * (1 - v)} width={bw * 0.7} height={volH * v * reached} fill={surge ? hexA(C.lichen, 0.85) : hexA(C.blueline, 0.8)} />;
      })}
      <text x={ox} y={volTop - 10 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs * 0.85} letterSpacing={TYPE.mono.tracking}>
        VOLUME
      </text>
      <text x={ox + 20.5 * bw} y={volTop - 10 * u} fill={C.lichen} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 0.9} textAnchor="middle" opacity={lab("volume", 940)}>
        SURGE ON THE BREAK
      </text>
      {stopA > 0 ? (
        <g opacity={stopA}>
          <line x1={xc} x2={xb} y1={stopY} y2={stopY} stroke={C.ember} strokeWidth={4 * u} strokeDasharray={`${14 * u} ${8 * u}`} />
          <text x={xb} y={stopY + 34 * u} fill={C.ember} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 0.95} textAnchor="end">
            {stopLabel}
          </text>
        </g>
      ) : null}
      {note ? (
        <text x={w} y={20 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs * 0.8} textAnchor="end" letterSpacing={TYPE.mono.tracking} opacity={0.8}>
          {note}
        </text>
      ) : null}
      {sfx && startDrawn * total < crossLen ? (
        <foreignObject width={1} height={1}>
          <Sfx name="snap" at={snapS} />
        </foreignObject>
      ) : null}
    </svg>
  );
};
