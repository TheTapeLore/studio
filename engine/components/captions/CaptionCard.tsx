import React from "react";
import { glueSigns } from "../../lib/anim";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, hexA } from "../../tokens";
import { prog } from "../../lib/anim";
import { Rect, useLayout } from "../layout/layout";

/** Render **bold** spans. */
export const RichText: React.FC<{ text: string; boldColor?: string }> = ({ text, boldColor }) => (
  <>
    {glueSigns(text).split(/(\*\*.+?\*\*)/g).map((part, i) =>
      part.startsWith("**") ? (
        <span key={i} style={{ fontWeight: 700, color: boldColor }}>
          {part.slice(2, -2)}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    )}
  </>
);

export interface CaptionCardProps {
  text: string;
  /** Seconds the card is on screen (for the exit fade). */
  dur: number;
  rect?: Rect;
  size?: number;
}

/**
 * A burned-in caption card (feeds autoplay muted). Atkinson Hyperlegible Next, left-aligned in the caption band,
 * a Blueline rule at its left edge. Rises in over 0.2 s, fades out over the last 0.15 s.
 */
export const CaptionCard: React.FC<CaptionCardProps> = ({ text, dur, rect, size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const r = rect ?? L.caption;
  const fs = size ?? SIZE.caption * L.u;
  const pin = prog(frame, fps, 0, 0.22);
  const pout = prog(frame, fps, dur - 0.15, 0.15);
  return (
    <div
      style={{
        position: "absolute",
        left: r.x,
        top: r.y,
        width: r.w,
        height: r.h,
        display: "flex",
        alignItems: "flex-start",
        opacity: pin * (1 - pout),
        transform: `translateY(${(1 - pin) * 14 * L.u}px)`,
      }}
    >
      <div style={{ width: 5 * L.u, alignSelf: "stretch", maxHeight: fs * 1.25 * 3, background: C.blueline, marginRight: 26 * L.u, borderRadius: 3 * L.u }} />
      <div
        style={{
          fontFamily: FONT.body,
          fontWeight: 400,
          fontSize: fs,
          lineHeight: 1.22,
          color: C.tape,
          textShadow: `0 ${2 * L.u}px ${12 * L.u}px ${hexA(C.abyss, 0.9)}`,
          textWrap: "balance",
        }}
      >
        <RichText text={text} />
      </div>
    </div>
  );
};
