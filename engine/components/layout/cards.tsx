// Text-led beats: end card, rule, myth, poll, term, quote, big number, assumptions, stamps.
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, TYPE, hexA } from "../../tokens";
import { parseMarks, prog } from "../../lib/anim";
import { loreText } from "../../lib/spec";
import { useEpisode } from "../../lib/useEpisode";
import { Mark, markSnapFromVertices, markSnapSeconds } from "../brand/Mark";
import { RichText } from "../captions/CaptionCard";
import { useLayout } from "./layout";
import { Sfx } from "./Sfx";
import { useStage } from "./Stage";

const Marked: React.FC<{ text: string; hi?: string }> = ({ text, hi = C.sodium }) => (
  <>
    {parseMarks(text).map((m, i) => (
      <span key={i} style={m.hi ? { color: hi } : undefined}>
        {m.text}
      </span>
    ))}
  </>
);

export const MonoLabel: React.FC<{ children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties }> = ({ children, color = C.mist, size, style }) => {
  const { u } = useLayout();
  return (
    <div style={{ fontFamily: FONT.mono, fontWeight: 600, fontSize: size ?? SIZE.tape * u, letterSpacing: TYPE.mono.tracking, textTransform: "uppercase", color, ...style }}>
      {children}
    </div>
  );
};

/**
 * The ending every Lore shares: the mark draws, breaks the wire, the wire snaps (with the snap sound),
 * then "Lore N. Next: Lore N+1 — <title>".
 */
export const EndCard: React.FC<{ lore_no?: number; next?: { lore_no: number; title: string } | null; sfx?: boolean; drawAt?: number; vertexAt?: number[] | null }> = ({
  lore_no,
  next,
  sfx = true,
  drawAt: drawAtProp,
  vertexAt: vertexAtProp = null,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const ep = useEpisode();
  const n = lore_no ?? ep?.spec.lore_no ?? 0;
  const nx = next ?? ep?.spec.next ?? null;
  // The mark draws on the sonic logo's notes: the spec may fix the timing, otherwise the score publishes it at the
  // song's tempo (score.json end_card), so the wire snaps on the logo's breakout note. Without a score: a plain draw.
  const auto = vertexAtProp ? null : ep?.score?.end_card ?? null;
  const vertexAt = vertexAtProp ?? auto?.vertexAt ?? null;
  const drawAt = drawAtProp ?? auto?.drawAt ?? 0.15;
  const snapS = vertexAt ? drawAt + markSnapFromVertices(vertexAt) : markSnapSeconds(drawAt, 1.0);
  const t1 = prog(frame, fps, snapS + 0.15, 0.35);
  const t2 = prog(frame, fps, snapS + 0.45, 0.4);
  const size = Math.min(w * 0.5, h * 0.48);
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <Mark size={size} drawAt={drawAt} drawDur={1.0} vertexAt={vertexAt} />
      {sfx ? <Sfx name="snap" at={snapS} /> : null}
      <div style={{ marginTop: 26 * u, opacity: t1, fontFamily: FONT.display, fontWeight: 900, fontSize: SIZE.h1 * u, color: C.tape, lineHeight: 1 }}>{loreText(n)}</div>
      {nx ? (
        <div style={{ marginTop: 22 * u, opacity: t2, textAlign: "center", maxWidth: w * 0.92 }}>
          <MonoLabel style={{ marginBottom: 12 * u }}>Next</MonoLabel>
          <div style={{ fontFamily: FONT.body, fontSize: SIZE.caption * u * 0.92, color: C.tape, lineHeight: 1.2, textWrap: "balance" }}>
            {loreText(nx.lore_no)} — {nx.title}
          </div>
        </div>
      ) : null}
    </div>
  );
};

