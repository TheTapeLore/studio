import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, hexA } from "../../tokens";
import { clamp, prog, rng } from "../../lib/anim";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";

export interface MarketWeatherProps {
  regime?: "tailwind" | "headwind" | "storm" | "calm";
  /** 0..1, from breadth / trend strength. */
  windStrength?: number;
  /** Distribution days in the window (drawn as storm cells). */
  distributionDays?: number;
  windowDays?: number;
  label?: string;
  /** Historical period this describes (never a live forecast). */
  period?: string;
}

/**
 * Market conditions as weather. Wind lines cross the frame: direction = trend, speed and density = strength.
 * Distribution days gather as storm cells. A tailwind earns the Sodium arrow. Historical periods only.
 */
export const MarketWeather: React.FC<MarketWeatherProps> = ({ regime = "tailwind", windStrength = 0.7, distributionDays = 0, windowDays = 25, label, period }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const t = frame / fps;
  const dir = regime === "headwind" ? -1 : 1;
  const strength = regime === "calm" ? 0.15 : windStrength;
  const n = Math.round(10 + 34 * strength);
  const r = rng(11);
  const fieldTop = h * 0.12, fieldH = h * 0.56;
  const lines: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const y0 = fieldTop + r() * fieldH;
    const speed = (180 + 520 * strength) * (0.7 + 0.6 * r()) * u;
    const len = (60 + 220 * strength) * (0.6 + 0.8 * r()) * u;
    const phase = r() * (w + len);
    let x = ((phase + t * speed) % (w + len)) - len;
    if (dir < 0) x = w - x - len;
    const turb = regime === "storm" ? 26 * u : 4 * u;
    const pts: string[] = [];
    for (let k = 0; k <= 8; k++) {
      const xx = x + (len * k) / 8;
      const yy = y0 + Math.sin(xx / (70 * u) + i + t * (regime === "storm" ? 5 : 1.5)) * turb;
      pts.push(`${k ? "L" : "M"}${xx.toFixed(1)},${yy.toFixed(1)}`);
    }
    lines.push(<path key={i} d={pts.join("")} fill="none" stroke={regime === "storm" ? C.mist : C.tape} strokeWidth={(2 + 3 * r()) * u} strokeLinecap="round" opacity={0.25 + 0.5 * r()} />);
  }
  // storm cells
  const cells: React.ReactNode[] = [];
  const cw = Math.min(90 * u, (w - 40 * u) / Math.max(1, windowDays / 2));
  for (let i = 0; i < distributionDays; i++) {
    const a = prog(frame, fps, 0.3 + i * 0.18, 0.3);
    const cx = 30 * u + i * cw * 1.15 + cw / 2;
    const cy = h * 0.8;
    cells.push(
      <g key={i} opacity={a} transform={`translate(${cx},${cy}) scale(${0.7 + 0.3 * a})`}>
        <circle cx={-cw * 0.18} cy={0} r={cw * 0.24} fill={hexA(C.ember, 0.85)} />
        <circle cx={cw * 0.12} cy={-cw * 0.08} r={cw * 0.3} fill={hexA(C.ember, 0.85)} />
        <rect x={-cw * 0.42} y={0} width={cw * 0.84} height={cw * 0.22} rx={cw * 0.11} fill={hexA(C.ember, 0.85)} />
      </g>,
    );
  }
  const arrowIn = prog(frame, fps, 0.2, 0.6, "draw");
  const ax = w * 0.5, ay = h * 0.4, al = Math.min(w * 0.36, 360 * u) * arrowIn;
  const title = label ?? { tailwind: "Tailwind", headwind: "Headwind", storm: "Storm", calm: "Calm" }[regime];
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "hidden" }}>
      {lines}
      <g>
        {regime === "tailwind" ? (
          <g stroke={C.sodium} strokeWidth={16 * u} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d={`M${ax - al / 2},${ay} L${ax + al / 2},${ay}`} />
            {arrowIn > 0.6 ? <path d={`M${ax + al / 2 - 40 * u},${ay - 40 * u} L${ax + al / 2},${ay} L${ax + al / 2 - 40 * u},${ay + 40 * u}`} /> : null}
          </g>
        ) : regime === "headwind" ? (
          <g stroke={C.mist} strokeWidth={14 * u} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d={`M${ax + al / 2},${ay} L${ax - al / 2},${ay}`} />
            {arrowIn > 0.6 ? <path d={`M${ax - al / 2 + 40 * u},${ay - 40 * u} L${ax - al / 2},${ay} L${ax - al / 2 + 40 * u},${ay + 40 * u}`} /> : null}
          </g>
        ) : null}
      </g>
      <text x={0} y={SIZE.h2 * u * 0.82} fill={C.tape} fontFamily={FONT.display} fontWeight={900} fontSize={SIZE.h2 * u}>
        {title}
      </text>
      <text x={w} y={36 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={SIZE.tape * u} textAnchor="end">
        {`WIND ${Math.round(clamp(strength) * 100)}%${period ? `  ·  ${period}` : ""}`}
      </text>
      {distributionDays > 0 ? (
        <>
          {cells}
          <text x={0} y={h * 0.8 + cw * 0.9} fill={C.mist} fontFamily={FONT.mono} fontSize={SIZE.tape * u}>
            {`${distributionDays} DISTRIBUTION DAYS IN ${windowDays} SESSIONS`}
          </text>
        </>
      ) : null}
    </svg>
  );
};
