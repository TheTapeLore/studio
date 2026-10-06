import React from "react";
import { Audio, staticFile } from "remotion";
import { Episode } from "../../lib/spec";

/**
 * The episode's music bed, composed from its own spec by scripts/sound/score.py (percent is pitch, depth is darkness,
 * the mark is the motif). Present only when episodes/<id>/score.json exists and the spec does not set `score: false`.
 * The WAV itself is generated at render time (render_batch.mjs) and never committed.
 */
export const Score: React.FC<{ episode: Episode }> = ({ episode }) => {
  const s = episode.spec;
  if (!episode.score || s.score === false) return null;
  const gainDb = (s.score && s.score.gain_db) ?? 0;
  return <Audio src={staticFile(`score/${s.id}.wav`)} volume={Math.pow(10, gainDb / 20)} />;
};