/** The rule, stated once, big. */
export const RuleCard: React.FC<{ label?: string; text: string; sub?: string }> = ({ label = "The rule", text, sub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w } = useStage();
  const p = prog(frame, fps, 0.05, 0.4);
  const line = prog(frame, fps, 0.0, 0.5, "draw");
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: `0 ${8 * u}px` }}>
      <MonoLabel>{label}</MonoLabel>
      <div style={{ height: 3 * u, width: w * 0.3 * line, background: C.blueline, margin: `${20 * u}px 0 ${30 * u}px` }} />
      <div style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: SIZE.h1 * u, lineHeight: 0.98, color: C.tape, opacity: p, transform: `translateY(${(1 - p) * 20 * u}px)`, textWrap: "balance" }}>
        <Marked text={text} />
      </div>
      {sub ? (
        <div style={{ marginTop: 30 * u, fontFamily: FONT.body, fontSize: SIZE.caption * u * 0.8, color: C.mist, opacity: prog(frame, fps, 0.6, 0.4) }}>
          <RichText text={sub} />
        </div>
      ) : null}
    </div>
  );
};

/** Myth, struck through, then the computed fact. */
export const MythCard: React.FC<{ myth: string; fact: string; factAt?: number }> = ({ myth, fact, factAt = 1.6 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const p0 = prog(frame, fps, 0, 0.35);
  const strike = prog(frame, fps, factAt - 0.5, 0.4, "draw");
  const p1 = prog(frame, fps, factAt, 0.4);
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 46 * u }}>
      <div style={{ opacity: p0 }}>
        <MonoLabel color={C.ember}>Myth</MonoLabel>
        <div style={{ marginTop: 16 * u, fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.h2 * u, lineHeight: 1.08, color: hexA(C.tape, 1 - 0.45 * strike) }}>
          {/* the strike follows every wrapped line (background on an inline span, cloned per line box) */}
          <span
            style={{
              backgroundImage: `linear-gradient(${C.ember}, ${C.ember})`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "0 56%",
              backgroundSize: `${strike * 100}% ${6 * u}px`,
              WebkitBoxDecorationBreak: "clone",
              boxDecorationBreak: "clone",
            }}
          >
            {myth}
          </span>
        </div>
      </div>
      <div style={{ opacity: p1, transform: `translateY(${(1 - p1) * 16 * u}px)` }}>
        <MonoLabel color={C.lichen}>Math</MonoLabel>
        <div style={{ marginTop: 16 * u, fontFamily: FONT.display, fontWeight: 900, fontSize: SIZE.h2 * u * 1.05, lineHeight: 1.02, color: C.tape, textWrap: "balance" }}>
          <Marked text={fact} />
        </div>
      </div>
    </div>
  );
};

/** Freeze-frame poll (Model Book Replay). Options are neutral; the reveal is a separate Lore. */
export const PollCard: React.FC<{ question?: string; options?: string[] }> = ({ question, options }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const ep = useEpisode();
  const q = question ?? ep?.spec.poll?.question ?? "What would you do here?";
  const opts = options ?? ep?.spec.poll?.options ?? ["Act", "Wait"];
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 22 * u }}>
      <MonoLabel>Your call · no hindsight</MonoLabel>
      <div style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: SIZE.h2 * u, color: C.tape, lineHeight: 1, marginBottom: 16 * u, opacity: prog(frame, fps, 0, 0.3) }}>{q}</div>
      {opts.map((o, i) => {
        const p = prog(frame, fps, 0.3 + i * 0.18, 0.3);
        return (
          <div key={i} style={{ opacity: p, transform: `translateX(${(1 - p) * 24 * u}px)`, display: "flex", alignItems: "center", gap: 22 * u, border: `${2 * u}px solid ${C.blueline}`, borderRadius: 14 * u, padding: `${20 * u}px ${26 * u}px`, background: hexA(C.abyss, 0.6) }}>
            <div style={{ fontFamily: FONT.mono, fontWeight: 600, fontSize: SIZE.label * u, color: C.mist }}>{String.fromCharCode(65 + i)}</div>
            <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: SIZE.caption * u * 0.85, color: C.tape }}>{o}</div>
          </div>
        );
      })}
    </div>
  );
};

