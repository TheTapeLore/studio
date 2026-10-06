import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, hexA } from "../../tokens";
import { clamp, fmtMoney, fmtPct, lerp, prog } from "../../lib/anim";
import { recoveryGain } from "../../lib/finance";
import { useLayout } from "../layout/layout";
import { Sfx } from "../layout/Sfx";
import { useStage } from "../layout/Stage";

export interface ThePitProps {
  /** Fractional loss, 0.5 = −50%. */
  lossPct: number;
  /** Start from this loss (already dug) and sweep to `lossPct`. */
  fromLossPct?: number | null;
  sweepAt?: number;
  sweepDur?: number;
  /** Keyframes [seconds, loss] for the sweep, eased between holds. Overrides fromLossPct/sweepAt/sweepDur. */
  keys?: [number, number][] | null;
  /** Starting account in dollars; adds $ labels and the "what's left" bracket. */
  account?: number | null;
  /** Bedrock = $0. The climb is measured against what's left above it. */
  showBedrock?: boolean;
  showTable?: boolean;
  tableRows?: number[];
  /** Under-pit note, e.g. "Same distance. Twice the percentage." */
  note?: string | null;
  /** false = draw the finished state at once (continuing from a previous beat). */
  enter?: boolean;
  digAt?: number;
  digDur?: number;
  climbAt?: number;
  climbDur?: number;
  sfx?: boolean;
}

/**
 * Risk metaphor "The Pit": a loss digs a pit; climbing out is the same distance but a bigger percentage,
 * because the climb is measured from what is left. Every number is computed from lossPct.
 */
