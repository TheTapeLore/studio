import React from "react";
import { C, FONT } from "../../tokens";
import { Mark } from "./Mark";

/** Mark + wordmark: "the" in Martian Mono above "TAPE LORE" in Big Shoulders Display 900 (brand/gen/wordmark.py). */
export const Lockup: React.FC<{ height: number; ink?: string; small?: string; drawAt?: number | null }> = ({ height: H, ink = C.tape, small = C.mist, drawAt = null }) => {
  const size = H * 0.62;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", height: H, gap: H * 0.05 }}>
      <Mark size={H * 0.95} drawAt={drawAt} line={ink} />
      <div style={{ position: "relative", height: H, width: size * 2.75 }}>
        <div style={{ position: "absolute", left: size * 0.02, top: H * 0.8 - size * 0.8 - size * 0.22 * 0.8, fontFamily: FONT.mono, fontSize: size * 0.22, color: small, lineHeight: 1 }}>the</div>
        <div style={{ position: "absolute", left: 0, top: H * 0.8 - size * 0.74, fontFamily: FONT.display, fontWeight: 900, fontSize: size, color: ink, lineHeight: 1, letterSpacing: size * 0.02, whiteSpace: "nowrap" }}>TAPE LORE</div>
      </div>
    </div>
  );
};
