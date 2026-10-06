import React from "react";
import { Composition, Folder, Still } from "remotion";
import { loadBrandFonts } from "./fonts";
import { FPS } from "./tokens";
import { EPISODES } from "./episodes";
import { Aspect, Episode } from "./lib/spec";
import { Gallery, galleryFrames } from "./gallery/Gallery";
import { GALLERY } from "./gallery/entries";
import { Cover, FORMAT_COMPONENTS, Thumbnail } from "./formats";
import { SAMPLES } from "./samples";
import { Lockup, Paper, TapeStrip } from "./components/brand";
import { Sfx } from "./components/layout/Sfx";

loadBrandFonts();

export const SIZES: Record<Aspect, { width: number; height: number }> = {
  "4x5": { width: 1080, height: 1350 },
  "9x16": { width: 1080, height: 1920 },
  "16x9": { width: 1920, height: 1080 },
};

const SEGMENTS = GALLERY.map((e) => ({ component: e.component, name: e.name, secs: e.secs ?? 4 }));

const frames = (ep: Episode) => Math.max(1, Math.round(ep.spec.duration_s * FPS));

/** 2-second delivery smoke test clip. */
const Smoke: React.FC = () => (
  <Paper>
    <TapeStrip text="SMOKE TEST   DELIVERY CHECK" />
    <Sfx name="tape-in" />
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Lockup height={180} drawAt={0.3} />
    </div>
  </Paper>
);

const episodeComps = (ep: Episode, idPrefix: string) => {
  const Comp = FORMAT_COMPONENTS[ep.spec.format] ?? FORMAT_COMPONENTS.anatomy;
  return (
    <>
      {ep.spec.aspects.map((a) => (
        <Composition key={a} id={`${idPrefix}-${a}`} component={Comp} defaultProps={{ episode: ep }} fps={FPS} durationInFrames={frames(ep)} {...SIZES[a]} />
      ))}
      <Still id={`${idPrefix}-thumb`} component={Thumbnail} defaultProps={{ episode: ep }} width={1280} height={720} />
      <Still id={`${idPrefix}-cover`} component={Cover} defaultProps={{ episode: ep }} width={1080} height={1920} />
    </>
  );
};

export const Root: React.FC = () => (
  <>
    <Folder name="episodes">
      {EPISODES.map((ep) => (
        <React.Fragment key={ep.spec.id}>{episodeComps(ep, ep.spec.id)}</React.Fragment>
      ))}
    </Folder>
    <Folder name="formats">
      {Object.entries(SAMPLES).map(([key, ep]) => (
        <React.Fragment key={key}>{episodeComps(ep, `fmt-${key}`)}</React.Fragment>
      ))}
    </Folder>
    <Folder name="qa">
      <Composition id="gallery" component={Gallery} defaultProps={{ guides: true, segments: SEGMENTS }} fps={FPS} durationInFrames={galleryFrames(FPS)} width={1080} height={1350} />
      <Composition id="gallery-9x16" component={Gallery} defaultProps={{ guides: true, segments: SEGMENTS }} fps={FPS} durationInFrames={galleryFrames(FPS)} width={1080} height={1920} />
      <Composition id="gallery-16x9" component={Gallery} defaultProps={{ guides: true, segments: SEGMENTS }} fps={FPS} durationInFrames={galleryFrames(FPS)} width={1920} height={1080} />
      <Composition id="smoke" component={Smoke} fps={FPS} durationInFrames={2 * FPS} width={1080} height={1350} />
    </Folder>
  </>
);
