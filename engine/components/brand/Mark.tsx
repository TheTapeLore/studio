import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, CHART, MARK } from "../../tokens";
import { ease, prog } from "../../lib/anim";

const P = MARK.price_path_512 as [number, number][];
const WY = MARK.wire_y_512;

/** x where the final leg of the price path crosses the wire. */
export const markCrossX = () => {
  const [x1, y1] = P[P.length - 2];
  const [x2, y2] = P[P.length - 1];
  return x1 + ((x2 - x1) * (y1 - WY)) / (y1 - y2);
};

const MARK_SNAP = 0.18;

const pathLen = (pts: [number, number][]) =>
  pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

export interface MarkProps {
  size: number;
  line?: string;
  wire?: string;
  /** Stroke width in 512 units (brand default 36). */
  sw?: number;
  /** Draw-on animation: seconds after mount the price line starts drawing; null = static, already snapped. */
  drawAt?: number | null;
  drawDur?: number;
  /** Seconds (after drawAt) at which the line reaches each of the path's 7 vertices: lets the score "play" the
   * logo (the hook melody is the same path, note for note). Overrides drawDur's easing. */
  vertexAt?: number[] | null;
  style?: React.CSSProperties;
}

/**
 * The Snapped Tripwire. Price makes three shrinking pullbacks under the Sodium wire, breaks up,
 * and the wire snaps: both ends recoil upward. Geometry from tokens.mark.
 */
/** Drawn length along the path at time t when each vertex has its own arrival time (linear within a segment). */
const lengthAtVertexTimes = (t: number, times: number[]) => {
  const segs = P.slice(1).map((p, i) => Math.hypot(p[0] - P[i][0], p[1] - P[i][1]));
  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    const a = times[i], b = times[i + 1];
    if (t <= a) return acc;
    if (t < b) return acc + segs[i] * ((t - a) / Math.max(1e-6, b - a));
    acc += segs[i];
  }
  return acc;
};

/** With vertexAt: the second (after drawAt) at which the line crosses the wire on the final leg. */
export const markSnapFromVertices = (times: number[]) => {
  const [, y1] = P[P.length - 2];
  const [, y2] = P[P.length - 1];
  const f = (y1 - WY) / (y1 - y2);
  return times[times.length - 2] + f * (times[times.length - 1] - times[times.length - 2]);
};

export const Mark: React.FC<MarkProps> = ({ size, line = C.tape, wire = C.sodium, sw = 36, drawAt = null, drawDur = 1.1, vertexAt = null, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const X = markCrossX();
  const total = pathLen(P);
  const draw =
    drawAt === null ? 1 : vertexAt ? lengthAtVertexTimes(frame / fps - drawAt, vertexAt) / total : prog(frame, fps, drawAt, drawDur, "draw");
  // the wire snaps the moment the drawn length passes the crossing
  const crossLen = pathLen([...P.slice(0, -1), [X, WY]]);
  const snapT =
    drawAt === null ? 1 : prog(frame, fps, vertexAt ? drawAt + markSnapFromVertices(vertexAt) : markSnapSeconds(drawAt, drawDur), MARK_SNAP, "snap");
  const snapped = drawAt === null || draw * total >= crossLen;
  const gap = 26 * snapT;
  const curl = 22 * snapT;
  const w = sw * CHART.tripwire.widthRatio;
  const d = P.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" style={style}>
      {snapped ? (
        <>
          <path d={`M18,${WY} L${X - gap - 30},${WY} Q${X - gap - 6},${WY} ${X - gap - 2},${WY - curl}`} fill="none" stroke={wire} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M${X + gap + 2},${WY - curl} Q${X + gap + 6},${WY} ${X + gap + 30},${WY} L496,${WY}`} fill="none" stroke={wire} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <path d={`M18,${WY} L496,${WY}`} stroke={wire} strokeWidth={w} strokeLinecap="round" />
      )}
      <path d={d} fill="none" stroke={line} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={total} strokeDashoffset={total * (1 - draw)} />
    </svg>
  );
};

/** Seconds (same clock as drawAt) at which the drawn price line reaches the wire and the wire snaps. */
export const markSnapSeconds = (drawAt: number, drawDur = 1.1) => {
  const X = markCrossX();
  const frac = pathLen([...P.slice(0, -1), [X, WY]]) / pathLen(P);
  const e = ease("draw");
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (e(mid) < frac) lo = mid; else hi = mid;
  }
  return drawAt + hi * drawDur;
};
