import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, MA_COLOR, SIZE, hexA } from "../../tokens";
import { clamp, prog } from "../../lib/anim";
import { simBars, sma } from "../../lib/finance";
import { Bar } from "../../lib/spec";
import { useEpisode } from "../../lib/useEpisode";
import { useLayout } from "../layout/layout";
import { useStage } from "../layout/Stage";
import { CandleChart } from "../charts/CandleChart";
import { useChart } from "../charts/ChartContext";

export type ExitRule =
  | { kind: "ma"; n: number; label?: string }
  | { kind: "trail"; pct: number; label?: string }
  | { kind: "target"; r: number; label?: string }
  | { kind: "time"; bars: number; label?: string }
  | { kind: "stop"; label?: string };

export interface FiveExitsProps {
  bars?: Bar[];
  entry?: number;
  /** Initial stop price (defines 1R). Default: 7% under the entry close. */
  stop?: number;
  rules?: ExitRule[];
  revealSpeed?: number;
  seed?: number;
}

const DEFAULT_RULES: ExitRule[] = [
  { kind: "target", r: 3, label: "Fixed 3R target" },
  { kind: "trail", pct: 0.1, label: "10% trailing stop" },
  { kind: "ma", n: 10, label: "Close under 10-day" },
  { kind: "ma", n: 21, label: "Close under 21-day" },
  { kind: "ma", n: 50, label: "Close under 50-day" },
];
const RULE_COLORS = [C.sodium, C.tape, MA_COLOR["10"], MA_COLOR["21"], MA_COLOR["50"]];

export interface ExitResult { rule: ExitRule; idx: number; price: number; r: number; line: (number | null)[] }

/** Walk the bars after entry; each rule exits on its own condition (close-based, next-bar-free for clarity). */
export const computeExits = (bars: Bar[], entry: number, stop: number, rules: ExitRule[]): ExitResult[] => {
  const closes = bars.map((b) => b.c);
  const ep = bars[entry].c;
  const R = ep - stop;
  return rules.map((rule) => {
    const line: (number | null)[] = bars.map(() => null);
    const m = rule.kind === "ma" ? sma(closes, rule.n) : null;
    let hiC = ep;
    for (let i = entry + 1; i < bars.length; i++) {
      const b = bars[i];
      hiC = Math.max(hiC, b.c);
      if (b.l <= stop) return { rule, idx: i, price: stop, r: -1, line };
      if (rule.kind === "ma" && m) {
        line[i] = m[i];
        if (b.c < m[i]) return { rule, idx: i, price: b.c, r: (b.c - ep) / R, line };
      } else if (rule.kind === "trail") {
        const lvl = hiC * (1 - rule.pct);
        line[i] = lvl;
        if (b.c < lvl) return { rule, idx: i, price: b.c, r: (b.c - ep) / R, line };
      } else if (rule.kind === "target") {
        const tgt = ep + rule.r * R;
        line[i] = tgt;
        if (b.h >= tgt) return { rule, idx: i, price: tgt, r: rule.r, line };
      } else if (rule.kind === "time" && i - entry >= rule.bars) return { rule, idx: i, price: b.c, r: (b.c - ep) / R, line };
    }
    const last = bars.length - 1;
    return { rule, idx: last, price: bars[last].c, r: (bars[last].c - ep) / R, line };
  });
};

const ExitLines: React.FC<{ results: ExitResult[]; entry: number }> = ({ results, entry }) => {
  const s = useChart();
  const vis = Math.min(s.end, Math.ceil(s.reveal));
  return (
    <g>
      {results.map((res, k) => {
        const pts: string[] = [];
        for (let i = entry + 1; i < Math.min(vis, res.idx + 1); i++) {
          const v = res.line[i];
          if (v !== null && v !== undefined && !Number.isNaN(v)) pts.push(`${pts.length ? "L" : "M"}${s.x(i).toFixed(1)},${s.y(v).toFixed(1)}`);
        }
        const done = s.reveal > res.idx;
        return (
          <g key={k}>
            {pts.length > 1 ? <path d={pts.join("")} fill="none" stroke={RULE_COLORS[k % RULE_COLORS.length]} strokeWidth={2.6 * s.u} strokeDasharray={res.rule.kind === "trail" ? `${8 * s.u} ${6 * s.u}` : undefined} opacity={0.9} /> : null}
            {done ? <circle cx={s.x(res.idx)} cy={s.y(res.price)} r={10 * s.u} fill={hexA(C.abyss, 0.9)} stroke={RULE_COLORS[k % RULE_COLORS.length]} strokeWidth={4 * s.u} /> : null}
          </g>
        );
      })}
      <line x1={s.x(entry)} x2={s.x(entry)} y1={s.plot.y} y2={s.plot.y + s.plot.h} stroke={hexA(C.mist, 0.5)} strokeWidth={2 * s.u} strokeDasharray={`${4 * s.u} ${6 * s.u}`} />
    </g>
  );
};

/** Exits metaphor "Same winner, five exits": one run, five exit rules at once; the rule decides how much trend you keep. */
export const FiveExits: React.FC<FiveExitsProps> = ({ bars, entry, stop, rules = DEFAULT_RULES, revealSpeed = 22, seed = 21 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const { w, h } = useStage();
  const ep = useEpisode();
  const B = bars ?? ep?.data?.bars ?? simBars(150, seed, 40, 0.005, 0.011);
  const e = entry ?? Math.min(60, Math.floor(B.length * 0.35));
  const st = stop ?? B[e].c * 0.93;
  const res = computeExits(B, e, st, rules);
  const tableH = (rules.length * 46 + 20) * u;
  const revealDur = (B.length - e) / revealSpeed;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h - tableH - 20 * u }}>
        <CandleChart bars={B} revealFrom={e} revealAt={0.3} revealDur={revealDur} w={w} h={h - tableH - 20 * u} volume={false}>
          <ExitLines results={res} entry={e} />
        </CandleChart>
      </div>
      <div style={{ position: "absolute", left: 0, top: h - tableH, width: w, fontFamily: FONT.mono, fontSize: SIZE.label * u * 0.9 }}>
        {res.map((r, k) => {
          const t = clamp((frame / fps - 0.3) / revealDur) * (B.length - e) + e;
          const done = t > r.idx;
          const a = done ? prog(frame, fps, 0.3 + ((r.idx - e) / (B.length - e)) * revealDur, 0.3) : 0;
          return (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 46 * u, borderBottom: `${1 * u}px solid ${hexA(C.blueline, 0.6)}` }}>
              <span style={{ display: "flex", alignItems: "center", gap: 16 * u, color: C.tape }}>
                <span style={{ width: 26 * u, height: 6 * u, background: RULE_COLORS[k % RULE_COLORS.length], borderRadius: 3 * u }} />
                {r.rule.label ?? r.rule.kind}
              </span>
              <span style={{ color: r.r >= 0 ? C.lichen : C.ember, fontWeight: 600, opacity: a }}>{`${r.r >= 0 ? "+" : "−"}${Math.abs(r.r).toFixed(1)}R`}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
