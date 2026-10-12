import React from "react";
import { C, FONT, SIZE, hexA } from "../../tokens";
import { clamp } from "../../lib/anim";
import { Bar } from "../../lib/spec";
import { useChart } from "./ChartContext";

export interface DistributionSpec {
  /** A close at least this far down from the prior close (0.002 = 0.2%)... */
  minDrop?: number;
  /** ...on higher volume than the prior session. Each one counts for `window` sessions... */
  window?: number;
  /** ...unless the index closes this far above that day's close first (0.05 = 5%), which removes it early. */
  rally?: number;
  /** Count badge text before the number. */
  label?: string;
  /** Count at which the badge turns to a warning (Ember). */
  warnAt?: number;
  /** Mark only days on/after this date (earlier ones still count). */
  from?: string;
}

/** Every distribution day in `bars` (index list), by the rule above. */
export const distributionDays = (bars: Bar[], minDrop = 0.002) => {
  const out: number[] = [];
  for (let i = 1; i < bars.length; i++) if (bars[i].c / bars[i - 1].c - 1 <= -minDrop && bars[i].v > bars[i - 1].v) out.push(i);
  return out;
};

/** The days still counting on bar j: inside the window and not yet erased by a `rally` close above them. */
export const liveDistribution = (bars: Bar[], days: number[], j: number, window = 25, rally = 0.05) =>
  days.filter((i) => {
    if (i > j || i <= j - window) return false;
    for (let k = i + 1; k <= j; k++) if (bars[k].c >= bars[i].c * (1 + rally)) return false;
    return true;
  });

/**
 * Distribution days, computed from the index's own closes and volume (never placed by hand): each one gets an Ember
 * mark under its bar and a ring on its volume bar as it appears; days that age out of the window (or are erased by a
 * rally) dim to Mist. The badge counts the days still live on the newest visible bar.
 */
export const DistributionDays: React.FC<DistributionSpec> = ({
  minDrop = 0.002,
  window = 25,
  rally = 0.05,
  label = "DISTRIBUTION DAYS, LAST 25 SESSIONS",
  warnAt = 5,
  from,
}) => {
  const s = useChart();
  const { bars, start, u } = s;
  const days = distributionDays(bars, minDrop);
  const vis = Math.min(s.end, Math.ceil(s.reveal));
  const head = Math.max(start, vis - 1);
  const live = new Set(liveDistribution(bars, days, head, window, rally));
  const fs = SIZE.tape * u;
  const marks = days.filter((i) => i >= start && i < vis && (!from || bars[i].t >= from));
  const n = live.size;
  const warn = n >= warnAt;
  const tri = 13 * u;
  return (
    <g>
      {marks.map((i) => {
        const on = live.has(i);
        const a = clamp(s.reveal - i);
        const x = s.x(i);
        const y = s.y(bars[i].l) + 16 * u;
        const col = on ? C.ember : hexA(C.mist, 0.55);
        return (
          <g key={i} opacity={a}>
            <path d={`M${x - tri * 0.6},${y} L${x + tri * 0.6},${y} L${x},${y + tri} Z`} fill={col} />
            {s.vol ? (
              <rect x={x - s.bodyW / 2 - 3 * u} y={s.vol.y} width={s.bodyW + 6 * u} height={s.vol.h} fill="none" stroke={col} strokeWidth={2 * u} opacity={on ? 0.9 : 0.4} />
            ) : null}
          </g>
        );
      })}
      <g>
        <text x={s.plot.x} y={s.plot.y + 60 * u} fill={C.mist} fontFamily={FONT.mono} fontWeight={600} fontSize={fs * 0.9} letterSpacing="0.06em">
          {label}
        </text>
        <text x={s.plot.x} y={s.plot.y + 60 * u + SIZE.h2 * u * 1.0} fill={warn ? C.ember : C.tape} fontFamily={FONT.display} fontWeight={900} fontSize={SIZE.h2 * u}>
          {String(n)}
        </text>
      </g>
    </g>
  );
};
