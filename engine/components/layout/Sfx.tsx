import React from "react";
import { Audio, Sequence, staticFile, useVideoConfig } from "remotion";

export const SFX = ["snap", "tick", "whoosh", "tape-in", "tape-out", "dig", "rise", "click"] as const;
export type SfxName = (typeof SFX)[number];

/** A generated sound cue (scripts/sound/gen_cues.py -> engine/public/sfx). `at` in seconds from the parent sequence. */
export const Sfx: React.FC<{ name?: string | null; at?: number; volume?: number }> = ({ name, at = 0, volume = 1 }) => {
  const { fps } = useVideoConfig();
  if (!name || !(SFX as readonly string[]).includes(name)) return null;
  return (
    <Sequence from={Math.max(0, Math.round(at * fps))} layout="none" name={`sfx ${name}`}>
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
    </Sequence>
  );
};
