// Demo specs, one per format, so every format composition can be previewed and QA'd in the Studio.
// They are NOT episodes: lore_no 0, tape label "DEMO", simulated data only. Never publish them.
import { Episode, Spec } from "../lib/spec";
import simDemo from "./sim-demo.json";

const base = (format: string, pillar: string, beats: Spec["beats"], extra: Partial<Spec> = {}): Episode => {
  const dur = beats.reduce((m, b) => Math.max(m, b.t + b.dur), 0);
  return {
    spec: {
      id: `DEMO-${format}`, lore_no: 0, slug: `demo-${format}`, pillar, format, concept_key: `demo.${format}`,
      title: `Demo: ${format}`, hook: "", takeaway: "", duration_s: dur, aspects: ["4x5", "9x16"], beats,
      sources: [], status: "planned", tape: { label: `DEMO ${format}` },
      next: { lore_no: 0, title: "the next entry's title" },
      thumb: { lines: ["Demo", `[[${format}]]`, "format"] },
      ...extra,
    },
  };
};

const withSim = (e: Episode): Episode => ({ ...e, sim: simDemo as unknown as Record<string, unknown> });

export const SAMPLES: Record<string, Episode> = {
  anatomy: base("anatomy", "setups", [
    { t: 0, dur: 3.2, kind: "hook", component: "Anatomy", props: { demo: true, revealSpeed: 30 }, caption: "Each pullback smaller than the last?" },
    { t: 3.2, dur: 4, kind: "build", component: "Anatomy", props: { demo: true, revealSpeed: 30, revealAt: 0 }, caption: "Contractions measured from the data.", transition: "cut" },
    { t: 7.2, dur: 3.4, kind: "rule", props: { text: "Tight, then [[the break]]." }, caption: "One rule, stated once." },
    { t: 10.6, dur: 3.6, kind: "end", caption: "Every entry ends with the snap." },
  ], { simulation: { script: "demo", seed: 7 } }),
  council: base("council", "legends", [
    { t: 0, dur: 4, kind: "question", component: "CouncilArc", props: { question: "Where does your stop go?", seats: [{ id: "a", name: "Seat A", emblem: "pivot-step", answer: "Demo: a sourced paraphrase." }, { id: "b", name: "Seat B", emblem: "cup-handle", answer: "Demo: another view." }, { id: "c", name: "Seat C", emblem: "vcp" }, { id: "d", name: "Seat D", emblem: "shield" }], cycle: 2 }, caption: "Four seats. One question." },
    { t: 4, dur: 3.5, kind: "agree", component: "CouncilArc", props: { question: "Where does your stop go?", seats: [{ id: "a", name: "Seat A", emblem: "pivot-step" }, { id: "b", name: "Seat B", emblem: "cup-handle" }, { id: "c", name: "Seat C", emblem: "vcp" }, { id: "d", name: "Seat D", emblem: "shield" }], showAll: true, group: ["a", "b"] }, caption: "Where they agree lights up." },
    { t: 7.5, dur: 3.6, kind: "end", caption: "Sources in every description." },
  ]),
  whatif: withSim(base("whatif", "risk", [
    { t: 0, dur: 3.4, kind: "question", component: "RTower", props: { winRate: 0.35, avgWinR: 3, n: 16, dur: 2.6 }, caption: "Can 35% winners come out ahead?" },
    { t: 3.4, dur: 4.4, kind: "assumptions", props: { items: simDemo.meta.assumptions }, caption: "Assumptions first, always on screen." },
    { t: 7.8, dur: 4.2, kind: "runs", component: "RunsFan", props: { simKey: "runs_2pct", label: "RISK 2% PER TRADE", dur: 3 }, caption: "Every run drawn. Median and worst 5% marked." },
    { t: 12.0, dur: 4.0, kind: "distribution", component: "Distribution", props: { simKey: "maxdd_2pct", label: "MAX DRAWDOWN" }, caption: "The bad tail is never hidden." },
    { t: 16.0, dur: 3.6, kind: "end", caption: "Simulated, and labelled so." },
  ], { simulation: { script: "sims/risk_per_trade.py", seed: 7 } })),
  replay: base("replay", "setups", [
    { t: 0, dur: 5, kind: "reveal", component: "CandleChart", props: { demo: true, domain: "visible", revealDur: 4.4, revealTo: 63, ma: [10, 21], volume: true }, caption: "Bars arrive in order. No hindsight." },
    { t: 5, dur: 4.6, kind: "poll", props: { question: "What would you do here?", options: ["Act on the break", "Wait for proof", "Pass"] }, caption: "Vote. The reveal is the next entry." },
    { t: 9.6, dur: 3.4, kind: "end", caption: "Reveal posts tomorrow." },
  ]),
  failure: base("failure", "setups", [
    { t: 0, dur: 4, kind: "looks_perfect", component: "Anatomy", props: { demo: true, revealSpeed: 30, pivot: null }, caption: "It looked textbook. Then it broke." },
    { t: 4, dur: 4.2, kind: "the_rule", props: { label: "The rule that saved you", text: "The stop was set [[before]] the entry." }, caption: "The stop decided the damage, not hope." },
    { t: 8.2, dur: 3.4, kind: "end", caption: "Failures teach the most." },
  ]),
  lexicon: base("lexicon", "risk", [
    { t: 0, dur: 4.2, kind: "term", props: { term: "Expectancy", kind: "noun", definition: "Average result **per trade**, wins and losses included." }, caption: "One term. Fifteen seconds." },
    { t: 4.2, dur: 4.4, kind: "picture", component: "RTower", props: { winRate: 0.4, avgWinR: 2.5, n: 14, dur: 3 }, caption: "Losses small, wins large: positive expectancy." },
    { t: 8.6, dur: 3.4, kind: "end", caption: "Saved for later? It's numbered." },
  ]),
  desknotes: base("desknotes", "operator", [
    { t: 0, dur: 4, kind: "the_line", props: { text: "I used to move my stop. [[Once.]]", label: "Desk notes" }, component: "QuoteCard", caption: "A founder's note, first person." },
    { t: 4, dur: 4.2, kind: "the_change", component: "InnerChart", props: { dur: 3.4 }, caption: "What changed: the rule came first." },
    { t: 8.2, dur: 3.4, kind: "end", caption: "No trades. No numbers. Lessons." },
  ]),
  legendcard: base("legendcard", "legends", [
    { t: 0, dur: 5.2, kind: "emblem", component: "LegendCard", props: { legend: { no: "00", name: "Sample Legend", era: "1900s – 1950", markets: "Stocks", edge: "Demo field. Real cards are researched.", habit: "Demo field.", read: "Demo field." }, emblem: "diamond" }, caption: "The card draws itself, field by field." },
    { t: 5.2, dur: 3.4, kind: "end", caption: "Collect the council." },
  ]),
  chapter: base("chapter", "risk", [
    { t: 0, dur: 4, kind: "chapter", props: { kicker: "Chapter 1", title: "The math of [[losses]]", sub: "Lore 001 · Lore 002 · Lore 003" }, caption: "Long-form chapters stitch a cluster." },
    { t: 4, dur: 5, kind: "build", component: "ThePit", props: { lossPct: 0.5, account: 10000, showBedrock: true }, caption: "Same components, landscape frame." },
    { t: 9, dur: 3.6, kind: "end", caption: "Each chapter links back to its Lore." },
  ], { aspects: ["16x9"] }),
};
