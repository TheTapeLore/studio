import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, TYPE, hexA } from "../../tokens";
import { clamp, prog } from "../../lib/anim";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";

export interface Milestone {
  year: number;
  /** Two short lines max: what happened, in plain words. */
  label: string;
  sub?: string;
  /** Seconds at which this milestone lights (with its caption). */
  at: number;
}

export interface MilestonesProps {
  items: Milestone[];
  years?: [number, number];
  title?: string;
}

/**
 * A career as a timeline: a year axis that draws itself, milestones lighting one by one. The newest shows its label in
 * Tape; earlier ones step back to a dimmed dot and year, alternating above and below the axis so nothing collides.
 */
export const Milestones: React.FC<MilestonesProps> = ({ items, years = [1955, 1990], title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const t = frame / fps;
  const fs = SIZE.tape * u;
  const axisY = h * 0.52;
  const x0 = 30 * u, x1 = w - 30 * u;
  const X = (yr: number) => x0 + ((x1 - x0) * (yr - years[0])) / (years[1] - years[0]);
  const draw = prog(frame, fps, 0, 0.8, "draw");
  const newest = items.reduce((k, it, i) => (t >= it.at ? i : k), -1);
  const decades: number[] = [];
  const step = years[1] - years[0] > 20 ? 10 : 2;
  for (let d = Math.ceil(years[0] / step) * step; d <= years[1]; d += step) decades.push(d);
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {title ? (
        <text x={0} y={30 * u} fill={C.mist} fontFamily={FONT.mono} fontWeight={600} fontSize={fs} letterSpacing={TYPE.mono.tracking}>
          {title}
        </text>
      ) : null}
      <line x1={x0} x2={x0 + (x1 - x0) * draw} y1={axisY} y2={axisY} stroke={C.blueline} strokeWidth={4 * u} />
      {decades.map((d) => (
        <g key={d} opacity={draw}>
          <line x1={X(d)} x2={X(d)} y1={axisY - 8 * u} y2={axisY + 8 * u} stroke={C.mist} strokeWidth={2 * u} />
          {items.some((it) => it.year === d && t >= it.at) ? null : (
            <text x={X(d)} y={axisY + 36 * u} fill={hexA(C.mist, 0.8)} fontFamily={FONT.mono} fontSize={fs * 0.85} textAnchor="middle">
              {d}
            </text>
          )}
        </g>
      ))}
      {items.map((it, i) => {
        const a = prog(frame, fps, it.at, 0.4);
        if (a <= 0) return null;
        const up = i % 2 === 0;
        const x = X(it.year);
        const isNew = i === newest;
        const color = isNew ? C.tape : C.mist;
        const anchor = x > x1 - 160 * u ? "end" : x < x0 + 160 * u ? "start" : "middle";
        const stem = 120;
        const ly = up ? axisY - stem * u : axisY + stem * u + 22 * u;
        if (!isNew) {
          // earlier milestones step back to a dot and their year, so labels never pile up
          return (
            <g key={i} opacity={clamp(a) * 0.75}>
              <circle cx={x} cy={axisY} r={9 * u} fill={C.abyss} stroke={C.mist} strokeWidth={3 * u} />
              <text x={x} y={up ? axisY - 24 * u : axisY + 40 * u} fill={C.mist} fontFamily={FONT.mono} fontWeight={600} fontSize={fs} textAnchor="middle">
                {it.year}
              </text>
            </g>
          );
        }
        return (
          <g key={i} opacity={clamp(a)}>
            <line x1={x} x2={x} y1={axisY} y2={up ? ly + 14 * u : ly - SIZE.label * u * 1.05 - (it.sub ? 34 : 0) * u} stroke={hexA(color, 0.6)} strokeWidth={2 * u} />
            <circle cx={x} cy={axisY} r={13 * u} fill={C.tape} stroke={color} strokeWidth={3 * u} />
            <text x={x} y={up ? ly - (it.sub ? 34 : 0) * u : ly} fill={color} fontFamily={FONT.display} fontWeight={800} fontSize={SIZE.label * u * 1.15} textAnchor={anchor}>
              {`${it.year} · ${it.label}`}
            </text>
            {it.sub ? (
              <text x={x} y={up ? ly : ly + 40 * u} fill={hexA(color, 0.9)} fontFamily={FONT.body} fontSize={fs * 1.05} textAnchor={anchor}>
                {it.sub}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
};
