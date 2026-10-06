import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, TYPE } from "../../tokens";
import { prog } from "../../lib/anim";
import { useStage } from "../layout/Stage";
import { Mark } from "../brand/Mark";
import { Emblem } from "./emblems";

export interface LegendFields {
  no: string;
  name: string;
  era: string;
  markets: string;
  edge: string;
  habit: string;
  read: string;
}

export interface LegendCardProps {
  legend: LegendFields;
  emblem?: string;
  /** Animate: emblem draws, then fields type on. false = finished card (stills, print). */
  animate?: boolean;
  /** Pixel width; default fits the stage. The card is 750×1050 (2.5×3.5 in at 300 dpi). */
  width?: number;
  back?: boolean;
}

const TW = 750, TH = 1050;

const typed = (s: string, p: number) => s.slice(0, Math.round(s.length * p));

/** The collectible Legend Card, matching brand/assets/cards. Abstract emblem only (compliance rule 5). */
export const LegendCard: React.FC<LegendCardProps> = ({ legend, emblem = "pivot-step", animate = true, width, back = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { w, h } = useStage();
  const k = (width ?? Math.min(w, (h * TW) / TH)) / TW;
  const at = (s: number, d: number) => (animate ? prog(frame, fps, s, d, "draw") : 1);
  const em = at(0.3, 1.1);
  const nameP = at(1.2, 0.4);
  const fields: [string, string][] = [
    ["Markets", legend.markets],
    ["Edge", legend.edge],
    ["Habit", legend.habit],
    ["Key read", legend.read],
  ];
  const frame0 = {
    position: "absolute" as const,
    left: (w - TW * k) / 2,
    top: (h - TH * k) / 2,
    width: TW * k,
    height: TH * k,
  };
  if (back) {
    return (
      <div style={{ ...frame0, borderRadius: 34 * k, background: C.abyss, overflow: "hidden" }}>
        {Array.from({ length: 13 }).map((_, r) => (
          <div key={r} style={{ position: "absolute", left: 0, right: 0, top: (r * 86 + 40) * k, height: 2 * k, background: C.blueline, opacity: 0.5 }} />
        ))}
        <div style={{ position: "absolute", inset: 22 * k, border: `${3 * k}px solid ${C.sodium}`, borderRadius: 22 * k }} />
        <div style={{ position: "absolute", left: TW * k / 2 - 190 * k, top: (TH / 2 - 40 - 190) * k, width: 380 * k, height: 380 * k, borderRadius: "50%", background: C.prussian, border: `${3 * k}px solid ${C.blueline}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Mark size={300 * k} sw={40} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: (TH - 230) * k, textAlign: "center", fontFamily: FONT.display, fontWeight: 900, fontSize: 64 * k, color: C.tape }}>THE TAPE LORE</div>
        <div style={{ position: "absolute", left: 0, right: 0, top: (TH - 150) * k, textAlign: "center", fontFamily: FONT.body, fontSize: 28 * k, color: C.mist }}>Council of Legends</div>
      </div>
    );
  }
  let fieldT = 1.5;
  return (
    <div style={{ ...frame0, borderRadius: 34 * k, background: C.prussian, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 22 * k, border: `${3 * k}px solid ${C.sodium}`, borderRadius: 22 * k }} />
      <div style={{ position: "absolute", left: 22 * k, top: 52 * k, width: (TW - 44) * k * at(0, 0.5), height: 46 * k, background: C.tape, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 28 * k, top: 0, height: 46 * k, display: "flex", alignItems: "center", fontFamily: FONT.mono, fontWeight: 600, fontSize: 15 * k, letterSpacing: TYPE.mono.tracking, color: C.prussian, whiteSpace: "pre" }}>
          {`LEGEND ${legend.no}   ${legend.era.toUpperCase()}`}
        </div>
      </div>
      <div style={{ position: "absolute", left: TW * k / 2 - 150 * k, top: 150 * k, width: 300 * k, height: 300 * k, borderRadius: "50%", background: C.abyss, border: `${3 * k}px solid ${C.blueline}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 28 * k, borderRadius: "50%", border: `${2 * k}px dotted ${C.blueline}` }} />
        <Emblem kind={emblem} size={230 * k} draw={em} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 474 * k, textAlign: "center", fontFamily: FONT.display, fontWeight: 900, fontSize: 78 * k, lineHeight: 1, color: C.tape, opacity: nameP, whiteSpace: "nowrap" }}>{legend.name.toUpperCase()}</div>
      <div style={{ position: "absolute", left: 62 * k, right: 62 * k, top: 580 * k }}>
        {fields.map(([lab, val]) => {
          const s = fieldT;
          fieldT += 0.45;
          const p = at(s, 0.5);
          return (
            <div key={lab} style={{ marginBottom: 24 * k, opacity: animate ? Math.min(1, p * 4) : 1 }}>
              <div style={{ fontFamily: FONT.mono, fontWeight: 600, fontSize: 15 * k, color: C.sodium }}>{lab}</div>
              <div style={{ marginTop: 6 * k, fontFamily: FONT.body, fontSize: 27 * k, lineHeight: 1.25, color: C.tape }}>{typed(val, p)}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 62 * k, top: (TH - 68) * k, fontFamily: FONT.mono, fontSize: 12 * k, letterSpacing: "0.1em", color: C.mist, whiteSpace: "pre" }}>THE TAPE LORE   COUNCIL OF LEGENDS</div>
      <div style={{ position: "absolute", right: 58 * k, top: (TH - 120) * k }}>
        <Mark size={78 * k} sw={44} />
      </div>
    </div>
  );
};
