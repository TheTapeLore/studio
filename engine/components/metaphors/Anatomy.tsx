import React from "react";
import { vcpBars } from "../../lib/finance";
import { Bar } from "../../lib/spec";
import { useEpisode } from "../../lib/useEpisode";
import { CandleChart } from "../charts/CandleChart";
import { AnnotationSpec } from "../charts/Annotation";
import { MeasureSpec } from "../charts/PercentMeasure";

export interface AnatomyProps {
  bars?: Bar[];
  from?: number | string;
  to?: number | string;
  /** Labels that appear as their bar forms. */
  annotations?: AnnotationSpec[];
  /** Pullbacks to measure, as [highBar, lowBar] pairs. Each gets its % depth computed from the data. */
  contractions?: [number | string, number | string][];
  /** The pivot: Sodium tripwire that snaps on the breakout bar. */
  pivot?: { price: number; from?: number | string; snapAt?: number | string | "auto"; label?: string } | null;
  /** Bars per second. */
  revealSpeed?: number;
  revealAt?: number;
  volume?: boolean;
  ma?: number[];
  /** Use the built-in synthetic VCP (labelled simulated by the format). */
  demo?: boolean;
}

/**
 * Setups metaphor "Anatomy": a pattern built bar by bar, each structural part labelled as it forms,
 * contractions measured in %, volume drying up, and the pivot tripwire snapping on the breakout.
 */
export const Anatomy: React.FC<AnatomyProps> = ({ bars, from, to, annotations = [], contractions, pivot, revealSpeed = 14, revealAt = 0.2, volume = true, ma = [], demo = false }) => {
  const ep = useEpisode();
  const d = demo || (!bars && !ep?.data) ? vcpBars() : null;
  const B = bars ?? (d ? d.bars : ep?.data?.bars ?? []);
  const C = contractions ?? (d ? d.contractions : []);
  const P = pivot === undefined ? (d ? { price: d.pivot, label: "PIVOT", from: 14 } : null) : pivot;
  const start = typeof from === "number" ? from : 0;
  const end = typeof to === "number" ? to + 1 : B.length;
  const measures: MeasureSpec[] = C.map(([a, b]) => ({ from: a, to: b, fromPrice: "h", toPrice: "l", side: "right", x: "to" }));
  return (
    <CandleChart
      bars={B}
      from={from}
      to={to}
      revealAt={revealAt}
      revealDur={(end - start) / revealSpeed}
      volume={volume}
      ma={ma}
      tripwire={P ? { price: P.price, from: P.from, snapAt: P.snapAt ?? "auto", label: P.label } : null}
      measures={measures}
      annotations={annotations}
    />
  );
};
