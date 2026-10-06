import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE } from "../../tokens";
import { parseMarks, prog } from "../../lib/anim";
import { useLayout } from "./layout";

/** Display headline (Big Shoulders 900). Wrap one phrase in [[...]] to set it in Sodium. */
export const Headline: React.FC<{ text: string; size?: number; align?: "left" | "center"; delay?: number; color?: string; upper?: boolean }> = ({
  text,
  size,
  align = "left",
  delay = 0,
  color = C.tape,
  upper = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const p = prog(frame, fps, delay, 0.35);
  const fs = size ?? SIZE.h2 * u;
  return (
    <div
      style={{
        fontFamily: FONT.display,
        fontWeight: 900,
        fontSize: fs,
        lineHeight: 0.98,
        color,
        textAlign: align,
        textTransform: upper ? "uppercase" : undefined,
        opacity: p,
        transform: `translateY(${(1 - p) * 18 * u}px)`,
        textWrap: "balance",
      }}
    >
      {parseMarks(text).map((m, i) => (
        <span key={i} style={m.hi ? { color: C.sodium } : undefined}>
          {m.text}
        </span>
      ))}
    </div>
  );
};
