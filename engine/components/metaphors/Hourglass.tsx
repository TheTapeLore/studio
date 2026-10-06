import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, hexA } from "../../tokens";
import { clamp, fmtMoney, prog } from "../../lib/anim";
import { bs } from "../../lib/finance";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";

export interface HourglassProps {
  daysToExpiry?: number;
  /** Implied volatility (0.3 = 30%). */
  iv?: number;
  spot?: number;
  strike?: number;
  type?: "call" | "put";
  /** Seconds to run the clock from daysToExpiry to 0. */
  dur?: number;
  startAt?: number;
}

/**
 * Theta as an hourglass. Sand in the top bulb = the option's time value (Black–Scholes, at-the-money by default);
 * it drains slowly at first and fastest near expiry. The curve beside it is the same number, plotted by day.
 */
export const Hourglass: React.FC<HourglassProps> = ({ daysToExpiry = 60, iv = 0.3, spot = 100, strike, type = "call", dur = 5, startAt = 0.5 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const K = strike ?? spot;
  const intrinsic = type === "call" ? Math.max(spot - K, 0) : Math.max(K - spot, 0);
  const tv = (d: number) => bs(type, spot, K, d / 365, 0.03, iv) - intrinsic;
  const p = prog(frame, fps, startAt, dur, "linear");
  const day = daysToExpiry * (1 - p);
  const tv0 = tv(daysToExpiry);
  const frac = clamp(tv(day) / tv0);
  const perDay = tv(day) - tv(Math.max(0, day - 1));
  // hourglass geometry
  const gw = Math.min(w * 0.38, 300 * u), gh = Math.min(h * 0.86, 640 * u);
  const gx = w * 0.04, gy = (h - gh) / 2;
  const mid = gy + gh / 2, neck = 14 * u;
  const outline = `M${gx},${gy} H${gx + gw} C${gx + gw},${mid - gh * 0.2} ${gx + gw / 2 + neck},${mid - 30 * u} ${gx + gw / 2 + neck},${mid} C${gx + gw / 2 + neck},${mid + 30 * u} ${gx + gw},${mid + gh * 0.2} ${gx + gw},${gy + gh} H${gx} C${gx},${mid + gh * 0.2} ${gx + gw / 2 - neck},${mid + 30 * u} ${gx + gw / 2 - neck},${mid} C${gx + gw / 2 - neck},${mid - 30 * u} ${gx},${mid - gh * 0.2} ${gx},${gy} Z`;
  const topSandY = mid - (gh / 2 - 20 * u) * frac;
  const botSandY = gy + gh - (gh / 2 - 20 * u) * (1 - frac);
  // curve
  const cx0 = gx + gw + 70 * u, cx1 = w - 20 * u, cy0 = gy + 190 * u, cy1 = gy + gh - 60 * u;
  const X = (d: number) => cx0 + (1 - d / daysToExpiry) * (cx1 - cx0);
  const Y = (v: number) => cy1 - (v / tv0) * (cy1 - cy0);
  const curve: string[] = [];
  for (let d = daysToExpiry; d >= 0; d -= daysToExpiry / 120) curve.push(`${curve.length ? "L" : "M"}${X(d).toFixed(1)},${Y(tv(d)).toFixed(1)}`);
  const fs = SIZE.tape * u;
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <defs>
        <clipPath id="hgClip">
          <path d={outline} />
        </clipPath>
      </defs>
      <g clipPath="url(#hgClip)">
        <rect x={gx} y={topSandY} width={gw} height={mid - topSandY} fill={C.sodium} />
        <rect x={gx} y={botSandY} width={gw} height={gy + gh - botSandY} fill={hexA(C.mist, 0.45)} />
        {frac > 0.001 ? <rect x={gx + gw / 2 - 3 * u} y={mid} width={6 * u} height={botSandY - mid} fill={C.sodium} opacity={0.8} /> : null}
      </g>
      <path d={outline} fill="none" stroke={C.tape} strokeWidth={6 * u} strokeLinejoin="round" />
      <text x={gx + gw / 2} y={gy - 18 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs} textAnchor="middle">
        TIME VALUE
      </text>
      {/* curve */}
      <line x1={cx0} x2={cx1} y1={cy1} y2={cy1} stroke={C.blueline} strokeWidth={2 * u} />
      <path d={curve.join("")} fill="none" stroke={hexA(C.tape, 0.35)} strokeWidth={4 * u} />
      <path d={curve.filter((_, i) => i <= ((daysToExpiry - day) / daysToExpiry) * 120).join("")} fill="none" stroke={C.tape} strokeWidth={5 * u} />
      <circle cx={X(day)} cy={Y(tv(day))} r={10 * u} fill={C.tape} />
      <text x={cx0} y={cy1 + 40 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs}>
        {`${daysToExpiry}D`}
      </text>
      <text x={cx1} y={cy1 + 40 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs} textAnchor="end">
        EXPIRY
      </text>
      <text x={cx0} y={gy + 50 * u} fill={C.tape} fontFamily={FONT.display} fontWeight={900} fontSize={SIZE.h2 * u * 0.8}>
        {`${Math.ceil(day)} days left`}
      </text>
      <text x={cx0} y={gy + 96 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs}>
        {`TIME VALUE ${fmtMoney(tv(day), 2)} · TODAY'S DECAY ${fmtMoney(perDay, 2)}`}
      </text>
      <text x={cx0} y={gy + 132 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs * 0.9}>
        {`ATM ${type.toUpperCase()} · IV ${Math.round(iv * 100)}% · BLACK–SCHOLES`}
      </text>
    </svg>
  );
};
