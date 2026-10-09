import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, TYPE, hexA } from "../../tokens";
import { prog } from "../../lib/anim";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";
import { Emblem } from "./emblems";

export interface LegendTitleProps {
  /** "01" */
  no: string;
  name: string;
  /** "1877 – 1940" */
  years?: string;
  /** "Stocks and commodities" */
  markets?: string;
  emblem?: string;
}

/**
 * The opening title of a Legend episode, kept apart from the story: the emblem draws in its medallion, then a
 * tape-white tag reads LEGEND 01 (its own line, never inside a caption), then the name, then years and markets.
 * The emblem's diamond is the frame's one Sodium.
 */
export const LegendTitle: React.FC<LegendTitleProps> = ({ no, name, years, markets, emblem = "pivot-step" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const em = prog(frame, fps, 0.0, 1.0, "draw");
  const tag = prog(frame, fps, 0.15, 0.35, "draw");
  const nm = prog(frame, fps, 0.3, 0.4);
  const sub = prog(frame, fps, 0.6, 0.4);
  const med = Math.min(h * 0.36, w * 0.42, 380 * u);
  const words = name.toUpperCase().split(" ");
  // one line if it fits the stage, else one word per line
  const nameSize = Math.min(SIZE.hero * u * 1.15, (w * 0.96) / Math.max(4, name.length * 0.5));
  const twoLines = nameSize < SIZE.h1 * u * 0.95 && words.length > 1;
  const fs = twoLines ? Math.min(SIZE.hero * u * 1.15, (w * 0.96) / Math.max(...words.map((x) => x.length * 0.52))) : nameSize;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: med, height: med, borderRadius: "50%", background: C.abyss, border: `${3 * u}px solid ${C.blueline}`, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: med * 0.09, borderRadius: "50%", border: `${2 * u}px dotted ${hexA(C.blueline, 0.9)}` }} />
        <Emblem kind={emblem} size={med * 0.74} draw={em} />
      </div>
      <div style={{ marginTop: 34 * u, height: 54 * u, overflow: "hidden", width: 300 * u * tag, background: C.tape, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: FONT.mono, fontWeight: 600, fontSize: SIZE.label * u * 0.95, letterSpacing: TYPE.mono.tracking, color: C.prussian, whiteSpace: "nowrap" }}>{`LEGEND ${no}`}</div>
      </div>
      <div style={{ marginTop: 22 * u, fontFamily: FONT.display, fontWeight: 900, fontSize: fs, lineHeight: 0.92, color: C.tape, textAlign: "center", opacity: nm, transform: `translateY(${(1 - nm) * 16 * u}px)` }}>
        {twoLines ? words.map((x) => <div key={x}>{x}</div>) : name.toUpperCase()}
      </div>
      {years || markets ? (
        <div style={{ marginTop: 22 * u, fontFamily: FONT.mono, fontWeight: 600, fontSize: SIZE.tape * u * 1.05, letterSpacing: TYPE.mono.tracking, color: C.mist, opacity: sub, textTransform: "uppercase", textAlign: "center" }}>
          {[years, markets].filter(Boolean).join("  ·  ")}
        </div>
      ) : null}
    </div>
  );
};
