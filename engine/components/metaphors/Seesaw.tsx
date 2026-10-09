import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, TYPE, hexA } from "../../tokens";
import { clamp, fmtMoney, fmtNum, lerp, prog } from "../../lib/anim";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";

export interface SeesawProps {
  account?: number;
  /** Fraction of the account risked per trade (0.01 = 1%): the counterweight. */
  accountRiskPct?: number;
  /** Stop distance(s) in dollars per share, in order. The share stack slides out to each one. */
  stopDistance?: number | number[];
  /** "risk": shares re-size so the beam levels (shares = floor(risk ÷ stop)). "shares": always `shares`, the beam tips. */
  mode?: "risk" | "shares";
  shares?: number;
  /** Seconds each stop distance is held; the first move starts at startAt. */
  hold?: number;
  startAt?: number;
  /** Shares per block in the stack. */
  perBlock?: number;
  price?: number;
}

/**
 * Position sizing as a real lever. Left: the counterweight, your fixed risk budget (Sodium: the one thing you
 * decide first). Right: a stack of shares sitting at its stop distance along a ruled beam, so its pull is
 * shares × stop = dollars at risk. Balanced when that equals the budget. Slide the stop out and the beam tips
 * (mode "shares": the same 100 shares, more and more at risk); in mode "risk" blocks fly off until it levels.
 */
