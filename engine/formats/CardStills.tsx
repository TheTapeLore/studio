// Legend Card files (spec.card) and Instagram carousel slides (spec.carousel) as Remotion stills.
//   <id>-card-front / -card-back      750x1050  (2.5 x 3.5 in at 300 dpi, digital: rounded corners on Abyss)
//   <id>-print-front / -print-back    825x1125  (trim + 0.125 in bleed each side, square corners, bleed = card colour)
//   <id>-slide-<n>                    1080x1350 (carousel, 4x5)
import React from "react";
import { Sequence } from "remotion";
import { C, FONT, SIZE } from "../tokens";
import { Episode, PILLAR_NAMES, loreLabel } from "../lib/spec";
import { EpisodeContext } from "../lib/useEpisode";
import { Paper, TapeStrip } from "../components/brand";
import { LayoutContext, computeLayout } from "../components/layout/layout";
import { Headline } from "../components/layout/Headline";
import { Stage } from "../components/layout/Stage";
import { COMPONENTS } from "../components/registry";
import { LegendCard, LegendFields } from "../components/metaphors/LegendCard";

export interface CardSpec { legend: LegendFields; emblem?: string }
export interface SlideSpec { headline?: string; sub?: string; component?: string; props?: Record<string, unknown> }

const cardOf = (ep: Episode) => (ep.spec as unknown as { card?: CardSpec }).card;
export const slidesOf = (ep: Episode) => ((ep.spec as unknown as { carousel?: SlideSpec[] }).carousel ?? []);

/** Every animation finished: a Still is one frame, so run the clock forward. */
const Finished: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Sequence from={-600} layout="none">
    {children}
  </Sequence>
);

export const CardFace: React.FC<{ episode: Episode; back?: boolean; print?: boolean }> = ({ episode, back = false, print = false }) => {
  const card = cardOf(episode);
  const W = print ? 825 : 750, H = print ? 1125 : 1050;
  const L = computeLayout(W, H);
  const bleed = print ? 37.5 : 0;
  const bg = print ? (back ? C.abyss : C.prussian) : C.abyss;
  if (!card) return null;
  return (
    <EpisodeContext.Provider value={episode}>
      <LayoutContext.Provider value={L}>
        <div style={{ position: "absolute", inset: 0, background: bg }}>
          <Finished>
            <Stage rect={{ x: bleed, y: bleed, w: 750, h: 1050 }}>
              <LegendCard legend={card.legend} emblem={card.emblem} animate={false} width={750} back={back} print={print} />
            </Stage>
          </Finished>
        </div>
      </LayoutContext.Provider>
    </EpisodeContext.Provider>
  );
};

export const CarouselSlide: React.FC<{ episode: Episode; index: number }> = ({ episode, index }) => {
  const s = episode.spec;
  const slide = slidesOf(episode)[index];
  const W = 1080, H = 1350;
  const L = computeLayout(W, H);
  const card = cardOf(episode);
  if (!slide) return null;
  const isCard = slide.component === "LegendCard" && card;
  const Comp = slide.component && !isCard ? COMPONENTS[slide.component] : null;
  const headH = slide.headline ? 300 : 0;
  const top = L.stage.y;
  const bottom = H - L.safe.bottom - (slide.sub ? 150 : 40);
  return (
    <EpisodeContext.Provider value={episode}>
      <LayoutContext.Provider value={L}>
        <Paper>
          <TapeStrip text={`${loreLabel(s.lore_no)}   ${(PILLAR_NAMES[s.pillar] ?? s.pillar).toUpperCase()}`} inAt={null} right={`${index + 1}/${slidesOf(episode).length}`} />
          <Finished>
            {slide.headline && !slide.component ? (
              // a type-only slide: the line is the visual, centred, with its source line under it
              <div style={{ position: "absolute", left: L.stage.x, top, width: L.stage.w, height: bottom - top, display: "flex", flexDirection: "column", justifyContent: "center", gap: 44 }}>
                <div style={{ height: 6, width: 160, background: C.blueline }} />
                <Headline text={slide.headline} size={SIZE.hero * 1.05} />
                {slide.sub ? <div style={{ fontFamily: FONT.body, fontSize: SIZE.caption * 0.88, lineHeight: 1.3, color: C.tape, textWrap: "pretty" }}>{slide.sub}</div> : null}
              </div>
            ) : slide.headline ? (
              <div style={{ position: "absolute", left: L.stage.x, top, width: L.stage.w }}>
                <Headline text={slide.headline} size={SIZE.h1 * 0.92} />
              </div>
            ) : null}
            {isCard ? (
              <Stage rect={{ x: L.stage.x, y: top + headH, w: L.stage.w, h: bottom - top - headH }}>
                <LegendCard legend={card!.legend} emblem={card!.emblem} animate={false} />
              </Stage>
            ) : Comp ? (
              <Stage rect={{ x: L.stage.x, y: top + headH, w: L.stage.w, h: bottom - top - headH }}>
                <Comp {...(slide.props ?? {})} />
              </Stage>
            ) : null}
          </Finished>
          {slide.sub && slide.component ? (
            <div style={{ position: "absolute", left: L.stage.x, width: L.stage.w, top: H - L.safe.bottom - 130, fontFamily: FONT.body, fontSize: SIZE.caption * 0.78, lineHeight: 1.25, color: C.tape }}>
              {slide.sub}
            </div>
          ) : null}
        </Paper>
      </LayoutContext.Provider>
    </EpisodeContext.Provider>
  );
};
