// One composition component per format in content/formats.yaml (+ chapter for YouTube long-form).
// Each is fully driven by the episode spec; the format only adds its chrome and rules.
import React from "react";
import { Episode } from "../lib/spec";
import { EpisodeVideo } from "./EpisodeVideo";
import { FORMATS } from "./formats";

export type FormatProps = { episode: Episode };

const make = (key: string): React.FC<FormatProps> => {
  const C: React.FC<FormatProps> = ({ episode }) => <EpisodeVideo episode={episode} format={FORMATS[key]} />;
  C.displayName = `${key}Format`;
  return C;
};

export const AnatomyFormat = make("anatomy");
export const CouncilFormat = make("council");
export const WhatIfFormat = make("whatif");
export const ReplayFormat = make("replay");
export const FailureFormat = make("failure");
export const LexiconFormat = make("lexicon");
export const DeskNotesFormat = make("desknotes");
export const LegendCardFormat = make("legendcard");
export const ChapterFormat = make("chapter");

export const FORMAT_COMPONENTS: Record<string, React.FC<FormatProps>> = {
  anatomy: AnatomyFormat,
  council: CouncilFormat,
  whatif: WhatIfFormat,
  replay: ReplayFormat,
  failure: FailureFormat,
  lexicon: LexiconFormat,
  desknotes: DeskNotesFormat,
  legendcard: LegendCardFormat,
  chapter: ChapterFormat,
};

export { FORMATS } from "./formats";
export { Thumbnail, Cover } from "./Stills";
