import React from "react";
import { Sequence, useVideoConfig } from "remotion";
import { Beat } from "../../lib/spec";
import { CaptionCard } from "./CaptionCard";
import { captionCues } from "./timing";

/** All caption cards of an episode, timed from its beats. */
export const CaptionTrack: React.FC<{ beats: Beat[] }> = ({ beats }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {captionCues(beats).map((c, i) => (
        <Sequence key={i} from={Math.round(c.start * fps)} durationInFrames={Math.max(1, Math.round(c.dur * fps))} layout="none" name={`caption ${i}`}>
          <CaptionCard text={c.text} dur={c.dur} />
        </Sequence>
      ))}
    </>
  );
};
