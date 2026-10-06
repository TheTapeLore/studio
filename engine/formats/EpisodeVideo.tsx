// One renderer for every format: the spec's beats, in order, inside the brand frame.
import React from "react";
import { Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { MOTION, SIZE } from "../tokens";
import { prog } from "../lib/anim";
import { Beat, Episode, PILLAR_NAMES, loreLabel } from "../lib/spec";
import { EpisodeContext } from "../lib/useEpisode";
import { CornerBug, Paper, TapeStrip } from "../components/brand";
import { CaptionTrack } from "../components/captions";
import { Headline } from "../components/layout/Headline";
import { useLayout } from "../components/layout/layout";
import { Sfx } from "../components/layout/Sfx";
import { Stage } from "../components/layout/Stage";
import { COMPONENTS } from "../components/registry";
import { FormatDef } from "./formats";

/** Visual used when a beat names no component. */
const DEFAULT_BY_KIND: Record<string, string> = {
  end: "EndCard",
  poll: "PollCard",
  freeze: "PollCard",
  rule: "RuleCard",
  the_rule: "RuleCard",
  the_line: "QuoteCard",
  misconception: "MythCard",
  term: "TermCard",
  quote: "QuoteCard",
  assumptions: "AssumptionsPanel",
  title: "TitleCard",
  chapter: "TitleCard",
};

/**
 * TapeStrip text. The optional episode label is dropped when it would run into the right-hand compliance label
 * (Martian Mono 600 + 0.18em tracking advances ~0.88em per character).
 */
export const tapeText = (ep: Episode, maxChars = Infinity, rightChars = 0) => {
  const s = ep.spec;
  const parts = [loreLabel(s.lore_no), (PILLAR_NAMES[s.pillar] ?? s.pillar).toUpperCase()];
  const withLabel = s.tape?.label ? [...parts, s.tape.label.toUpperCase()].join("   ") : null;
  const room = maxChars - (rightChars ? rightChars + 4 : 0);
  return withLabel && withLabel.length <= room ? withLabel : parts.join("   ");
};

const BeatView: React.FC<{ beat: Beat; prev?: Beat; next?: Beat; durS: number }> = ({ beat, prev, next, durS }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const name = beat.component ?? DEFAULT_BY_KIND[beat.kind] ?? null;
  const Comp = name ? COMPONENTS[name] : null;
  const cutIn = beat.transition === "cut" && prev;
  const cutOut = next?.transition === "cut";
  const fin = cutIn ? 1 : prog(frame, fps, 0, 0.25);
  // the last beat holds its final frame (the end card stays readable under the tape roll-out)
  const fout = cutOut || !next ? 0 : prog(frame, fps, durS - 0.2, 0.2);
  const headH = beat.headline ? L.u * 190 : 0;
  const stage = { ...L.stage, y: L.stage.y + headH, h: L.stage.h - headH };
  return (
    <div style={{ position: "absolute", inset: 0, opacity: fin * (1 - fout) }}>
      {beat.headline ? (
        <div style={{ position: "absolute", left: L.stage.x, top: L.stage.y, width: L.stage.w, height: headH - 20 * L.u, display: "flex", alignItems: "flex-start" }}>
          <Headline text={beat.headline} />
        </div>
      ) : null}
      {Comp ? (
        <Stage rect={stage}>
          <Comp {...(beat.props ?? {})} />
        </Stage>
      ) : null}
      <Sfx name={beat.sfx} at={beat.sfx_at ?? 0} />
    </div>
  );
};

/**
 * Renders an episode from its spec: paper + grid, TapeStrip in/out with its sound, beats as sequences,
 * captions timed by the caption rules, the corner bug (hidden while the end card shows the mark).
 */
export const EpisodeVideo: React.FC<{ episode: Episode; format: FormatDef }> = ({ episode, format }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const s = episode.spec;
  const total = durationInFrames / fps;
  const beats = s.beats;
  const endBeat = beats.find((b) => b.kind === "end");
  const outAt = total - MOTION.tapeStripOut_s - 0.05;
  const L = useLayout();
  const right = format.tapeRight?.(episode) ?? null;
  const maxChars = Math.floor((L.W - L.tape.h * 0.6 - Math.max(L.tape.h * 0.6, L.safe.right)) / (SIZE.tape * L.u * 0.88));
  return (
    <EpisodeContext.Provider value={episode}>
      <Paper>
        {beats.map((b, i) => {
          const from = Math.round(b.t * fps);
          const d = Math.max(1, Math.round(b.dur * fps));
          return (
            <Sequence key={i} from={from} durationInFrames={d} name={`${i + 1} ${b.kind}${b.component ? ` · ${b.component}` : ""}`}>
              <BeatView beat={b} prev={beats[i - 1]} next={beats[i + 1]} durS={d / fps} />
            </Sequence>
          );
        })}
        <TapeStrip text={tapeText(episode, maxChars, right?.length ?? 0)} inAt={0} outAt={outAt} right={right} />
        <Sfx name="tape-in" at={0} volume={0.8} />
        <Sfx name="tape-out" at={outAt} volume={0.8} />
        <CaptionTrack beats={beats} />
        <CornerBug inAt={0.6} outAt={endBeat ? endBeat.t : null} />
      </Paper>
    </EpisodeContext.Provider>
  );
};
