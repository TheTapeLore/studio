import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { C } from "../tokens";
import { CornerBug, Paper, TapeStrip } from "../components/brand";
import { CaptionCard } from "../components/captions";
import { useLayout } from "../components/layout/layout";
import { Stage } from "../components/layout/Stage";
import { COMPONENTS } from "../components/registry";
import { GALLERY } from "./entries";

export const GALLERY_SECS = 4;
export const galleryFrames = (fps: number) => GALLERY.reduce((s, e) => s + Math.round((e.secs ?? GALLERY_SECS) * fps), 0);

/** Dashed outlines of the safe zone, stage and caption band (QA only, never in an episode). */
export const SafeZoneOverlay: React.FC = () => {
  const L = useLayout();
  const box = (r: { x: number; y: number; w: number; h: number }, col: string) => (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, outline: `2px dashed ${col}`, opacity: 0.7 }} />
  );
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {box({ x: L.safe.left, y: L.safe.top, w: L.W - L.safe.left - L.safe.right, h: L.H - L.safe.top - L.safe.bottom }, C.ember)}
      {box(L.stage, C.lichen)}
      {box(L.caption, C.mist)}
    </AbsoluteFill>
  );
};

/** Every component in turn, inside the real frame (tape, stage, caption band, bug) with safe-zone guides. */
export const Gallery: React.FC<{ guides?: boolean; segments?: { component: string; name: string; secs: number }[] }> = ({ guides = true }) => {
  const { fps } = useVideoConfig();
  let from = 0;
  return (
    <Paper>
      {GALLERY.map((e, i) => {
        const d = Math.round((e.secs ?? GALLERY_SECS) * fps);
        const Comp = COMPONENTS[e.component];
        const node = (
          <Sequence key={i} from={from} durationInFrames={d} name={e.name}>
            <TapeStrip text={`GALLERY   ${String(i + 1).padStart(2, "0")}/${GALLERY.length}   ${e.name.toUpperCase()}`} inAt={null} />
            <Stage>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Comp {...e.props} />
              </div>
            </Stage>
            <CaptionCard text={`${e.component}: demo props, simulated data.`} dur={d / fps} />
          </Sequence>
        );
        from += d;
        return node;
      })}
      <CornerBug inAt={0} />
      {guides ? <SafeZoneOverlay /> : null}
    </Paper>
  );
};
