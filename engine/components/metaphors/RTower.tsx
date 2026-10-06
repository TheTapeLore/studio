import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, hexA } from "../../tokens";
import { clamp, rng } from "../../lib/anim";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";

export interface RTowerProps {
  /** R result of each trade (−1 = a full 1R loss). If omitted, generated from winRate/avgWinR/seed. */
  trades?: number[];
  winRate?: number;
  avgWinR?: number;
  n?: number;
  seed?: number;
  /** Seconds to place all trades. */
  dur?: number;
  startAt?: number;
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
 * Asymmetry as architecture: each loser is one Ember 1R block below the line; each winner stacks Sodium
 * 1R blocks above it. The running total counts in R.
 */
export const RTower: React.FC<RTowerProps> = ({ trades, winRate = 0.35, avgWinR = 3, n = 20, seed = 7, dur = 4, startAt = 0.2 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const list = trades ?? rTrades(n, winRate, avgWinR, seed);
  const N = list.length;
  const t = frame / fps - startAt;
  const shown = clamp(t / dur, 0, 1) * N;
  const maxUp = Math.max(1, ...list);
  const headH = 110 * u;
  const slot = w / N;
  const unit = Math.min(slot * 0.82, (h - headH - 40 * u) / (maxUp + 1.4));
  const base = headH + unit * (maxUp + 0.2);
  const bw = Math.min(slot * 0.78, unit);
  let total = 0, wins = 0, done = 0;
  const blocks: React.ReactNode[] = [];
  list.forEach((rv, i) => {
    const a = clamp(shown - i);
    if (a <= 0) return;
    done++;
    total += rv * (a >= 1 ? 1 : 0);
    if (rv > 0 && a >= 1) wins++;
    const x = i * slot + (slot - bw) / 2;
    if (rv < 0) {
      blocks.push(<rect key={i} x={x + 2 * u} y={base + 4 * u} width={bw - 4 * u} height={(unit - 6 * u) * a} fill={hexA(C.ember, 0.18)} stroke={C.ember} strokeWidth={3 * u} rx={3 * u} />);
    } else {
      const k = Math.ceil(rv);
      for (let j = 0; j < k; j++) {
        const part = Math.min(1, rv - j);
        const aj = clamp(a * k - j);
        if (aj <= 0) continue;
        const hh = (unit - 5 * u) * part;
        blocks.push(<rect key={`${i}-${j}`} x={x + 2 * u} y={base - 4 * u - j * unit - hh * aj} width={bw - 4 * u} height={hh * aj} fill={C.sodium} rx={3 * u} />);
      }
    }
  });
  const fs = SIZE.h2 * u * 0.9;
  const wr = done ? Math.round((wins / Math.max(1, Math.floor(shown))) * 100) : 0;
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <text x={0} y={fs * 0.85} fill={C.tape} fontFamily={FONT.display} fontWeight={900} fontSize={fs}>
        {`${total >= 0 ? "+" : "−"}${Math.abs(total).toFixed(1)}R`}
      </text>
      <text x={w} y={fs * 0.5} fill={C.mist} fontFamily={FONT.mono} fontSize={SIZE.tape * u} textAnchor="end">
        {`TRADES ${Math.floor(shown)}/${N}`}
      </text>
      <text x={w} y={fs * 0.5 + 34 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={SIZE.tape * u} textAnchor="end">
        {`WINNERS ${wr}%`}
      </text>
      <line x1={0} x2={w} y1={base} y2={base} stroke={C.tape} strokeWidth={4 * u} />
      <text x={0} y={base + unit + 34 * u} fill={C.ember} fontFamily={FONT.mono} fontSize={SIZE.tape * u}>
        LOSERS: −1R EACH
      </text>
      {blocks}
    </svg>
  );
};
