import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, CHART, FONT, SIZE, hexA } from "../../tokens";
import { clamp, fmtNum } from "../../lib/anim";
import { Bar } from "../../lib/spec";
import { vcpBars } from "../../lib/finance";
import { useEpisode } from "../../lib/useEpisode";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";
import { Annotation, AnnotationSpec } from "./Annotation";
import { ChartContext, ChartScale, barIndex } from "./ChartContext";
import { MovingAverages } from "./MovingAverages";
import { PercentMeasure, MeasureSpec } from "./PercentMeasure";
import { RSLine } from "./RSLine";
import { Tripwire, TripwireSpec } from "./Tripwire";
import { VolumePane } from "./VolumePane";

export interface CandleChartProps {
  bars?: Bar[];
  /** Use the built-in synthetic base (labelled simulated by the format). */
  demo?: boolean;
  /** View window as bar indices or ISO dates. Earlier bars still feed the moving averages. */
  from?: number | string;
  to?: number | string;
  /** Bar-by-bar reveal: starts at `revealAt` s, takes `revealDur` s. Bars before `revealFrom` are already drawn. */
  revealAt?: number;
  revealDur?: number;
  revealFrom?: number | string;
  /** Stop the reveal here (Replay freeze). */
  revealTo?: number | string;
  /** "all": y-range from the whole window. "visible": grows with the revealed bars (no hindsight). */
  domain?: "all" | "visible";
  /** Extra price levels to keep in range. */
  include?: number[];
  volume?: boolean;
  ma?: number[];
  rs?: boolean;
  tripwire?: TripwireSpec | null;
  annotations?: AnnotationSpec[];
  measures?: MeasureSpec[];
  /** "line" draws a close line instead of candles (long histories). */
  style?: "candles" | "line";
  axes?: boolean;
  /** Mono label top-left, e.g. "NASDAQ COMPOSITE · DAILY CLOSE". "auto" builds it from the episode data. */
  title?: string | null;
  w?: number;
  h?: number;
  children?: React.ReactNode;
}

/**
 * Candles revealed bar by bar. Up candles hollow Tape, down candles solid Ember (tokens.chart).
 * Children and the overlay props share the chart's scale through ChartContext.
 */
