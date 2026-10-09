import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, TYPE, hexA } from "../../tokens";
import { clamp, prog } from "../../lib/anim";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";

export interface FortuneEvent {
  year: number;
  label: string;
  kind: "win" | "loss" | "note";
}

export interface FortuneLineProps {
  /** [year, level 0..1] keyframes: a sketch of the fortune, labelled as one (no data behind the heights). */
  path?: [number, number][];
  events?: FortuneEvent[];
  years?: [number, number];
  /** The line is already drawn up to `from` at frame 0 and draws on to `to` between `at` and `at + dur` (s). */
  reveal?: { from: number; to: number; at?: number; dur?: number };
  /** Event kinds whose labels show once the line reaches them. */
  show?: FortuneEvent["kind"][];
  /** Events (by year) whose labels appear at a set second, emphasised: the beat's story points. */
  focus?: { year: number; at: number }[];
  note?: string;
}

const lerpPath = (path: [number, number][], yr: number) => {
  if (yr <= path[0][0]) return path[0][1];
  for (let i = 1; i < path.length; i++) {
    if (yr <= path[i][0]) {
      const [a, va] = path[i - 1], [b, vb] = path[i];
      return va + ((vb - va) * (yr - a)) / Math.max(1e-6, b - a);
    }
  }
  return path[path.length - 1][1];
};

/**
 * A legend's career as one line: up for the big wins (Lichen), down for the losses (Ember), milestones in Tape.
 * Drawn across several beats with `reveal` (transition "cut"), so the record and the mistakes read as one story.
 * Heights are a sketch, labelled "not to scale"; only the years and the labelled events are facts (sourced in spec).
 */
export const FortuneLine: React.FC<FortuneLineProps> = ({
  path = [[1891, 0.01], [1906, 0.08], [1907, 0.4], [1908, 0.06], [1915, 0.0], [1929, 0.95], [1934, 0.0], [1940, 0.02]],
  events = [],
  years = [1888, 1942],
  reveal = { from: 1891, to: 1940, at: 0.2, dur: 4 },
  show = ["win", "loss", "note"],
  focus = [],
  note = "SKETCH OF HIS FORTUNE · NOT TO SCALE",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const t = frame / fps;
  const yrNow = reveal.from + (reveal.to - reveal.from) * clamp((t - (reveal.at ?? 0.2)) / Math.max(0.01, reveal.dur ?? 4));
  const fs = SIZE.tape * u;
  const LANE = 40 * u;
  const plot = { x: 10 * u, y: 120 * u, w: w - 20 * u, h: h - 120 * u - 90 * u - 3 * LANE };
  const X = (yr: number) => plot.x + (plot.w * (yr - years[0])) / (years[1] - years[0]);
  const Y = (v: number) => plot.y + plot.h * (1 - v);
  const start = path[0][0];
  const pts: string[] = [];
  for (let yr = start; yr <= yrNow + 1e-6; yr += 0.1) pts.push(`${X(yr).toFixed(1)},${Y(lerpPath(path, yr)).toFixed(1)}`);
  pts.push(`${X(yrNow).toFixed(1)},${Y(lerpPath(path, yrNow)).toFixed(1)}`);
  const decades = [];
  for (let d = Math.ceil(years[0] / 10) * 10; d <= years[1]; d += 10) decades.push(d);
  const focusAt = new Map(focus.map((f) => [f.year, f.at]));
  const color = (k: FortuneEvent["kind"]) => (k === "win" ? C.lichen : k === "loss" ? C.ember : C.tape);
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <text x={0} y={34 * u} fill={C.mist} fontFamily={FONT.mono} fontWeight={600} fontSize={fs} letterSpacing={TYPE.mono.tracking}>
        {note}
      </text>
      {/* $0: broke */}
      <line x1={plot.x} x2={plot.x + plot.w} y1={Y(0)} y2={Y(0)} stroke={hexA(C.ember, 0.55)} strokeWidth={2 * u} strokeDasharray={`${10 * u} ${8 * u}`} />
      <text x={plot.x + plot.w} y={Y(0) - 12 * u} fill={hexA(C.ember, 0.9)} fontFamily={FONT.mono} fontSize={fs * 0.85} textAnchor="end">
        BROKE
      </text>
      {decades.map((d) => (
        <g key={d}>
          <line x1={X(d)} x2={X(d)} y1={Y(0) + 8 * u} y2={Y(0) + 20 * u} stroke={C.mist} strokeWidth={2 * u} />
          <text x={X(d)} y={Y(0) + 52 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs * 0.95} textAnchor="middle">
            {d}
          </text>
        </g>
      ))}
      <polyline points={pts.join(" ")} fill="none" stroke={C.tape} strokeWidth={7 * u} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={X(yrNow)} cy={Y(lerpPath(path, yrNow))} r={10 * u} fill={C.tape} />
      {(() => {
        // wins label above their peaks; losses and milestones go in lanes under the year axis (leader lines), each
        // label in the first lane where it does not overlap the one before it
        const laneEnd: number[] = [-Infinity, -Infinity, -Infinity];
        const visible = events.filter((e) => {
          if (e.year > yrNow + 1e-6) return false;
          return focusAt.has(e.year) || show.includes(e.kind);
        });
        return [...visible].sort((a, b) => a.year - b.year).map((e) => {
          const fAt = focusAt.get(e.year);
          const focused = fAt !== undefined;
          const a = focused ? prog(frame, fps, fAt!, 0.35) : 1;
          const ex = X(e.year), ey = Y(lerpPath(path, e.year));
          const big = focused ? 1.18 : 0.92;
          const text = `${e.year} · ${e.label}`;
          const tw = text.length * fs * big * 0.66;
          let anchor: "start" | "middle" | "end" = ex > plot.x + plot.w * 0.72 ? "end" : ex < plot.x + plot.w * 0.22 ? "start" : "middle";
          const left = (x: number) => (anchor === "end" ? x - tw : anchor === "middle" ? x - tw / 2 : x);
          if (e.kind === "win") {
            if (a <= 0) return null;
            return (
              <g key={e.year} opacity={a}>
                <circle cx={ex} cy={ey} r={(focused ? 13 : 9) * u} fill={color(e.kind)} stroke={C.abyss} strokeWidth={3 * u} />
                <text x={ex} y={ey - (focused ? 30 : 24) * u} fill={color(e.kind)} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * big} textAnchor={anchor} letterSpacing="0.04em">
                  {text}
                </text>
              </g>
            );
          }
          let lane = laneEnd.findIndex((end) => left(ex) > end + 16 * u);
          if (lane < 0) lane = laneEnd.indexOf(Math.min(...laneEnd));
          laneEnd[lane] = left(ex) + tw;
          if (a <= 0) return null;
          const ly = Y(0) + 60 * u + (lane + 1) * LANE;
          return (
            <g key={e.year} opacity={a}>
              <line x1={ex} x2={ex} y1={ey + 10 * u} y2={ly - fs * big} stroke={hexA(color(e.kind), 0.55)} strokeWidth={2 * u} />
              <circle cx={ex} cy={ey} r={(focused ? 13 : 9) * u} fill={color(e.kind)} stroke={C.abyss} strokeWidth={3 * u} />
              <text x={ex} y={ly} fill={color(e.kind)} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * big} textAnchor={anchor} letterSpacing="0.04em">
                {text}
              </text>
            </g>
          );
        });
      })()}
    </svg>
  );
};
