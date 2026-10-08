import React from "react";
import { Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { useEpisode } from "../../lib/useEpisode";

export const SFX = ["snap", "tick", "whoosh", "tape-in", "tape-out", "dig", "rise", "click"] as const;
export type SfxName = (typeof SFX)[number];

/**
 * A generated sound cue (scripts/sound/gen_cues.py -> engine/public/sfx). `at` in seconds from the parent sequence.
 * Inside an episode with a score, the snap is the one score.py tuned to the song's key (score/<id>-snap.wav), so its
 * chime lands on the tonic with the music instead of against it.
 */
export const Sfx: React.FC<{ name?: string | null; at?: number; volume?: number }> = ({ name, at = 0, volume = 1 }) => {
  const { fps } = useVideoConfig();
  const ep = useEpisode();
  if (!name || !(SFX as readonly string[]).includes(name)) return null;
  const keyed = name === "snap" && ep?.score && ep.spec.score !== false;
  return (
    <Sequence from={Math.max(0, Math.round(at * fps))} layout="none" name={`sfx ${name}`}>
      <Audio src={staticFile(keyed ? `score/${ep!.spec.id}-snap.wav` : `sfx/${name}.wav`)} volume={volume} />
    </Sequence>
  );
};
