// QA: the song sampler. One card per song (scripts/sound/sampler.py): key, tempo, groove, the chord loop and a piano
// roll of the 8-bar hook with a playhead, then the sonic logo drawing the mark. Lets the founder SEE why songs differ.
import React from "react";
import { Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE, hexA } from "../tokens";
import { prog } from "../lib/anim";
import { Mark } from "../components/brand/Mark";
import { Paper, TapeStrip } from "../components/brand";
import { MonoLabel } from "../components/layout/cards";
import { useLayout } from "../components/layout/layout";
import sampler from "../samples/sampler.json";

interface Note { bar: number; step: number; len: number; semis: number; breakout: boolean }
interface Seg {
  t: number;
  dur: number;
  label: string;
  beat: number;
  form: string[];
  melody: Note[];
  logo: Note[];
  bars: { m: number; logo: number | null; chord: string; melody: boolean; ci: number | null }[];
  song: { id: string; key: string; bpm: number; genre: string; groove: string; progression: string[]; lead: string; bass: string; arp: string };
}
const DATA = sampler as unknown as { duration_s: number; vertex_beats: number[]; segments: Seg[] };
export const samplerFrames = (fps: number) => Math.ceil(DATA.duration_s * fps);

/** Piano roll: 8 bars of 16ths; notes hollow Tape, the sounding note Sodium, breakout notes carry a tick. */
const Roll: React.FC<{ notes: Note[]; bars: number; w: number; h: number; pos: number | null; labels?: string[]; hot?: string }> = ({ notes, bars, w, h, pos, labels, hot = C.sodium }) => {
  const { u } = useLayout();
  const lo = Math.min(...notes.map((n) => n.semis)) - 1;
  const hi = Math.max(...notes.map((n) => n.semis)) + 1;
  const sx = w / (bars * 16);
  const sy = h / (hi - lo + 1);
  const y = (s: number) => (hi - s) * sy;
  return (
    <svg width={w} height={h + 40 * u} style={{ overflow: "visible" }}>
      {Array.from({ length: bars * 16 + 1 }, (_, i) => (
        <line key={i} x1={i * sx} x2={i * sx} y1={0} y2={h} stroke={C.blueline} strokeWidth={i % 16 === 0 ? 2 * u : 1} opacity={i % 16 === 0 ? 0.9 : i % 4 === 0 ? 0.35 : 0.12} />
      ))}
      {labels?.map((l, i) => (
        <text key={i} x={i * 32 * sx + 6 * u} y={h + 30 * u} fill={C.mist} fontFamily={FONT.mono} fontWeight={600} fontSize={20 * u} letterSpacing="0.12em">
          {l}
        </text>
      ))}
      {notes.map((n, i) => {
        const x0 = (n.bar * 16 + n.step) * sx;
        const nw = n.len * sx - 3 * u;
        const on = pos !== null && pos >= n.bar * 16 + n.step && pos < n.bar * 16 + n.step + n.len;
        return (
          <g key={i}>
            <rect x={x0} y={y(n.semis) + 2 * u} width={nw} height={sy - 4 * u} rx={4 * u} fill={on ? hot : hexA(C.tape, 0.12)} stroke={on ? hot : C.tape} strokeWidth={2 * u} />
            {n.breakout ? <path d={`M${x0 + 4 * u} ${y(n.semis) - 4 * u}l${8 * u} ${-10 * u}l${8 * u} ${10 * u}`} stroke={on ? hot : C.tape} strokeWidth={2.5 * u} fill="none" /> : null}
          </g>
        );
      })}
      {pos !== null ? <line x1={pos * sx} x2={pos * sx} y1={-8 * u} y2={h + 8 * u} stroke={C.tape} strokeWidth={2 * u} /> : null}
    </svg>
  );
};

/** What this song changed against the one before it (the song memory's rules, made visible). */
const Changes: React.FC<{ seg: Seg; prev: Seg | null; top: number }> = ({ seg, prev, top }) => {
  const { u, stage } = useLayout();
  const s = seg.song;
  const rows: [string, string][] = prev
    ? [
        ["key", `${prev.song.key} → ${s.key}`],
        ["tempo", `${prev.song.bpm.toFixed(1)} → ${s.bpm.toFixed(1)} BPM`],
        ["chords", `${prev.song.progression.join(" ")} → ${s.progression.join(" ")}`],
        ["sound", `${prev.song.lead} lead → ${s.lead} lead`],
      ]
    : [
        ["first song", "its opening phrase is the sonic logo"],
        ["rule", "every later song must differ from it"],
      ];
  return (
    <div style={{ position: "absolute", left: stage.x, top, width: stage.w }}>
      <MonoLabel style={{ marginBottom: 16 * u }} color={C.tape}>{prev ? "Changed from the song before" : "The reference"}</MonoLabel>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: 24 * u, fontFamily: FONT.mono, fontSize: 26 * u, lineHeight: 1.65, color: C.mist }}>
          <span style={{ width: 210 * u, textTransform: "uppercase", letterSpacing: "0.12em" }}>{k}</span>
          <span style={{ color: C.tape }}>{v}</span>
        </div>
      ))}
    </div>
  );
};

