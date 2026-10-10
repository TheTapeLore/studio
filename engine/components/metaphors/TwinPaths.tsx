import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, TYPE, hexA } from "../../tokens";
import { clamp, fmtPct, prog } from "../../lib/anim";
import { useEpisode } from "../../lib/useEpisode";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";

export interface TwinPathsProps {
  /** sim.json key holding {paths: {k: equity[]}, maxdd: {k}, final: {k}} (sims/risk_per_trade.py `twin`). */
  simKey?: string;
  /** Which two sizes, in drawing order (first = calm, second = loud), with their labels. */
  lines?: { key: string; label: string }[];
  startAt?: number;
  dur?: number;
  /** Seconds: the deepest drop of each line gets its marker and label. */
  ddAt?: number;
  /** Seconds: the end values appear. */
  finalAt?: number;
  label?: string;
  /** Data override (gallery/demo); default: sim.json[simKey]. */
  twin?: { paths: Record<string, number[]>; maxdd: Record<string, number>; final: Record<string, number> };
}

/**
 * The same trades in the same order, sized two ways. Both equity lines draw together; each line's drawdowns (how far
 * it sits below its own best point so far) are shaded Ember under it, so the only difference on screen is the size.
 */
export const TwinPaths: React.FC<TwinPathsProps> = ({
  simKey = "twin",
  lines = [{ key: "0.5pct", label: "RISK 0.5% A TRADE" }, { key: "2pct", label: "RISK 2% A TRADE" }],
  startAt = 0.2,
  dur = 5,
  ddAt,
  finalAt,
  label = "ONE SIMULATED RUN · SAME 200 TRADES",
  twin: twinProp,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const ep = useEpisode();
  const twin = twinProp ?? (ep?.sim as Record<string, { paths: Record<string, number[]>; maxdd: Record<string, number>; final: Record<string, number> }> | undefined)?.[simKey];
  if (!twin) return null;
  const P = lines.map((l) => twin.paths[l.key]);
  const n = P[0].length;
  const all = P.flat();
  const lo = Math.min(...all, 1) * 0.97, hi = Math.max(...all) * 1.03;
  const fs = SIZE.tape * u;
  const pad = { l: 90 * u, r: 20 * u, t: 70 * u, b: 50 * u };
  const plotTop = pad.t + 168 * u;
  const X = (i: number) => pad.l + ((w - pad.l - pad.r) * i) / (n - 1);
  const Y = (v: number) => plotTop + (h - plotTop - pad.b) * (1 - (v - lo) / (hi - lo));
  const p = clamp((frame / fps - startAt) / dur);
  const vis = Math.max(2, Math.ceil(p * n));
  const dd = ddAt === undefined ? 1 : prog(frame, fps, ddAt, 0.4);
  const fin = finalAt === undefined ? 0 : prog(frame, fps, finalAt, 0.4);
  const colors = [C.mist, C.tape];
  const widths = [4 * u, 6 * u];
  const ticks = [1, ...[0.5, 1.5, 2, 2.5, 3].filter((v) => v > lo && v < hi)];
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <text x={0} y={30 * u} fill={C.mist} fontFamily={FONT.mono} fontWeight={600} fontSize={fs} letterSpacing={TYPE.mono.tracking}>
        {label}
      </text>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={w - pad.r} y1={Y(v)} y2={Y(v)} stroke={hexA(C.blueline, v === 1 ? 0.9 : 0.45)} strokeWidth={(v === 1 ? 2 : 1) * u} strokeDasharray={v === 1 ? undefined : `${6 * u} ${8 * u}`} />
          <text x={pad.l - 14 * u} y={Y(v) + fs * 0.35} fill={C.mist} fontFamily={FONT.mono} fontSize={fs * 0.9} textAnchor="end">
            {v === 1 ? "START" : fmtPct(v - 1)}
          </text>
        </g>
      ))}
      <text x={w - pad.r} y={h - 8 * u} fill={C.mist} fontFamily={FONT.mono} fontSize={fs * 0.9} textAnchor="end">
        {`TRADE ${Math.round(((vis - 1) / (n - 1)) * (n - 1))} OF ${n - 1}`}
      </text>
      {P.map((path, li) => {
        // underwater shading: between the running peak and the line
        let peak = path[0];
        const top: string[] = [], bot: string[] = [];
        for (let i = 0; i < vis; i++) {
          peak = Math.max(peak, path[i]);
          top.push(`${X(i).toFixed(1)},${Y(peak).toFixed(1)}`);
          bot.push(`${X(i).toFixed(1)},${Y(path[i]).toFixed(1)}`);
        }
        const area = `M${top.join(" L")} L${bot.reverse().join(" L")} Z`;
        return <path key={`a${li}`} d={area} fill={hexA(C.ember, li === 1 ? 0.32 : 0.22)} />;
      })}
      {P.map((path, li) => (
        <polyline key={li} points={path.slice(0, vis).map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")} fill="none" stroke={colors[li]} strokeWidth={widths[li]} strokeLinejoin="round" />
      ))}
      {P.map((path, li) => {
        // deepest drop marker
        let peak = path[0], worst = 0, wi = 0, pi = 0, best = 0;
        for (let i = 0; i < n; i++) {
          if (path[i] > peak) { peak = path[i]; best = i; }
          const d = path[i] / peak - 1;
          if (d < worst) { worst = d; wi = i; pi = best; }
        }
        if (wi >= vis || dd <= 0) return null;
        const x = X(wi), y = Y(path[wi]);
        return (
          <g key={`d${li}`} opacity={dd}>
            <line x1={x} x2={x} y1={Y(path[pi] ?? path[wi])} y2={y} stroke={C.ember} strokeWidth={3 * u} strokeDasharray={`${5 * u} ${5 * u}`} />
            <circle cx={x} cy={y} r={9 * u} fill={C.ember} />
          </g>
        );
      })}
      {P.map((path, li) => {
        const x = X(vis - 1), y = Y(path[vis - 1]);
        return (
          <g key={`l${li}`}>
            <circle cx={x} cy={y} r={(li === 1 ? 9 : 7) * u} fill={colors[li]} />
          </g>
        );
      })}
      {/* legend: which line is which, its worst drop (Ember, once the markers land) and where it ended */}
      {lines.map((l, li) => {
        const ly = pad.t + (34 + li * 86) * u;
        return (
          <g key={`g${li}`}>
            <line x1={pad.l + 10 * u} x2={pad.l + 46 * u} y1={ly - fs * 0.35} y2={ly - fs * 0.35} stroke={colors[li]} strokeWidth={widths[li]} />
            <text x={pad.l + 60 * u} y={ly} fill={colors[li]} fontFamily={FONT.mono} fontWeight={600} fontSize={fs}>
              {l.label}
            </text>
            <text x={pad.l + 60 * u + fs * 14} y={ly + fs * 0.25} fill={C.ember} fontFamily={FONT.display} fontWeight={900} fontSize={SIZE.label * u * 1.35} opacity={dd}>
              {`${fmtPct(twin.maxdd[l.key], 0)} AT WORST`}
            </text>
            {fin > 0 ? (
              <text x={pad.l + 60 * u + fs * 14} y={ly + 30 * u} fill={colors[li]} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 0.95} opacity={fin}>
                {`ENDED ${fmtPct(twin.final[l.key], 0)}`}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
};
