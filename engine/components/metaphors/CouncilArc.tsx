import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, hexA } from "../../tokens";
import { prog } from "../../lib/anim";
import { RichText } from "../captions/CaptionCard";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";
import { Emblem } from "./emblems";

export interface CouncilSeat {
  id: string;
  name: string;
  emblem?: string;
  /** Paraphrased, sourced answer (≤ 14 words). */
  answer?: string;
}

export interface CouncilArcProps {
  question: string;
  seats: CouncilSeat[];
  /** Index of the seat speaking, or -1 for none. With `cycle`, seats light in turn. */
  active?: number;
  /** Seconds per seat when cycling through all of them. */
  cycle?: number | null;
  /** Show every seat's answer at once as a compact grid (the "agree/split" beats). */
  showAll?: boolean;
  /** Seat ids that agree (lit Tape) vs split (Mist) for the agree/split beats. */
  group?: string[] | null;
}

/**
 * Legends seated in an arc around one question. Seats are abstract emblem medallions (never likenesses);
 * the question sits at the centre on a Sodium diamond; the speaking seat lights up and its answer appears.
 */
export const CouncilArc: React.FC<CouncilArcProps> = ({ question, seats, active = -1, cycle = null, showAll = false, group = null }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const t = frame / fps;
  const act = cycle ? Math.min(seats.length - 1, Math.floor(t / cycle)) : active;
  const n = seats.length;
  const R = Math.min(w * 0.42, h * 0.42);
  const cx = w / 2, cy = h * 0.52;
  const med = Math.min(140 * u, (Math.PI * R) / (n + 0.6));
  const qIn = prog(frame, fps, 0, 0.4);
  const answerTop = cy + 90 * u;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <path d={`M${cx - R},${cy} A${R},${R} 0 0 1 ${cx + R},${cy}`} fill="none" stroke={hexA(C.blueline, 0.7)} strokeWidth={2 * u} strokeDasharray={`${4 * u} ${10 * u}`} />
        <path d={`M${cx},${cy - 36 * u} L${cx + 36 * u},${cy} L${cx},${cy + 36 * u} L${cx - 36 * u},${cy} Z`} fill={C.sodium} opacity={qIn} />
      </svg>
      {seats.map((s, i) => {
        const a = Math.PI + ((i + 0.5) / n) * Math.PI;
        const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
        const appear = prog(frame, fps, 0.2 + i * 0.12, 0.35);
        const lit = showAll ? (group ? group.includes(s.id) : true) : i === act;
        return (
          <div key={s.id} style={{ position: "absolute", left: x - med / 2, top: y - med / 2, width: med, opacity: appear * (lit ? 1 : 0.45), textAlign: "center" }}>
            <div style={{ width: med, height: med, borderRadius: "50%", background: C.abyss, border: `${(lit ? 4 : 2) * u}px solid ${lit ? C.tape : C.blueline}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Emblem kind={s.emblem} size={med * 0.62} accent={false} />
            </div>
            <div style={{ marginTop: 10 * u, fontFamily: FONT.mono, fontSize: SIZE.tape * u * 0.8, color: lit ? C.tape : C.mist, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap", transform: "translateX(-50%)", marginLeft: "50%" }}>{s.name}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 0, width: w, top: cy - 36 * u - 20 * u - SIZE.h2 * u * 2, height: SIZE.h2 * u * 2, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div style={{ maxWidth: R * 1.5, textAlign: "center", fontFamily: FONT.display, fontWeight: 900, fontSize: SIZE.h2 * u * 0.82, lineHeight: 1, color: C.tape, opacity: qIn, textWrap: "balance" }}>{question}</div>
      </div>
      {!showAll && act >= 0 && seats[act]?.answer ? (
        <div style={{ position: "absolute", left: w * 0.06, width: w * 0.88, top: answerTop, textAlign: "center", opacity: prog(frame, fps, cycle ? act * cycle + 0.15 : 0.15, 0.3) }}>
          <div style={{ fontFamily: FONT.mono, fontSize: SIZE.tape * u, color: C.mist, letterSpacing: "0.14em", textTransform: "uppercase" }}>{seats[act].name} · paraphrased</div>
          <div style={{ marginTop: 14 * u, fontFamily: FONT.body, fontSize: SIZE.caption * u * 0.85, color: C.tape, lineHeight: 1.2, textWrap: "balance" }}>
            <RichText text={seats[act].answer!} />
          </div>
        </div>
      ) : null}
    </div>
  );
};