/** Lexicon: the term, its plain one-line definition. */
export const TermCard: React.FC<{ term: string; kind?: string; definition?: string; defAt?: number }> = ({ term, kind = "noun", definition, defAt = 0.8 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w } = useStage();
  const p = prog(frame, fps, 0, 0.4);
  const d = prog(frame, fps, defAt, 0.4);
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <MonoLabel>Lexicon · {kind}</MonoLabel>
      <div style={{ marginTop: 18 * u, fontFamily: FONT.display, fontWeight: 900, fontSize: Math.min(SIZE.hero * u * 1.2, w / Math.max(4, term.length * 0.5)), lineHeight: 0.92, color: C.sodium, opacity: p, transform: `translateY(${(1 - p) * 20 * u}px)` }}>{term}</div>
      {definition ? (
        <div style={{ marginTop: 34 * u, fontFamily: FONT.body, fontSize: SIZE.caption * u, lineHeight: 1.22, color: C.tape, opacity: d, maxWidth: w * 0.95 }}>
          <RichText text={definition} />
        </div>
      ) : null}
    </div>
  );
};

/** A paraphrase or a sourced quote. `verbatim: true` only when the exact words are in a cited source. */
export const QuoteCard: React.FC<{ text: string; who?: string; verbatim?: boolean; label?: string }> = ({ text, who, verbatim = false, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const p = prog(frame, fps, 0, 0.45);
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <MonoLabel>{label ?? (verbatim ? "In their words" : "Paraphrased")}</MonoLabel>
      <div style={{ marginTop: 24 * u, fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.h2 * u, lineHeight: 1.04, color: C.tape, opacity: p, textWrap: "balance" }}>
        {verbatim ? "“" : ""}
        <Marked text={text} />
        {verbatim ? "”" : ""}
      </div>
      {who ? <div style={{ marginTop: 28 * u, fontFamily: FONT.body, fontWeight: 700, fontSize: SIZE.label * u * 1.2, color: C.mist, opacity: prog(frame, fps, 0.4, 0.4) }}>— {who}</div> : null}
    </div>
  );
};

/** One number that matters, counting up from `from`. */
export const StatCard: React.FC<{ value: number; from?: number; prefix?: string; suffix?: string; digits?: number; label?: string; color?: "sodium" | "tape" | "ember" | "lichen"; countDur?: number }> = ({
  value,
  from = 0,
  prefix = "",
  suffix = "",
  digits = 0,
  label,
  color = "sodium",
  countDur = 1.0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const p = prog(frame, fps, 0.1, countDur, "draw");
  const v = from + (value - from) * p;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: SIZE.hero * u * 1.6, lineHeight: 0.9, color: C[color], fontVariantNumeric: "tabular-nums" }}>
        {prefix}
        {v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}
        {suffix}
      </div>
      {label ? <div style={{ marginTop: 26 * u, fontFamily: FONT.body, fontSize: SIZE.caption * u * 0.8, color: C.mist, textAlign: "center" }}>{label}</div> : null}
    </div>
  );
};

