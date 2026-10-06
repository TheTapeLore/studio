// Types for episodes/<id>/spec.json — the single source of truth for a video (see CLAUDE.md).
export type Aspect = "4x5" | "9x16" | "16x9";

export type BeatKind =
  | "hook" | "build" | "rule" | "misconception" | "end" | "question" | "poll" | "term" | "definition"
  | "quote" | "story" | "assumptions" | "runs" | "distribution" | "lesson" | "reveal" | "freeze"
  | "tells" | "breaks" | "seats" | "agree" | "split" | "choice" | "emblem" | "fields" | "title" | "chapter"
  | string;

export interface Beat {
  t: number;
  dur: number;
  kind: BeatKind;
  component?: string | null;
  props?: Record<string, unknown>;
  /** One caption card for the whole beat. */
  caption?: string | null;
  /** Several caption cards, split across the beat in proportion to their word counts. */
  captions?: string[];
  /** Big display line at the top of the stage. Wrap one phrase in [[...]] to set it in Sodium. */
  headline?: string | null;
  sfx?: string | null;
  /** Seconds into the beat at which the sfx fires (default 0). */
  sfx_at?: number;
  /** "cut" keeps the visual continuous with the previous beat (same component, no fade). */
  transition?: "fade" | "cut";
}

export interface Source { title: string; url: string; used_for: string }

export interface Spec {
  id: string;
  lore_no: number;
  slug: string;
  batch?: string;
  pillar: string;
  cluster?: string;
  format: string;
  concept_key: string;
  title: string;
  hook: string;
  takeaway: string;
  question?: string | null;
  legends?: string[];
  duration_s: number;
  aspects: Aspect[];
  beats: Beat[];
  data?: { symbol: string; start: string; end: string; source?: string; interval?: string; benchmark?: string } | null;
  simulation?: { script: string; seed: number; params?: Record<string, unknown> } | null;
  sources: Source[];
  links?: { prerequisites?: string[]; next?: string[] };
  next?: { lore_no: number; title: string } | null;
  new_angle?: string;
  tape?: { label?: string };
  thumb?: StillSpec;
  cover?: StillSpec;
  poll?: { question: string; options: string[] };
  /** false = no music bed. Otherwise scripts/sound/score.py composes one from this spec (see episodes/<id>/score.json). */
  score?: false | { gain_db?: number };
  status: string;
}

export interface StillSpec {
  /** Headline lines. Wrap one phrase in [[...]] to set it in Sodium. */
  lines: string[];
  sub?: string;
  component?: string;
  props?: Record<string, unknown>;
}

export interface Bar { t: string; o: number; h: number; l: number; c: number; v: number }
export interface BarsData { symbol: string; interval: string; source?: string; bars: Bar[]; benchmark?: { symbol: string; bars: Bar[] } }

export interface ScoreSheet { id: string; bpm: number; key: string; lufs: number; cues: { t: number; cue: string }[] }
export interface Episode { spec: Spec; data?: BarsData | null; sim?: Record<string, unknown> | null; score?: ScoreSheet | null }

export const PILLAR_NAMES: Record<string, string> = {
  conditions: "Market conditions",
  selection: "Selection",
  setups: "Setups",
  risk: "Risk & sizing",
  exits: "Exits",
  leverage: "Leverage",
  operator: "The Operator",
  legends: "Legends",
};

export const loreLabel = (n: number) => `LORE ${String(n).padStart(3, "0")}`;
export const loreText = (n: number) => `Lore ${String(n).padStart(3, "0")}`;
