import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, TYPE, hexA } from "../../tokens";
import { clamp, prog } from "../../lib/anim";
import { useEpisode } from "../../lib/useEpisode";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";

export interface DuelLane {
  name: string;
  /** Dollar result of each trade, in order. */
  trades: number[];
}

export interface DuelProps {
  /** Two lanes. Default: sim.json `duel` (right / wrong) with the sim's trader names. */
  lanes?: DuelLane[];
  /** Seconds before the first trade lands, and seconds per trade. */
  startAt?: number;
  step?: number;
}

const money = (v: number) => `${v < 0 ? "−" : v > 0 ? "+" : ""}$${Math.abs(Math.round(v)).toLocaleString("en-US")}`;

/** First trade index after which lane 1's running total leads lane 0's for good (null if never). */
export const duelVerdict = (a: number[], b: number[]) => {
  let ca = 0, cb = 0, lead: number | null = null;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    ca += a[i];
    cb += b[i];
    if (cb > ca) lead = lead ?? i;
    else lead = null;
  }
  return lead;
};

/**
 * Win rate vs payoff, as a race of two scoreboards. Each lane places its trades one by one: wins rise in Lichen,
 * losses hang in Ember, bar height = dollars. The win-rate counter says one thing; the running total says another.
 * The moment the second lane takes the lead for good, its total turns Sodium (the one highlight) and the first
 * lane's total goes Ember. score.py drops the music on that same trade.
 */
export const Duel: React.FC<DuelProps> = ({ lanes, startAt = 0.3, step = 0.45 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const ep = useEpisode();
  const sim = ep?.sim as { duel?: Record<string, number[]>; meta?: { traders?: Record<string, { name: string }> } } | undefined;
  const L: DuelLane[] =
    lanes ??
    (sim?.duel
      ? ["right", "wrong"].map((k) => ({ name: sim.meta?.traders?.[k]?.name ?? k, trades: sim.duel![k] }))
      : [
          { name: "Mostly Right", trades: [100, 100, -200, 100, -200, 100, 100, -200, 100, 100] },
          { name: "Mostly Wrong", trades: [-100, -100, 300, -100, -100, -100, 300, -100, 300, -100] },
        ]);
  const t = frame / fps;
  const n = Math.max(...L.map((l) => l.trades.length));
  const verdict = duelVerdict(L[0].trades, L[1].trades);
  const verdictT = verdict === null ? Infinity : startAt + verdict * step + 0.12;
  const flip = prog(frame, fps, verdictT, 0.3);
  const gap = 40 * u;
  const laneH = (h - gap) / 2;
  const headH = 96 * u;
  const barsW = w * 0.76;
  const slot = barsW / n;
  const maxAbs = Math.max(1, ...L.flatMap((l) => l.trades.map(Math.abs)));
  const half = (laneH - headH - 24 * u) / 2;
  const unit = half / maxAbs;
  const fs = SIZE.tape * u;
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {L.map((lane, li) => {
        const y0 = li * (laneH + gap);
        const base = y0 + headH + half;
        let total = 0, wins = 0, done = 0;
        const bars: React.ReactNode[] = [];
        lane.trades.forEach((v, i) => {
          const a = clamp((t - startAt - i * step) / 0.22);
          if (a <= 0) return;
          done++;
          if (a >= 1) {
            total += v;
            if (v > 0) wins++;
          }
          const bh = Math.abs(v) * unit * a;
          const x = i * slot + slot * 0.14;
          const bw = slot * 0.72;
          bars.push(
            v > 0 ? (
              <rect key={i} x={x} y={base - bh} width={bw} height={bh} fill={hexA(C.lichen, 0.85)} rx={2 * u} />
            ) : (
              <rect key={i} x={x} y={base} width={bw} height={bh} fill={hexA(C.ember, 0.9)} rx={2 * u} />
            ),
          );
        });
        const settled = Math.max(1, lane.trades.filter((_, i) => t - startAt - i * step >= 0.22).length);
        const rate = done ? wins / settled : 0;
        const winner = li === 1;
        const totalColor = flip > 0 ? (winner ? C.sodium : C.ember) : C.tape;
        const tx = barsW + 34 * u;
        return (
          <g key={li}>
            <text x={0} y={y0 + 52 * u} fill={C.tape} fontFamily={FONT.display} fontWeight={800} fontSize={SIZE.h2 * u * 0.78}>
              {lane.name}
            </text>
            <text x={barsW} y={y0 + 52 * u} fill={C.mist} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 1.15} textAnchor="end" letterSpacing={TYPE.mono.tracking}>
              {`WINS ${Math.round(rate * 100)}%`}
            </text>
            <line x1={0} x2={barsW} y1={base} y2={base} stroke={C.blueline} strokeWidth={2 * u} />
            {bars}
            <text x={tx} y={base - 14 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs}>
              {"TOTAL"}
            </text>
            <text x={tx} y={base + 40 * u} fill={totalColor} fontFamily={FONT.mono} fontWeight={600} fontSize={SIZE.label * u * 1.35}>
              {money(total)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