export const ThePit: React.FC<ThePitProps> = ({
  lossPct,
  fromLossPct = null,
  sweepAt = 0.4,
  sweepDur = 3,
  keys = null,
  account = null,
  showBedrock = false,
  showTable = false,
  tableRows = [0.1, 0.2, 0.25, 0.33, 0.5, 0.75, 0.9],
  note = null,
  enter = true,
  digAt = 0.15,
  digDur = 0.8,
  climbAt = 1.05,
  climbDur = 0.8,
  sfx = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();

  const keyed = !!keys && keys.length > 1;
  const sweeping = keyed || (fromLossPct !== null && fromLossPct !== undefined);
  const ground = enter && !sweeping ? prog(frame, fps, 0, 0.35, "draw") : 1;
  const dig = enter && !sweeping ? prog(frame, fps, digAt, digDur, "draw") : 1;
  const climb = enter && !sweeping ? prog(frame, fps, climbAt, climbDur, "draw") : 1;
  const keyAt = (ts: number) => {
    const k = keys as [number, number][];
    if (ts <= k[0][0]) return k[0][1];
    for (let i = 1; i < k.length; i++) {
      if (ts <= k[i][0]) return lerp(k[i - 1][1], k[i][1], prog(ts * fps, fps, k[i - 1][0], k[i][0] - k[i - 1][0], "standard"));
    }
    return k[k.length - 1][1];
  };
  const L = keyed ? keyAt(frame / fps) : sweeping ? lerp(fromLossPct as number, lossPct, prog(frame, fps, sweepAt, sweepDur, "standard")) : lossPct;
  const Ldug = L * dig;
  const gain = recoveryGain(L);

  // geometry
  const tableW = showTable ? w * 0.36 : 0;
  // pit area keeps a gutter before the table so the climb label never touches it
  const pw = w - tableW - (showTable ? 40 * u : 0);
  const noteH = note ? 70 * u : 0;
  const top = h * 0.1;
  const groundY = top;
  // With a bedrock the full account height is the scale. Without one, the deepest loss in this beat
  // (never less than 50%) fills the available depth.
  const avail = h - top - noteH - (showBedrock ? 70 : 90) * u;
  const bedrockDepth = avail;
  const deepest = Math.max(0.5, lossPct, keyed ? Math.max(...(keys as [number, number][]).map((k) => k[1])) : sweeping ? (fromLossPct as number) : 0);
  const depth = (showBedrock ? bedrockDepth : avail / deepest) * Ldug;
  const floorY = groundY + depth;
  const pitW = Math.min(pw * (showTable ? 0.26 : 0.42), 340 * u);
  const cx = pw * 0.5;
  const xl = cx - pitW / 2, xr = cx + pitW / 2;
  const sw = 13 * u;
  const asw = 15 * u;
  const groundLen = pw * 0.48 * ground;

  // arrows
  const ax1 = xl + pitW * 0.26, ax2 = xl + pitW * 0.74;
  const head = 26 * u;
  const downEnd = groundY + 22 * u + (floorY - groundY - 44 * u) * clamp(dig);
  const upLen = (floorY - groundY - 44 * u) * climb;
  const upTop = floorY - 22 * u - upLen;
  const fsBig = SIZE.h2 * u * (showTable ? 0.64 : 0.82);
  const remaining = account ? account * (1 - L * clamp(dig)) : null;

  const rows = tableRows.map((r) => ({ r, g: recoveryGain(r) }));
  const active = rows.reduce((best, row) => (Math.abs(row.r - L) < Math.abs(best.r - L) ? row : best), rows[0]);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {/* bedrock: $0. What is left sits between the pit floor and here. */}
        {showBedrock ? (
          <g opacity={ground}>
            <line x1={cx - groundLen} x2={cx + groundLen} y1={groundY + bedrockDepth} y2={groundY + bedrockDepth} stroke={C.blueline} strokeWidth={4 * u} strokeDasharray={`${14 * u} ${10 * u}`} />
            <text x={cx - groundLen} y={groundY + bedrockDepth + 38 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={SIZE.tape * u}>
              {account ? "$0" : "ZERO"}
            </text>
            {/* hatch: what's left */}
            <rect x={xl} y={floorY} width={pitW} height={Math.max(0, groundY + bedrockDepth - floorY)} fill="url(#pitHatch)" opacity={dig} />
            <defs>
              <pattern id="pitHatch" width={18 * u} height={18 * u} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1={0} y1={0} x2={0} y2={18 * u} stroke={hexA(C.blueline, 0.55)} strokeWidth={3 * u} />
              </pattern>
            </defs>
          </g>
        ) : null}
        {/* pit interior */}
        <rect x={xl} y={groundY} width={pitW} height={Math.max(0, depth)} fill={C.abyss} opacity={0.75} />
        {/* ground + walls + floor */}
        <path
          d={`M${cx - groundLen},${groundY} L${xl},${groundY} L${xl},${floorY} L${xr},${floorY} L${xr},${groundY} L${cx + groundLen},${groundY}`}
          fill="none"
          stroke={C.tape}
          strokeWidth={sw}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* down arrow: the loss */}
        {dig > 0.02 && floorY - groundY > 60 * u ? (
          <g stroke={C.ember} strokeWidth={asw} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d={`M${ax1},${groundY + 22 * u} L${ax1},${downEnd}`} />
            <path d={`M${ax1 - head},${downEnd - head} L${ax1},${downEnd} L${ax1 + head},${downEnd - head}`} />
          </g>
        ) : null}
        {/* up arrow: the climb, same distance */}
        {climb > 0.02 && floorY - groundY > 60 * u ? (
          <g stroke={C.sodium} strokeWidth={asw} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d={`M${ax2},${floorY - 22 * u} L${ax2},${upTop}`} />
            <path d={`M${ax2 - head},${upTop + head} L${ax2},${upTop} L${ax2 + head},${upTop + head}`} />
          </g>
        ) : null}
        {/* percentage labels beside the walls */}
        <text x={xl - 26 * u} y={groundY + depth / 2 + fsBig * 0.35} fill={C.ember} fontFamily={FONT.mono} fontWeight={600} fontSize={fsBig} textAnchor="end" opacity={clamp(dig * 3)}>
          {fmtPct(-L * clamp(dig), 0)}
        </text>
        <text x={xr + 26 * u} y={groundY + depth / 2 + fsBig * 0.35} fill={C.sodium} fontFamily={FONT.mono} fontWeight={600} fontSize={fsBig} textAnchor="start" opacity={clamp(climb * 3)}>
          {Number.isFinite(gain) ? fmtPct(gain * climb, 0) : "∞"}
        </text>
        {/* dollars */}
        {account ? (
          <g fontFamily={FONT.mono} fontSize={SIZE.tape * u * 1.1} opacity={ground}>
            <text x={cx - groundLen} y={groundY - 22 * u} fill={C.tape}>
              {fmtMoney(account)}
            </text>
            <text x={xl - 26 * u} y={groundY + depth / 2 + fsBig * 0.35 + 44 * u} fill={C.mist} textAnchor="end" opacity={clamp(dig * 3)}>
              {fmtMoney(-account * L * clamp(dig))}
            </text>
            <text x={xr + 26 * u} y={groundY + depth / 2 + fsBig * 0.35 + 44 * u} fill={C.mist} textAnchor="start" opacity={clamp(climb * 3)}>
              {`+${fmtMoney(account * L)}`}
            </text>
            {showBedrock && remaining !== null ? (
              <text x={xr + 26 * u} y={floorY + (groundY + bedrockDepth - floorY) / 2 + 12 * u} fill={C.tape} textAnchor="start" opacity={clamp(dig * 2 - 1)}>
                {`${fmtMoney(remaining)} left`}
              </text>
            ) : null}
          </g>
        ) : null}
        {note ? (
          <text x={cx} y={h - 12 * u} fill={C.mist} fontFamily={FONT.body} fontSize={SIZE.caption * u * 0.62} textAnchor="middle" opacity={clamp(climb * 2 - 1)}>
            {note}
          </text>
        ) : null}
      </svg>
      {showTable ? (
        <div style={{ position: "absolute", left: w - tableW, top: groundY - 10 * u, width: tableW, fontFamily: FONT.mono, fontSize: SIZE.label * u * 1.05 }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: C.mist, fontSize: SIZE.tape * u * 0.95, letterSpacing: "0.12em", paddingBottom: 12 * u, borderBottom: `${2 * u}px solid ${C.blueline}` }}>
            <span>LOSS</span>
            <span>TO GET BACK</span>
          </div>
          {rows.map((row, i) => {
            const on = row === active;
            const appear = enter ? prog(frame, fps, 0.2 + i * 0.12, 0.3) : 1;
            return (
              <div key={row.r} style={{ display: "flex", justifyContent: "space-between", padding: `${12 * u}px 0`, borderBottom: `${1 * u}px solid ${hexA(C.blueline, 0.5)}`, opacity: appear * (on ? 1 : 0.55), color: C.tape, fontWeight: on ? 600 : 400 }}>
                <span style={{ color: on ? C.ember : C.tape }}>{fmtPct(-row.r, 0)}</span>
                <span>{fmtPct(row.g, 0)}</span>
              </div>
            );
          })}
        </div>
      ) : null}
      {sfx && enter && !sweeping ? (
        <>
          <Sfx name="dig" at={digAt} />
          <Sfx name="rise" at={climbAt} />
        </>
      ) : null}
    </div>
  );
};
