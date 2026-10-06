// Caption rules (CLAUDE.md): max 12 words per card; on screen >= 0.35 s/word + 0.8 s.
import { Beat } from "../../lib/spec";

export const MAX_WORDS = 12;
export const wordCount = (s: string) => s.replace(/\*\*/g, "").trim().split(/\s+/).filter(Boolean).length;
export const minCaptionSeconds = (s: string) => 0.35 * wordCount(s) + 0.8;

export interface CaptionCue { text: string; start: number; dur: number }

/** Turn beats into caption cues. `captions[]` share their beat in proportion to each card's minimum time. */
export const captionCues = (beats: Beat[]): CaptionCue[] => {
  const out: CaptionCue[] = [];
  for (const b of beats) {
    const cards = b.captions?.length ? b.captions : b.caption ? [b.caption] : [];
    if (!cards.length) continue;
    const need = cards.map(minCaptionSeconds);
    const total = need.reduce((a, c) => a + c, 0);
    let t = b.t;
    cards.forEach((text, i) => {
      const dur = (b.dur * need[i]) / total;
      out.push({ text, start: t, dur });
      t += dur;
    });
  }
  return out;
};

export const captionProblems = (beats: Beat[]) =>
  captionCues(beats).flatMap((c) => {
    const p: string[] = [];
    if (wordCount(c.text) > MAX_WORDS) p.push(`"${c.text}" has ${wordCount(c.text)} words (max ${MAX_WORDS})`);
    if (c.dur + 1e-6 < minCaptionSeconds(c.text)) p.push(`"${c.text}" shows ${c.dur.toFixed(2)}s, needs ${minCaptionSeconds(c.text).toFixed(2)}s`);
    return p;
  });