export const CandleChart: React.FC<CandleChartProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const stage = useStage();
  const ep = useEpisode();
  const bars = p.bars ?? (p.demo ? vcpBars().bars : ep?.data?.bars) ?? [];
  const W = p.w ?? stage.w;
  const H = p.h ?? stage.h;
  if (!bars.length) return null;

  const start = barIndex(bars, p.from, 0);
  const end = Math.min(bars.length, barIndex(bars, p.to, bars.length - 1) + 1);
  const n = Math.max(1, end - start);
  const revealFrom = barIndex(bars, p.revealFrom, start);
  const revealTo = Math.min(end, barIndex(bars, p.revealTo, end - 1) + 1);
  const rAt = p.revealAt ?? 0;
  const rDur = p.revealDur ?? 0;
  const t = frame / fps;
  const span = Math.max(1, revealTo - revealFrom);
  const reveal = rDur <= 0 ? revealTo : revealFrom + span * clamp((t - rAt) / rDur);
  const timeOfBar = (i: number) => (rDur <= 0 ? 0 : rAt + (rDur * (i + 1 - revealFrom)) / span);

  const axesW = p.axes === false ? 0 : 92 * u;
  const volH = p.volume ? H * 0.2 : 0;
  const gap = p.volume ? 14 * u : 0;
  const dateH = p.axes === false ? 0 : 34 * u;
  const plot = { x: 0, y: 8 * u, w: W - axesW, h: H - volH - gap - dateH - 8 * u };
  const vol = p.volume ? { x: 0, y: plot.y + plot.h + gap, w: plot.w, h: volH } : null;

  // y domain
  const domEnd = p.domain === "visible" ? Math.max(start + 1, Math.ceil(reveal)) : end;
  let lo = Infinity, hi = -Infinity;
  for (let i = start; i < domEnd; i++) {
    lo = Math.min(lo, bars[i].l);
    hi = Math.max(hi, bars[i].h);
  }
  for (const v of p.include ?? []) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  if (p.tripwire?.price) hi = Math.max(hi, p.tripwire.price);
  const pad = (hi - lo) * 0.08 || 1;
  lo -= pad;
  hi += pad;

  const step = plot.w / n;
  const d = ep?.data;
  const title =
    p.title === "auto" && d
      ? `${d.symbol} · ${d.interval === "1mo" ? "MONTHLY" : d.interval === "1wk" ? "WEEKLY" : "DAILY"}${p.style === "line" ? " CLOSE" : ""} · ${(d.source ?? "yfinance").toUpperCase()}`
      : p.title ?? null;
  const scale: ChartScale = {
    bars, start, end, plot, vol, step, reveal, timeOfBar, u, w: W, h: H,
    bodyW: Math.max(1, step * 0.62),
    x: (i) => plot.x + (i - start + 0.5) * step,
    y: (pr) => plot.y + plot.h * (1 - (pr - lo) / (hi - lo)),
  };

  const visibleEnd = Math.min(end, Math.ceil(reveal));
  const candles: React.ReactNode[] = [];
  if (p.style === "line") {
    const pts: string[] = [];
    for (let i = start; i < visibleEnd; i++) pts.push(`${i === start ? "M" : "L"}${scale.x(i).toFixed(1)},${scale.y(bars[i].c).toFixed(1)}`);
    candles.push(<path key="line" d={pts.join("")} fill="none" stroke={C.tape} strokeWidth={3.2 * u} strokeLinejoin="round" strokeLinecap="round" />);
  } else {
    for (let i = start; i < visibleEnd; i++) {
      const b = bars[i];
      const op = clamp(reveal - i);
      const up = b.c >= b.o;
      const x = scale.x(i);
      const yT = scale.y(Math.max(b.o, b.c));
      const yB = scale.y(Math.min(b.o, b.c));
      const sw = Math.max(1, Math.min(2.2 * u, step * 0.16));
      const col = up ? CHART.candleUp.stroke : CHART.candleDown.stroke;
      candles.push(
        <g key={i} opacity={op}>
          <line x1={x} x2={x} y1={scale.y(b.h)} y2={yT} stroke={col} strokeWidth={sw} />
          <line x1={x} x2={x} y1={yB} y2={scale.y(b.l)} stroke={col} strokeWidth={sw} />
          <rect
            x={x - scale.bodyW / 2 + (up ? sw / 2 : 0)}
            y={yT + (up ? sw / 2 : 0)}
            width={Math.max(0.5, scale.bodyW - (up ? sw : 0))}
            height={Math.max(sw, yB - yT - (up ? sw : 0))}
            fill={up ? "none" : CHART.candleDown.fill}
            stroke={up ? col : "none"}
            strokeWidth={up ? sw : 0}
          />
        </g>,
      );
    }
  }

  // price axis
  const ticks: React.ReactNode[] = [];
  if (p.axes !== false) {
    const rough = (hi - lo) / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const stepV = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rough) ?? rough;
    for (let v = Math.ceil(lo / stepV) * stepV; v <= hi; v += stepV) {
      const y = scale.y(v);
      ticks.push(
        <g key={`p${v}`}>
          <line x1={plot.x + plot.w} x2={plot.x + plot.w + 10 * u} y1={y} y2={y} stroke={C.blueline} strokeWidth={2 * u} />
          <text x={plot.x + plot.w + 16 * u} y={y + 7 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={SIZE.tape * u * 0.9}>
            {fmtNum(v, stepV < 1 ? 2 : 0)}
          </text>
        </g>,
      );
    }
    // date labels: years if the window spans > 1.5 years, else months
    const first = bars[start].t, last = bars[end - 1].t;
    const dated = !Number.isNaN(Date.parse(first));
    const years = (Date.parse(last) - Date.parse(first)) / 3.15e10;
    const key = (s: string) => (years > 1.5 ? s.slice(0, 4) : s.slice(0, 7));
    const every = years > 6 ? Math.ceil(years / 5) : 1;
    let prev = key(first), count = 0;
    for (let i = start + 1; dated && i < end; i++) {
      const k = key(bars[i].t);
      if (k !== prev) {
        prev = k;
        if (count++ % every !== 0) continue;
        const x = scale.x(i);
        if (x < 40 * u || x > plot.w - 40 * u) continue;
        const label = years > 1.5 ? k : new Date(bars[i].t + "T00:00:00Z").toLocaleString("en-US", { month: "short", timeZone: "UTC" }) + (k.endsWith("-01") ? ` ${k.slice(2, 4)}` : "");
        ticks.push(
          <text key={`d${i}`} x={x} y={H - 6 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={SIZE.tape * u * 0.85} textAnchor="middle">
            {label}
          </text>,
        );
      }
    }
  }

  return (
    <ChartContext.Provider value={scale}>
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <line x1={plot.x + plot.w} x2={plot.x + plot.w} y1={plot.y} y2={plot.y + plot.h} stroke={hexA(C.blueline, 0.8)} strokeWidth={1.5 * u} />
        {title ? (
          <text x={plot.x} y={plot.y + 22 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={SIZE.tape * u * 0.9} letterSpacing="0.1em">
            {title}
          </text>
        ) : null}
        {ticks}
        {vol ? <VolumePane /> : null}
        {p.ma?.length ? <MovingAverages periods={p.ma} /> : null}
        {p.rs ? <RSLine /> : null}
        {candles}
        {p.tripwire ? <Tripwire {...p.tripwire} /> : null}
        {(p.measures ?? []).map((m, i) => (
          <PercentMeasure key={`m${i}`} {...m} />
        ))}
        {(p.annotations ?? []).map((a, i) => (
          <Annotation key={`a${i}`} {...a} />
        ))}
        {p.children}
      </svg>
    </ChartContext.Provider>
  );
};
