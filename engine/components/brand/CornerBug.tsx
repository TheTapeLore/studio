import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { prog } from "../../lib/anim";
import { useLayout } from "../layout/layout";
import { Mark } from "./Mark";

/** The mark at 72px, bottom-right inside the safe zone, 85% opacity (tokens.layout.corner_bug). */
export const CornerBug: React.FC<{ inAt?: number; outAt?: number | null }> = ({ inAt = 0.6, outAt = null }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { bug } = useLayout();
  const o = prog(frame, fps, inAt, 0.4) * (outAt === null ? 1 : 1 - prog(frame, fps, outAt, 0.3));
  return (
    <div style={{ position: "absolute", left: bug.x, top: bug.y, width: bug.size, height: bug.size, opacity: 0.85 * o }}>
      <Mark size={bug.size} sw={44} />
    </div>
  );
};
