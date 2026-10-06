// Every component with demo props, for visual QA (the `gallery` compositions). Demo data is simulated.
import { simBars } from "../lib/finance";

export interface GalleryEntry { name: string; component: string; props: Record<string, unknown>; secs?: number; note?: string }

export const GALLERY: GalleryEntry[] = [
  { name: "Mark (draw + snap)", component: "Mark", props: { size: 520, drawAt: 0.2 } },
  { name: "Lockup", component: "Lockup", props: { height: 150, drawAt: 0.2 } },
  { name: "ThePit", component: "ThePit", props: { lossPct: 0.5, note: "Same distance. Twice the percentage." } },
  { name: "ThePit · bedrock + dollars", component: "ThePit", props: { lossPct: 0.5, account: 10000, showBedrock: true } },
  { name: "ThePit · sweep + table", component: "ThePit", props: { lossPct: 0.9, fromLossPct: 0.1, showTable: true, sweepDur: 3, enter: false } },
  { name: "PitCurve", component: "PitCurve", props: { lossPct: 0.75, fromLossPct: 0.1 } },
  { name: "RTower", component: "RTower", props: { winRate: 0.35, avgWinR: 3, n: 20, seed: 7 } },
  { name: "Seesaw", component: "Seesaw", props: { account: 10000, accountRiskPct: 0.01, stopDistance: [1, 2, 4], hold: 1.3 } },
  { name: "MarketWeather · tailwind", component: "MarketWeather", props: { regime: "tailwind", windStrength: 0.8, period: "SIMULATED" } },
  { name: "MarketWeather · storm", component: "MarketWeather", props: { regime: "storm", windStrength: 0.6, distributionDays: 6 } },
  { name: "TheRace", component: "TheRace", props: { dur: 3.5, window: "SIMULATED" } },
  { name: "Anatomy (synthetic VCP)", component: "Anatomy", props: { demo: true, revealSpeed: 22 }, secs: 5 },
  { name: "CandleChart + MAs + volume", component: "CandleChart", props: { bars: simBars(140, 5, 40, 0.003, 0.02), ma: [10, 21, 50], volume: true, revealDur: 3.5, measures: [{ from: 40, to: 70, fromPrice: "l", toPrice: "h" }], annotations: [{ at: 100, text: "Simulated", price: "h" }] }, secs: 5 },
  { name: "FiveExits", component: "FiveExits", props: { revealSpeed: 30 }, secs: 5 },
  { name: "Throttle", component: "Throttle", props: { leverage: 5, dur: 2.5 } },
  { name: "Hourglass", component: "Hourglass", props: { daysToExpiry: 60, iv: 0.3, dur: 3 } },
  { name: "Rope", component: "Rope", props: { dur: 3 } },
  { name: "PayoffDiagram · long call", component: "PayoffDiagram", props: {} },
  { name: "PayoffDiagram · short put", component: "PayoffDiagram", props: { legs: [{ type: "put", side: "short", strike: 100, premium: 3.2, iv: 0.3 }], underlyingRange: [70, 125] } },
  { name: "InnerChart", component: "InnerChart", props: { dur: 3 } },
  { name: "CouncilArc", component: "CouncilArc", props: { question: "Where does your stop go?", seats: [{ id: "a", name: "Seat A", emblem: "pivot-step", answer: "Demo answer: a paraphrase with a source." }, { id: "b", name: "Seat B", emblem: "cup-handle" }, { id: "c", name: "Seat C", emblem: "vcp" }, { id: "d", name: "Seat D", emblem: "stages" }, { id: "e", name: "Seat E", emblem: "shield" }], active: 0 } },
  { name: "LegendCard", component: "LegendCard", props: { legend: { no: "00", name: "Sample Legend", era: "1900s – 1950", markets: "Stocks", edge: "Demo field. Real cards are researched and sourced.", habit: "Demo field.", read: "Demo field." }, emblem: "diamond" } },
  { name: "RuleCard", component: "RuleCard", props: { text: "Keep the pit [[shallow]].", sub: "Small losses, short climbs." } },
  { name: "MythCard", component: "MythCard", props: { myth: "Down 50%? Up 50% gets it back.", fact: "Up 50% from $5,000 is [[$7,500]].", factAt: 1.4 } },
  { name: "PollCard", component: "PollCard", props: { question: "What would you do here?", options: ["Act on the break", "Wait for proof", "Pass"] } },
  { name: "TermCard", component: "TermCard", props: { term: "Expectancy", definition: "What you make or lose **per trade**, on average." } },
  { name: "QuoteCard", component: "QuoteCard", props: { text: "A paraphrase is labelled as one.", who: "Sample" } },
  { name: "StatCard", component: "StatCard", props: { value: 100, prefix: "+", suffix: "%", label: "to recover a 50% loss" } },
  { name: "AssumptionsPanel", component: "AssumptionsPanel", props: { items: ["1,000 runs, seed 7", "Each trade risks **1%**", "Wins pay 2R, losses cost 1R"] } },
  { name: "TitleCard", component: "TitleCard", props: { kicker: "Chapter 1", title: "The math of [[losses]]", sub: "Lore 001 · Lore 002 · Lore 003" } },
  { name: "EndCard", component: "EndCard", props: { lore_no: 1, next: { lore_no: 2, title: "35% winners can beat 60% winners" } } },
];