export const Seesaw: React.FC<SeesawProps> = ({
  account = 10000,
  accountRiskPct = 0.01,
  stopDistance = [1, 2, 4],
  mode = "risk",
  shares: fixedShares = 100,
  hold = 2.4,
  startAt = 0.6,
  perBlock = 10,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const t = frame / fps;
  const stops = Array.isArray(stopDistance) ? stopDistance : [stopDistance];
  const budget = account * accountRiskPct;
  const sizeFor = (s: number) => (mode === "risk" ? Math.floor(budget / s) : fixedShares);
  // which stop we are on, and how far through its move
  const k = clamp(Math.floor((t - startAt) / hold) + 1, 0, stops.length - 1);
  const into = t - startAt - (k - 1) * hold;
  const slide = k === 0 ? 1 : prog(into * fps, fps, 0, 0.6);
  const prevStop = stops[Math.max(0, k - 1)];
  const stopNow = lerp(prevStop, stops[k], slide);
  const prevShares = sizeFor(prevStop);
  const newShares = sizeFor(stops[k]);
  const resize = k === 0 ? 1 : prog(into * fps, fps, 0.85, 0.5);
  const sharesNow = Math.round(lerp(prevShares, newShares, resize));
  const atRisk = sharesNow * stopNow;
  const r = atRisk / budget;
  // tilt: 8° per doubling of the risk, capped; a damped wobble when it re-levels
  const settleT = into - 1.35;
  const wobble = k > 0 && mode === "risk" && settleT > 0 ? Math.exp(-3.5 * settleT) * Math.sin(11 * settleT) * 2.2 : 0;
  const tilt = clamp(8 * Math.log2(Math.max(r, 1e-3)), -16, 16) + wobble;

  const cx = w / 2;
  const by = h * 0.6;
  const Lh = Math.min(w * 0.46, 430 * u);
  const maxStop = Math.max(...stops, 4);
  const posOf = (s: number) => Lh * 0.12 + (Lh * 0.8 * s) / maxStop;
  const fs = SIZE.tape * u;
  const bs = Math.min(40 * u, Lh * 0.1);
  const cols = 2;
  const blockCount = (n: number) => n / perBlock;
  const shownBlocks = blockCount(prevShares > newShares ? prevShares : sharesNow);
  const flyP = resize; // blocks above the new count fly off while resizing
  const stackX = cx + posOf(stopNow);
  const blocks: React.ReactNode[] = [];
  const fullBlocks = Math.ceil(shownBlocks - 1e-9);
  for (let i = 0; i < fullBlocks; i++) {
    const part = Math.min(1, shownBlocks - i);
    const leaving = i + 1 > blockCount(newShares) + 1e-9 && prevShares > newShares;
    const partNew = leaving ? Math.max(0, Math.min(1, blockCount(newShares) - i)) : part;
    const flyPart = leaving ? 1 - partNew : 0;
    const col = i % cols, row = Math.floor(i / cols);
    const bx = stackX - (cols * bs) / 2 + col * bs;
    const yb = by - 14 * u - row * bs;
    // the part that stays
    if (partNew > 0) {
      const hh = (bs - 5 * u) * partNew;
      blocks.push(<rect key={`s${i}`} x={bx + 2.5 * u} y={yb - hh - 2.5 * u} width={bs - 5 * u} height={hh} fill={C.tape} rx={3 * u} />);
    }
    if (flyPart > 0 && flyP < 1) {
      const hh = (bs - 5 * u) * flyPart;
      const dy = -90 * u * flyP, dx = (col ? 40 : -40) * u * flyP;
      blocks.push(
        <rect key={`f${i}`} x={bx + 2.5 * u + dx} y={yb - (bs - 5 * u) - 2.5 * u + dy} width={bs - 5 * u} height={hh} fill={C.tape} opacity={1 - flyP} rx={3 * u} />,
      );
    }
  }
  const stackTop = by - 14 * u - Math.ceil(Math.max(blockCount(sharesNow), 1) / cols) * bs;
  const over = r > 1.01;
  const ticks = [1, 2, 3, 4].filter((s) => s <= maxStop);
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {/* readouts */}
      <text x={0} y={40 * u} fill={C.mist} fontFamily={FONT.mono} fontWeight={600} fontSize={fs} letterSpacing={TYPE.mono.tracking}>
        {`STOP ${fmtMoney(stopNow, 2)} AWAY`}
      </text>
      <text x={0} y={84 * u} fill={C.mist} fontFamily={FONT.mono} fontWeight={600} fontSize={fs} letterSpacing={TYPE.mono.tracking}>
        {`${fmtNum(sharesNow)} SHARES`}
      </text>
      <text x={w} y={40 * u} fill={C.mist} fontFamily={FONT.mono} fontWeight={600} fontSize={fs} textAnchor="end" letterSpacing={TYPE.mono.tracking}>
        AT RISK
      </text>
      <text x={w} y={40 * u + SIZE.h2 * u * 0.95} fill={over ? C.ember : C.tape} fontFamily={FONT.display} fontWeight={900} fontSize={SIZE.h2 * u * 1.05} textAnchor="end">
        {fmtMoney(Math.round(atRisk))}
      </text>
      {/* fulcrum */}
      <path d={`M${cx},${by} L${cx - 54 * u},${by + 100 * u} L${cx + 54 * u},${by + 100 * u} Z`} fill={hexA(C.blueline, 0.5)} stroke={C.tape} strokeWidth={3 * u} strokeLinejoin="round" />
      <line x1={cx - Lh * 1.05} x2={cx + Lh * 1.05} y1={by + 100 * u} y2={by + 100 * u} stroke={C.blueline} strokeWidth={3 * u} />
      <g transform={`rotate(${tilt} ${cx} ${by})`}>
        <rect x={cx - Lh} y={by - 14 * u} width={2 * Lh} height={14 * u} rx={7 * u} fill={C.tape} />
        {/* stop-distance ruler on the right arm */}
        {ticks.map((s) => (
          <g key={s}>
            <line x1={cx + posOf(s)} x2={cx + posOf(s)} y1={by} y2={by + 18 * u} stroke={C.mist} strokeWidth={3 * u} />
            <text x={cx + posOf(s)} y={by + 50 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs * 0.95} textAnchor="middle">
              {`$${s}`}
            </text>
          </g>
        ))}
        {/* counterweight: the risk budget */}
        <rect x={cx - Lh * 0.78 - 75 * u} y={by - 14 * u - 120 * u} width={150 * u} height={120 * u} rx={6 * u} fill={C.sodium} />
        <text x={cx - Lh * 0.78} y={by - 14 * u - 46 * u} fill={C.prussian} fontFamily={FONT.display} fontWeight={900} fontSize={SIZE.label * u * 1.7} textAnchor="middle">
          {fmtMoney(budget)}
        </text>
        <text x={cx - Lh * 0.78} y={by + 50 * u} fill={C.tape} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 0.95} textAnchor="middle" letterSpacing={TYPE.mono.tracking}>
          RISK BUDGET
        </text>
        <text x={cx - Lh * 0.78} y={by + 84 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs * 0.85} textAnchor="middle">
          {`${fmtNum(accountRiskPct * 100, accountRiskPct * 100 < 1 ? 1 : 0)}% OF ${fmtMoney(account)}`}
        </text>
        {blocks}
        <text x={stackX} y={stackTop - 18 * u} fill={C.tape} fontFamily={FONT.mono} fontWeight={600} fontSize={fs} textAnchor="middle">
          {`${fmtNum(sharesNow)} SH`}
        </text>
      </g>
      <text x={cx + Lh * 0.52} y={by + 150 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs * 0.85} textAnchor="middle" letterSpacing={TYPE.mono.tracking}>
        STOP DISTANCE PER SHARE
      </text>
    </svg>
  );
};
