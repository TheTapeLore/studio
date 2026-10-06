import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, MOTION, SIZE, TYPE, hexA } from "../../tokens";
import { prog } from "../../lib/anim";
import { Rect, useLayout } from "../layout/layout";

export interface TapeStripProps {
  text: string;
  /** Seconds (from the parent sequence start) when the tape starts to unspool. null = already in. */
  inAt?: number | null;
  /** Seconds when it rolls back out. null = stays. */
  outAt?: number | null;
  rect?: Partial<Rect>;
  fontSize?: number;
  /** Right-aligned text on the same tape, e.g. "SIMULATED" or "FAILURE FILE". */
  right?: string | null;
  rightColor?: string;
}

/**
 * The TapeStrip: a Tape-coloured band carrying "LORE 017   RISK". It unspools from the left edge like ticker
 * tape leaving a reel, and rewinds at the end. Text is Martian Mono 600, uppercase, 0.18em tracking.
 */
export const TapeStrip: React.FC<TapeStripProps> = ({ text, inAt = 0, outAt = null, rect, fontSize, right = null, rightColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const r = { ...L.tape, ...rect };
  const pin = inAt === null ? 1 : prog(frame, fps, inAt, MOTION.tapeStripIn_s, "draw");
  const pout = outAt === null ? 0 : prog(frame, fps, outAt, MOTION.tapeStripOut_s, "standard");
  const reveal = pin * (1 - pout);
  if (reveal <= 0.0001) return null;
  const w = r.w * reveal;
  const fs = fontSize ?? SIZE.tape * L.u;
  const spool = Math.min(18 * L.u, w);
  const moving = reveal > 0.001 && reveal < 0.999;
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: w, height: r.h, overflow: "hidden", background: C.tape }}>
      <div
        style={{
          position: "absolute",
          left: r.h * 0.6,
          top: 0,
          height: r.h,
          display: "flex",
          alignItems: "center",
          fontFamily: FONT.mono,
          fontWeight: 600,
          fontSize: fs,
          letterSpacing: TYPE.mono.tracking,
          color: C.prussian,
          whiteSpace: "pre",
          textTransform: "uppercase",
        }}
      >
        {text}
      </div>
      {right ? (
        <div
          style={{
            position: "absolute",
            left: r.w - Math.max(r.h * 0.6, L.safe.right) - 2000,
            width: 2000,
            top: 0,
            height: r.h,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            fontFamily: FONT.mono,
            fontWeight: 600,
            fontSize: fs,
            letterSpacing: TYPE.mono.tracking,
            color: rightColor ?? C.prussian,
            whiteSpace: "pre",
            textTransform: "uppercase",
          }}
        >
          {right}
        </div>
      ) : null}
      {moving ? (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: spool,
            height: r.h,
            background: `linear-gradient(90deg, ${hexA(C.tape, 0)} 0%, ${hexA(C.mist, 0.9)} 70%, ${C.blueline} 100%)`,
          }}
        />
      ) : null}
    </div>
  );
};
