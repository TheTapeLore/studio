import { createContext, useContext } from "react";
import { Bar } from "../../lib/spec";
import { Rect } from "../layout/layout";

export interface ChartScale {
  bars: Bar[];
  /** View window [start, end) into bars. Bars before start are lookback for indicators only. */
  start: number;
  end: number;
  plot: Rect;
  vol: Rect | null;
  x: (i: number) => number;
  y: (price: number) => number;
  step: number;
  bodyW: number;
  /** Bars with index < reveal are visible (fractional = the newest bar is fading in). */
  reveal: number;
  /** Seconds (from the chart's sequence start) when bar i appears. */
  timeOfBar: (i: number) => number;
  u: number;
  w: number;
  h: number;
}

export const ChartContext = createContext<ChartScale | null>(null);
export const useChart = () => {
  const c = useContext(ChartContext);
  if (!c) throw new Error("Chart overlays must be children of <CandleChart>");
  return c;
};

/** Resolve a price reference on a bar: a number, or "h" | "l" | "c" | "o". */
export const priceAt = (bars: Bar[], i: number, at: number | "h" | "l" | "c" | "o" = "c") =>
  typeof at === "number" ? at : bars[Math.max(0, Math.min(bars.length - 1, i))][at];

/** Resolve a bar reference: index, or ISO date (first bar on/after it). */
export const barIndex = (bars: Bar[], ref: number | string | undefined, fallback: number) => {
  if (ref === undefined || ref === null) return fallback;
  if (typeof ref === "number") return ref < 0 ? bars.length + ref : ref;
  const k = bars.findIndex((b) => b.t >= ref);
  return k < 0 ? bars.length - 1 : k;
};
