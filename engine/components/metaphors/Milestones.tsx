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
 * A career as a timeline: a year axis that draws itself, milestones lighting one by one (the newest in Tape with its
 * label, earlier ones dimmed to Mist), labels alternating above and below the axis so they never collide.
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
  for (let d = Math.ceil(years[0] / 10) * 10; d <= years[1]; d += 10) decades.push(d);
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
          <text x={X(d)} y={axisY + 36 * u} fill={hexA(C.mist, 0.8)} fontFamily={FONT.mono} fontSize={fs * 0.85} textAnchor="middle">
            {d}
          </text>
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
        const stem = up ? 120 : 120;
        const ly = up ? axisY - stem * u : axisY + stem * u + 22 * u;
        return (
          <g key={i} opacity={clamp(a) * (isNew ? 1 : 0.75)}>
            <line x1={x} x2={x} y1={axisY} y2={up ? ly + 14 * u : ly - SIZE.label * u * 1.05} stroke={hexA(color, 0.6)} strokeWidth={2 * u} />
            <circle cx={x} cy={axisY} r={(isNew ? 13 : 9) * u} fill={isNew ? C.tape : C.abyss} stroke={color} strokeWidth={3 * u} />
            <text x={x} y={ly - (it.sub ? 34 : 0) * u} fill={color} fontFamily={FONT.display} fontWeight={800} fontSize={SIZE.label * u * 1.15} textAnchor={anchor}>
              {`${it.year} · ${it.label}`}
            </text>
            {it.sub ? (
              <text x={x} y={ly} fill={hexA(color, 0.9)} fontFamily={FONT.body} fontSize={fs * 1.05} textAnchor={anchor}>
                {it.sub}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
};
