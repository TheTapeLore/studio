// Format chrome and rules, mirroring content/formats.yaml. The beats themselves always come from the spec.
import { Episode } from "../lib/spec";

export interface FormatDef {
  key: string;
  label: string;
  /** Allowed duration in seconds (content/formats.yaml). */
  duration: [number, number];
  /** Right-hand label on the TapeStrip (compliance labels live here so they stay on screen). */
  tapeRight?: (ep: Episode) => string | null;
}

const simLabel = (ep: Episode) => (ep.spec.simulation ? `SIMULATED · SEED ${ep.spec.simulation.seed}` : null);

export const FORMATS: Record<string, FormatDef> = {
  anatomy: { key: "anatomy", label: "Anatomy", duration: [35, 70], tapeRight: simLabel },
  council: { key: "council", label: "The Council", duration: [45, 75], tapeRight: () => "PARAPHRASED" },
  whatif: { key: "whatif", label: "What If Lab", duration: [40, 75], tapeRight: (ep) => simLabel(ep) ?? "SIMULATED" },
  replay: { key: "replay", label: "Model Book Replay", duration: [30, 60], tapeRight: () => "NO HINDSIGHT" },
  failure: { key: "failure", label: "Failure Files", duration: [35, 60], tapeRight: () => "FAILURE FILE" },
  lexicon: { key: "lexicon", label: "Lexicon", duration: [12, 20], tapeRight: () => "LEXICON" },
  desknotes: { key: "desknotes", label: "Desk Notes", duration: [20, 45], tapeRight: () => "DESK NOTES" },
  legendcard: { key: "legendcard", label: "Legend Card", duration: [15, 25], tapeRight: () => "COUNCIL OF LEGENDS" },
  chapter: { key: "chapter", label: "Chapter", duration: [480, 900], tapeRight: () => "CHAPTER" },
};

export const formatOf = (key: string) => FORMATS[key] ?? FORMATS.anatomy;
