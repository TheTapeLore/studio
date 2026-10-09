import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, TYPE, hexA } from "../../tokens";
import { clamp, fmtMoney, prog, rng } from "../../lib/anim";
import { useEpisode } from "../../lib/useEpisode";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";
import { fmtR } from "./RCompare";

export interface RTowerProps {
  /** R result of each trade (−1 = a full 1R loss). Default: sim.json `trades`, else generated from winRate/avgWinR/seed. */
  trades?: number[];
  winRate?: number;
  avgWinR?: number;
  n?: number;
  seed?: number;
  /** Seconds to place all trades (or `step` seconds per trade). */
  dur?: number;
  step?: number;
  startAt?: number;
  /** Mono label over the tower. */
  label?: string;
  /** After the tower: the same total in dollars for different accounts (1R = risk). */
  convert?: { label: string; risk: number }[];
  convertAt?: number;
}

/** Deterministic trade list: losers are exactly −1R, winners vary around avgWinR in 0.5R steps. */
export const rTrades = (n: number, winRate: number, avgWinR: number, seed: number) => {
  const r = rng(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    if (r() < winRate) out.push(Math.max(0.5, Math.round(avgWinR * (0.4 + 1.2 * r()) * 2) / 2));
    else out.push(-1);
  }
  return out;
};

/**
 * Trades as architecture, counted in R. Every loser is the same Ember 1R block hanging under the line (the stop did
 * its job); winners stack Lichen 1R blocks above it. The running total in R is the frame's one Sodium. Optional:
 * the same total converted into dollars for very different accounts (R doesn't care about account size).
 */
export const RTower: React.FC<RTowerProps> = ({ trades, winRate = 0.35, avgWinR = 3, n = 20, seed = 7, dur = 4, step, startAt = 0.2, label, convert, convertAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const ep = useEpisode();
  const simTrades = (ep?.sim as { trades?: number[] } | undefined)?.trades;
  const list = trades ?? simTrades ?? rTrades(n, winRate, avgWinR, seed);
  const N = list.length;
  const per = step ?? dur / N;
  const t = frame / fps - startAt;
  const shown = clamp(t / (per * N), 0, 1) * N;
  const maxUp = Math.max(1, ...list);
  const headH = 170 * u;
  const footH = 120 * u;
  const slot = w / N;
  const unit = Math.min(slot * 0.95, (h - headH - footH) / (maxUp + 1.25));
  const base = headH + unit * (maxUp + 0.15);
  const bw = Math.min(slot * 0.8, unit * 1.1);
  let total = 0, wins = 0, placed = 0;
  const blocks: React.ReactNode[] = [];
  list.forEach((rv, i) => {
    const a = clamp(shown - i);
    if (a <= 0) return;
    if (a >= 1) {
      placed++;
      total += rv;
      if (rv > 0) wins++;
    }
    const x = i * slot + (slot - bw) / 2;
    if (rv < 0) {
      const hh = (unit - 6 * u) * Math.abs(rv);
      blocks.push(<rect key={i} x={x + 2 * u} y={base + 5 * u} width={bw - 4 * u} height={hh * a} fill={hexA(C.ember, 0.22)} stroke={C.ember} strokeWidth={3 * u} rx={3 * u} />);
    } else {
      const k = Math.ceil(rv - 1e-9);
      for (let j = 0; j < k; j++) {
        const part = Math.min(1, rv - j);
        const aj = clamp(a * k - j);
        if (aj <= 0) continue;
        const hh = (unit - 5 * u) * part;
        const yb = base - 5 * u - j * unit;
        blocks.push(<rect key={`${i}-${j}`} x={x + 2 * u} y={yb - hh * aj} width={bw - 4 * u} height={hh * aj} fill={hexA(C.lichen, 0.88)} rx={3 * u} />);
      }
    }
  });
  const fs = SIZE.tape * u;
  const wr = placed ? Math.round((wins / placed) * 100) : 0;
  const conv = convert && convertAt !== undefined ? prog(frame, fps, convertAt, 0.4) : 0;
  const lossY = base + unit + 40 * u;
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {label ? (
        <text x={0} y={30 * u} fill={C.mist} fontFamily={FONT.mono} fontWeight={600} fontSize={fs} letterSpacing={TYPE.mono.tracking}>
          {label}
        </text>
      ) : null}
      <text x={0} y={136 * u} fill={C.sodium} fontFamily={FONT.display} fontWeight={900} fontSize={SIZE.h1 * u}>
        {placed ? fmtR(total) : "0R"}
      </text>
      <g opacity={1 - conv}>
        <text x={w} y={84 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs} textAnchor="end">
          {`TRADES ${placed}/${N}`}
        </text>
        <text x={w} y={124 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs} textAnchor="end">
          {`WINNERS ${wr}%`}
        </text>
      </g>
      {convert ? (
        <g opacity={conv}>
          {convert.map((c, i) => (
            <g key={i}>
              <text x={w} y={(72 + i * 58) * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs * 0.9} textAnchor="end">
                {c.label}
              </text>
              <text x={w} y={(100 + i * 58) * u} fill={C.tape} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 1.25} textAnchor="end">
                {`${total >= 0 ? "+" : "−"}${fmtMoney(Math.abs(total * c.risk))}`}
              </text>
            </g>
          ))}
        </g>
      ) : null}
      <line x1={0} x2={w} y1={base} y2={base} stroke={C.tape} strokeWidth={4 * u} />
      {blocks}
      <text x={0} y={lossY} fill={C.ember} fontFamily={FONT.mono} fontWeight={600} fontSize={fs} letterSpacing={TYPE.mono.tracking}>
        EVERY LOSER: −1R. SAME SIZE.
      </text>
    </svg>
  );
};
