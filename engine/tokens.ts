// Every colour, size, ease and layout number comes from brand/tokens.json. Never hard-code brand values elsewhere.
import raw from "../brand/tokens.json";

export const tokens = raw;
export const C = raw.color;
export const CHART = raw.chart;
export const TYPE = raw.type;
export const MOTION = raw.motion;
export const LAYOUT = raw.layout;
export const MARK = raw.mark;
export const FPS = raw.motion.fps;

export const FONT = {
  display: `'${raw.type.display.family}', 'Arial Narrow', sans-serif`,
  mono: `'${raw.type.mono.family}', ui-monospace, monospace`,
  body: `'${raw.type.body.family}', Arial, sans-serif`,
};

/** Type sizes at 1080 wide. Multiply by layout unit `u`. */
export const SIZE = raw.type.scale_1080w;

export type Bezier = [number, number, number, number];
export const EASE = raw.motion.ease as unknown as Record<"standard" | "snap" | "draw", Bezier>;

/** Moving-average colours keyed by period. */
export const MA_COLOR: Record<string, string> = raw.chart.ma;

export const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};
