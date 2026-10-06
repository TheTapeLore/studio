// Thumbnail (YouTube, 1280x720) and cover (Reels/Shorts, 1080x1920) as Remotion stills, from spec.thumb / spec.cover.
import React from "react";
import { Freeze } from "remotion";
import { C, FONT } from "../tokens";
import { parseMarks } from "../lib/anim";
import { Episode, StillSpec, PILLAR_NAMES, loreLabel } from "../lib/spec";
import { EpisodeContext } from "../lib/useEpisode";
import { Mark, Paper, TapeStrip } from "../components/brand";
import { LayoutContext, computeLayout } from "../components/layout/layout";
import { Stage } from "../components/layout/Stage";
import { COMPONENTS } from "../components/registry";

const Lines: React.FC<{ lines: string[]; size: number; upper?: boolean; gap?: number }> = ({ lines, size, upper, gap = 0.98 }) => (
  <div style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: size, lineHeight: gap, color: C.tape, textTransform: upper ? "uppercase" : undefined }}>
    {lines.map((l, i) => (
      <div key={i} style={{ whiteSpace: "nowrap" }}>
        {parseMarks(l).map((m, k) => (
          <span key={k} style={m.hi ? { color: C.sodium } : undefined}>
            {m.text}
          </span>
        ))}
      </div>
    ))}
  </div>
);

/** Render a visual in its finished state: every animation has run. */
const Finished: React.FC<{ spec?: StillSpec; rect: { x: number; y: number; w: number; h: number } }> = ({ spec, rect }) => {
  if (!spec?.component) return null;
  const Comp = COMPONENTS[spec.component];
  if (!Comp) return null;
  return (
    <Freeze frame={600}>
      <Stage rect={rect}>
        <Comp {...(spec.props ?? {})} />
      </Stage>
    </Freeze>
  );
};

const fallback = (ep: Episode): StillSpec => ({ lines: [ep.spec.title] });

export const Thumbnail: React.FC<{ episode: Episode }> = ({ episode }) => {
  const s = episode.spec;
  const t = s.thumb ?? fallback(episode);
  const W = 1280, H = 720;
  const L = computeLayout(W, H);
  return (
    <EpisodeContext.Provider value={episode}>
      <LayoutContext.Provider value={L}>
        <Paper>
          <TapeStrip text={`${loreLabel(s.lore_no)}   ${(PILLAR_NAMES[s.pillar] ?? s.pillar).toUpperCase()}`} inAt={null} rect={{ x: 0, y: 44, w: 620, h: 54 }} fontSize={19} />
          <div style={{ position: "absolute", left: 56, top: 140 }}>
            <Lines lines={t.lines} size={t.lines.length > 3 ? 92 : 112} upper gap={1.04} />
          </div>
          <Finished spec={t} rect={{ x: 700, y: 150, w: 540, h: 500 }} />
          <div style={{ position: "absolute", left: 1150, top: 30 }}>
            <Mark size={100} sw={44} />
          </div>
        </Paper>
      </LayoutContext.Provider>
    </EpisodeContext.Provider>
  );
};

export const Cover: React.FC<{ episode: Episode }> = ({ episode }) => {
  const s = episode.spec;
  const c = s.cover ?? s.thumb ?? fallback(episode);
  const W = 1080, H = 1920;
  const L = computeLayout(W, H);
  // The profile grid shows the centre 1080x1440 (y 240..1680): everything important lives there.
  return (
    <EpisodeContext.Provider value={episode}>
      <LayoutContext.Provider value={L}>
        <Paper>
          <TapeStrip text={`${loreLabel(s.lore_no)}   ${(PILLAR_NAMES[s.pillar] ?? s.pillar).toUpperCase()}`} inAt={null} rect={{ x: 0, y: 300, w: W, h: 64 }} />
          <div style={{ position: "absolute", left: 72, top: 440 }}>
            <Lines lines={c.lines} size={140} />
          </div>
          <Finished spec={c} rect={{ x: 90, y: 1000, w: 900, h: 640 }} />
          {c.sub ? (
            <div style={{ position: "absolute", left: 72, right: 72, top: 1650, textAlign: "center", fontFamily: FONT.body, fontSize: 40, color: C.mist }}>{c.sub}</div>
          ) : null}
        </Paper>
      </LayoutContext.Provider>
    </EpisodeContext.Provider>
  );
};
