// Abstract legend emblems (compliance rule 5: no photos, likeness, voice or signature — geometry only).
// Each emblem is a tiny diagram of the idea a legend is known for, drawn in a 240-unit circle.
import React from "react";
import { C } from "../../tokens";

export const EMBLEMS = ["pivot-step", "cup-handle", "vcp", "box", "stages", "trend", "ladder", "shield", "wave", "diamond"] as const;
export type EmblemKind = (typeof EMBLEMS)[number];

const paths: Record<EmblemKind, { line: string; accent?: string }> = {
  // a long flat line, one decisive step through a pivotal point (brand/gen/templates.py livermore_emblem)
  "pivot-step": { line: "M10 160 H110 V80 H230", accent: "M110 58 L132 80 L110 102 L88 80 Z" },
  // a rounded cup, a small handle, the break
  "cup-handle": { line: "M14 70 C40 70 50 170 120 170 C180 170 186 74 196 74 L204 96 L214 84 L232 30", accent: "M184 74 H226" },
  // three shrinking pullbacks under a line
  vcp: { line: "M10 90 L50 180 L90 92 L118 150 L146 94 L164 122 L180 95 L230 20", accent: "M30 90 H226" },
  // stacked boxes stepping up
  box: { line: "M14 200 H70 V150 H14 Z M80 150 H136 V100 H80 Z M146 100 H202 V50 H146 Z", accent: "M146 50 L230 18" },
  // base, advance, top, decline
  stages: { line: "M10 170 C50 168 60 172 80 160 C110 130 130 60 160 56 C180 54 190 66 200 90 C210 120 220 160 232 190", accent: "M10 190 H232" },
  // a rising staircase of higher highs and higher lows
  trend: { line: "M10 200 L60 140 L80 160 L130 100 L150 120 L200 60 L230 40", accent: "M10 214 L230 54" },
  // equal rungs: sizing
  ladder: { line: "M60 20 V220 M180 20 V220 M60 60 H180 M60 110 H180 M60 160 H180 M60 210 H180", accent: "M60 60 H180" },
  // defence first
  shield: { line: "M120 20 L210 56 C210 140 170 196 120 222 C70 196 30 140 30 56 Z", accent: "M120 70 V170" },
  // waves of accumulation and distribution
  wave: { line: "M10 130 C40 80 70 80 100 130 S160 180 190 130 S220 90 232 100", accent: "M10 60 H232" },
  diamond: { line: "M120 30 L210 120 L120 210 L30 120 Z", accent: "M120 96 L144 120 L120 144 L96 120 Z" },
};

export const Emblem: React.FC<{ kind?: string; size: number; draw?: number; accent?: boolean; color?: string }> = ({ kind = "diamond", size, draw = 1, accent = true, color = C.tape }) => {
  const k = (EMBLEMS as readonly string[]).includes(kind) ? (kind as EmblemKind) : "diamond";
  const p = paths[k];
  const len = 1400;
  const accentIsFill = p.accent?.trim().endsWith("Z");
  return (
    <svg width={size} height={size} viewBox="0 0 240 240">
      <path d={p.line} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
      {accent && p.accent ? (
        <path
          d={p.accent}
          fill={accentIsFill ? C.sodium : "none"}
          stroke={accentIsFill ? "none" : C.sodium}
          strokeWidth={8}
          strokeLinecap="round"
          opacity={Math.max(0, Math.min(1, draw * 3 - 2))}
        />
      ) : null}
    </svg>
  );
};