/** Simulation assumptions, on screen (compliance rule 8). */
export const AssumptionsPanel: React.FC<{ items: string[]; title?: string }> = ({ items, title = "Assumptions" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <MonoLabel>{title}</MonoLabel>
      <div style={{ marginTop: 26 * u, borderTop: `${2 * u}px solid ${C.blueline}` }}>
        {items.map((it, i) => {
          const p = prog(frame, fps, 0.2 + i * 0.25, 0.3);
          return (
            <div key={i} style={{ opacity: p, display: "flex", gap: 22 * u, padding: `${20 * u}px 0`, borderBottom: `${1 * u}px solid ${hexA(C.blueline, 0.6)}` }}>
              <div style={{ fontFamily: FONT.mono, fontSize: SIZE.label * u * 0.8, color: C.mist, paddingTop: 8 * u }}>{String(i + 1).padStart(2, "0")}</div>
              <div style={{ fontFamily: FONT.body, fontSize: SIZE.caption * u * 0.78, color: C.tape, lineHeight: 1.2, textWrap: "pretty" }}>
                <RichText text={it} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Small mono badge pinned to a corner of the stage, e.g. "SIMULATED · SEED 7" or "FAILURE FILE". */
export const Badge: React.FC<{ text: string; color?: string; corner?: "tl" | "tr" | "bl" | "br" }> = ({ text, color = C.mist, corner = "tr" }) => {
  const { u } = useLayout();
  const pos: React.CSSProperties = {
    tl: { left: 0, top: 0 },
    tr: { right: 0, top: 0 },
    bl: { left: 0, bottom: 0 },
    br: { right: 0, bottom: 0 },
  }[corner];
  return (
    <div style={{ position: "absolute", ...pos, border: `${2 * u}px solid ${color}`, borderRadius: 8 * u, padding: `${6 * u}px ${12 * u}px`, background: hexA(C.abyss, 0.7) }}>
      <MonoLabel color={color} size={SIZE.tape * u * 0.85}>
        {text}
      </MonoLabel>
    </div>
  );
};

/** Title card for chapters and desk notes. */
export const TitleCard: React.FC<{ kicker?: string; title: string; sub?: string }> = ({ kicker, title, sub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      {kicker ? <MonoLabel>{kicker}</MonoLabel> : null}
      <div style={{ marginTop: 18 * u, fontFamily: FONT.display, fontWeight: 900, fontSize: SIZE.h1 * u, lineHeight: 0.96, color: C.tape, opacity: prog(frame, fps, 0, 0.4), textWrap: "balance" }}>
        <Marked text={title} />
      </div>
      {sub ? <div style={{ marginTop: 28 * u, fontFamily: FONT.body, fontSize: SIZE.caption * u * 0.85, color: C.mist, opacity: prog(frame, fps, 0.4, 0.4) }}>{sub}</div> : null}
    </div>
  );
};

/**
 * A short numbered list revealed item by item (a legend's rules, the reasons behind a claim). Each item is a full,
 * plain sentence; `sub` lines say where it comes from. The newest item's number is the frame's one Sodium.
 * `at` = seconds each item appears (default: every `step` s from `start`), so items can land with their captions.
 */
export const ListCard: React.FC<{ label?: string; items: { text: string; sub?: string }[]; at?: number[]; start?: number; step?: number }> = ({
  label,
  items,
  at,
  start = 0.3,
  step = 1.2,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const t = frame / fps;
  const times = items.map((_, i) => at?.[i] ?? start + i * step);
  const newest = times.reduce((k, s, i) => (t >= s ? i : k), -1);
  const n = items.length;
  const fs = SIZE.caption * u * (n > 3 ? 0.74 : 0.82);
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      {label ? <MonoLabel>{label}</MonoLabel> : null}
      <div style={{ marginTop: 22 * u, borderTop: `${2 * u}px solid ${C.blueline}` }}>
        {items.map((it, i) => {
          const p = prog(frame, fps, times[i], 0.35);
          return (
            <div key={i} style={{ opacity: 0.12 + 0.88 * p, display: "flex", gap: 24 * u, padding: `${(n > 3 ? 16 : 22) * u}px 0`, borderBottom: `${1 * u}px solid ${hexA(C.blueline, 0.6)}` }}>
              <div style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: fs * 1.25, lineHeight: 1, width: fs * 1.1, color: i === newest ? C.sodium : C.mist }}>{i + 1}</div>
              <div style={{ flex: 1, transform: `translateX(${(1 - p) * 18 * u}px)` }}>
                <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: fs, color: C.tape, lineHeight: 1.18, textWrap: "pretty" }}>
                  <RichText text={it.text} />
                </div>
                {it.sub ? <div style={{ marginTop: 6 * u, fontFamily: FONT.body, fontSize: fs * 0.62, color: C.mist, lineHeight: 1.25 }}>{it.sub}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
