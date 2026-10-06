import React from "react";
import { AbsoluteFill } from "remotion";
import { C, CHART } from "../../tokens";
import { useLayout } from "../layout/layout";

/** The cyanotype drafting grid: 54px at 1080 wide, 16% Blueline. */
export const BlueprintGrid: React.FC<{ opacity?: number; step?: number }> = ({ opacity, step }) => {
  const { W, H, u } = useLayout();
  const s = (step ?? CHART.grid.step) * u;
  const lines: string[] = [];
  for (let x = 0; x <= W + 0.5; x += s) lines.push(`M${x.toFixed(1)} 0V${H}`);
  for (let y = 0; y <= H + 0.5; y += s) lines.push(`M0 ${y.toFixed(1)}H${W}`);
  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <path d={lines.join("")} stroke={CHART.grid.color} strokeWidth={Math.max(1, u)} opacity={opacity ?? CHART.grid.opacity} fill="none" />
      </svg>
    </AbsoluteFill>
  );
};

/** Prussian centre, Abyss edges — the blueprint paper. */
export const Paper: React.FC<{ children?: React.ReactNode; grid?: boolean }> = ({ children, grid = true }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 75% at 50% 45%, ${C.prussian} 0%, ${C.abyss} 100%)` }}>
    {grid ? <BlueprintGrid /> : null}
    {children}
  </AbsoluteFill>
);
