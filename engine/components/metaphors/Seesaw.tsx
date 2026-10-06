import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, hexA } from "../../tokens";
import { fmtMoney, fmtNum, lerp, prog } from "../../lib/anim";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";

export interface SeesawProps {
  account?: number;
  /** Fraction of the account risked per trade (0.01 = 1%). */
  accountRiskPct?: number;
  /** Stop distance(s) in dollars per share. Several values = the stop changes, beat by beat. */
  stopDistance?: number | number[];
  price?: number;
  /** Seconds each stop distance is held. */
  hold?: number;
}

/**
 * Position sizing as a balance: stop distance on one side, shares on the other, the fulcrum is your fixed risk.
 * Widen the stop and the share stack shrinks so the beam stays level. shares = floor(account × risk ÷ stop).
 */
export const Seesaw: React.FC<SeesawProps> = ({ account = 10000, accountRiskPct = 0.01, stopDistance = [1, 2, 4], price = 50, hold = 2.2 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const stops = Array.isArray(stopDistance) ? stopDistance : [stopDistance];
  const t = frame / fps;
  const k = Math.min(stops.length - 1, Math.floor(t / hold));
  const into = t - k * hold;
  const tr = k === 0 ? 1 : prog(into * fps, fps, 0, 0.6);
  const prev = stops[Math.max(0, k - 1)];
  const stop = lerp(prev, stops[k], tr);
  const risk = account * accountRiskPct;
  const shares = Math.floor(risk / stop);
  const maxShares = Math.floor(risk / Math.min(...stops));
  // the beam tips while the stop changes, then the shares re-balance it
  const tip = k === 0 ? 0 : Math.sin(Math.PI * Math.min(1, into / 0.9)) * Math.exp(-into * 1.5) * 9;
  const cx = w / 2, by = h * 0.62;
  const beamL = Math.min(w * 0.88, 860 * u);
  const fs = SIZE.label * u;
  const maxStopPx = h * 0.42;
  const stopPx = (stop / Math.max(...stops)) * maxStopPx;
  const cols = 5;
  const blockUnit = maxShares / 25; // 25 blocks at the tightest stop
  const nBlocks = Math.max(1, Math.round(shares / blockUnit));
  const bs = Math.min(36 * u, (beamL * 0.36) / cols);
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {/* fulcrum: the fixed risk */}
      <path d={`M${cx},${by} L${cx - 60 * u},${by + 110 * u} L${cx + 60 * u},${by + 110 * u} Z`} fill={C.sodium} />
      <text x={cx} y={by + 160 * u} fill={C.tape} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 1.1} textAnchor="middle">
        {`RISK ${fmtNum(accountRiskPct * 100, accountRiskPct * 100 < 1 ? 1 : 0)}% = ${fmtMoney(risk)}`}
      </text>
      <text x={cx} y={by + 200 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={SIZE.tape * u} textAnchor="middle">
        {`ACCOUNT ${fmtMoney(account)} · PRICE ${fmtMoney(price, 2)}`}
      </text>
      <g transform={`rotate(${tip} ${cx} ${by})`}>
        <rect x={cx - beamL / 2} y={by - 12 * u} width={beamL} height={12 * u} rx={6 * u} fill={C.tape} />
        {/* left: stop distance drawn to scale */}
        <g transform={`translate(${cx - beamL * 0.36}, ${by - 12 * u})`}>
          <rect x={-34 * u} y={-stopPx} width={68 * u} height={stopPx} fill={hexA(C.ember, 0.2)} stroke={C.ember} strokeWidth={3 * u} />
          <text x={0} y={-stopPx - 52 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={SIZE.tape * u} textAnchor="middle">
            STOP
          </text>
          <text x={0} y={-stopPx - 16 * u} fill={C.ember} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 1.3} textAnchor="middle">
            {fmtMoney(stop, 2)}
          </text>
        </g>
        {/* right: shares as blocks */}
        <g transform={`translate(${cx + beamL * 0.36 - (cols * bs) / 2}, ${by - 12 * u})`}>
          {Array.from({ length: nBlocks }).map((_, i) => (
            <rect key={i} x={(i % cols) * bs + 2 * u} y={-(Math.floor(i / cols) + 1) * bs + 2 * u} width={bs - 4 * u} height={bs - 4 * u} fill={C.tape} opacity={0.9} rx={3 * u} />
          ))}
          <text x={(cols * bs) / 2} y={-Math.ceil(nBlocks / cols) * bs - 52 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={SIZE.tape * u} textAnchor="middle">
            SHARES
          </text>
          <text x={(cols * bs) / 2} y={-Math.ceil(nBlocks / cols) * bs - 16 * u} fill={C.tape} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 1.3} textAnchor="middle">
            {fmtNum(shares)}
          </text>
        </g>
      </g>
    </svg>
  );
};