const SongCard: React.FC<{ seg: Seg; index: number; total: number }> = ({ seg, index, total }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { W, u, stage } = useLayout();
  const t = frame / fps;
  const bar = seg.beat * 4;
  const k = Math.min(seg.bars.length - 1, Math.floor(t / bar));
  const b = seg.bars[k];
  const step = ((t - k * bar) / bar) * 16;
  const inLogo = b.logo !== null;
  const logoStart = seg.bars.findIndex((x) => x.logo === 0) * bar;
  const s = seg.song;
  const fin = prog(frame, fps, 0, 0.3);
  const rollW = stage.w;
  const chordAt = seg.song.progression;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: fin }}>
      <TapeStrip text={`SONG ${String(index + 1).padStart(2, "0")} OF ${String(total).padStart(2, "0")}   ${seg.label.toUpperCase()}`} inAt={0} />
      <div style={{ position: "absolute", left: stage.x, top: stage.y, width: stage.w }}>
        <MonoLabel>{`${s.genre} · ${s.bpm.toFixed(1)} BPM · ${s.groove} groove`}</MonoLabel>
        <div style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: SIZE.hero * u, color: C.tape, lineHeight: 0.95, marginTop: 14 * u, textTransform: "uppercase" }}>{s.key}</div>
        <div style={{ display: "flex", gap: 14 * u, marginTop: 26 * u }}>
          {chordAt.map((c, i) => {
            const on = b.ci === i;
            return (
              <div key={i} style={{ fontFamily: FONT.mono, fontWeight: 600, fontSize: 30 * u, color: C.tape, padding: `${10 * u}px ${18 * u}px`, border: `${2 * u}px solid ${on ? C.tape : C.blueline}`, background: on ? hexA(C.tape, 0.14) : "transparent", minWidth: 70 * u, textAlign: "center" }}>
                {c}
              </div>
            );
          })}
        </div>
        <MonoLabel style={{ marginTop: 26 * u }} color={C.mist}>{`lead ${s.lead} · bass ${s.bass} · arp ${s.arp}`}</MonoLabel>
        <div style={{ marginTop: 56 * u }}>
          <MonoLabel style={{ marginBottom: 18 * u }} color={C.tape}>{inLogo ? "The sonic logo · same on every Lore" : "The hook · 8 bars"}</MonoLabel>
          {inLogo ? (
            <Roll notes={seg.logo} bars={2} w={rollW} h={300 * u} pos={b.logo! * 16 + step} hot={C.tape} />
          ) : (
            <Roll notes={seg.melody} bars={8} w={rollW} h={300 * u} pos={b.melody ? b.m * 16 + step : null} labels={seg.form} />
          )}
        </div>
      </div>
      {!inLogo ? <Changes seg={seg} prev={index > 0 ? DATA.segments[index - 1] : null} top={stage.y + 860 * u} /> : null}
      {inLogo ? (
        <div style={{ position: "absolute", left: (W - 300 * u) / 2, top: stage.y + 830 * u }}>
          <Sequence from={Math.round(logoStart * fps)} layout="none">
            <Mark size={300 * u} drawAt={0} vertexAt={DATA.vertex_beats.map((x) => x * seg.beat)} />
          </Sequence>
        </div>
      ) : null}
    </div>
  );
};

export const SongSampler: React.FC = () => {
  const { fps } = useVideoConfig();
  const n = DATA.segments.length;
  return (
    <Paper>
      <Audio src={staticFile("score/sampler.wav")} />
      {DATA.segments.map((seg, i) => (
        <Sequence key={i} from={Math.round(seg.t * fps)} durationInFrames={Math.round(seg.dur * fps)} name={seg.song.id}>
          <SongCard seg={seg} index={i} total={n} />
        </Sequence>
      ))}
    </Paper>
  );
};
