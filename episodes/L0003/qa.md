# QA — L0003 R: the only unit a trader needs

Batch 2026-10-09-b · anatomy · risk/r-multiples · 58.0 s (29 bars) · 4x5 + 9x16
Song: Bb dorian, 120 BPM melodic house (four-ghost), i III IV VII, supersaw lead (song memory: max hook similarity
0.43 vs Lore 002; key, mode, progression, lead and groove all differ from the last songs).

## Pre-render
- `spec_lint.py`: PASS (caption timing, voice check, bar grid, end card 3 bars, sources, seeded sim). `registry.py check`: PASS.
- `validate_publish.py`: PASS (X 267/280, reply 227, YouTube title 55 chars, voice check, disclaimer, 5 hashtags).
- Stills viewed (every beat, both aspects, thumbnail, cover). Fixed before the full render:
  - RRuler: the ENTRY label sat under the price line (moved to the right end, above the line); the stop-out ghost's
    "−1R · −$100" sat on the stop line (moved under it); smoothstep easing between keyframes drew S-shaped wiggles on
    the climb (now linear, reads as a price line).
  - RTower: 20 blocks were slot-bound and the tower used a quarter of the stage (blocks may now be taller than wide);
    the dollar conversions collided with the tower label (shorter labels, two clean rows).
- New components: RCompare, RRuler (gallery entries added), RTower rebuilt to read sim.json; score interpreters
  for all three.

## Truth (recomputed)
| On screen | Computed | Source |
|---|---|---|
| $500 on $100 risk = +5R; on $2,000 = +0.25R | 500/100 = 5; 500/2000 = 0.25 | R definition (LuxAlgo; Tharp) |
| 1R = ($50 − $48) × 50 = $100 | 2 × 50 = 100 | arithmetic |
| $58 is +4R, +$400 | (58 − 50)/2 = 4; 4 × 100 | arithmetic |
| Stopped out: −1R, −$100 | −2 × 50 | arithmetic |
| 20 simulated trades, every loser −1R, total +3.5R, winners 40% | sim.json: 8 winners, 12 losers all −1.0, sum 3.5 | sims/r_multiples.py seed 3 |
| The sequence is typical, not lucky | first sequence within 1R of the 100,000-run median (+4R) with the model's 40% win rate | sim meta |
| +$350 at 1R = $100; +$35,000 at 1R = $10,000 | 3.5 × 100; 3.5 × 10,000 | arithmetic |
| "Lost $300" with 1R = $100 is −3R | 300/100 | arithmetic |
| A loss past −1R = moved stop or a gap | stop orders become market orders and can fill below the stop (FINRA, SEC) | sources |

## Compliance
- Education only; no tickers, levels or calls. The price path is a labelled example (entry $50, stop $48), not data.
- Rule 8: "SIMULATED · SEED 3" on the tape for the whole video, "20 SIMULATED TRADES" on the tower.
- Rule 4: no performance claims; the dollar figures are unit conversions of a simulated total.
- Rule 6: sources in the spec (R definition, Tharp credit, FINRA + SEC on stop fills, the sim). Rule 7: disclaimer in
  IG + YouTube. Rule 9: song and cues generated.
- Voice: hook = feeling + number ("Proud? Depends what you risked."); jokes tied to the lesson ("Your stop was more of
  a suggestion."). voice_check PASS.

## Pass 1 (full render 4x5)
- Frames every 2 s + beat boundaries viewed (contact sheets). Audio −14.1 LUFS, −1.8 dBFS peak.
- Music cue sheet: drop on the R readouts (2.0 s), half-time set-up while 1R is defined, build into the +4R landing
  (drop at 20.0 s, the bar where the price reaches $58), short fall on the stop-out ghost, build into the tower total
  (28.0 s), myth breakdown, chorus on the rule, sonic logo with the snap on its breakout note (54.0 s).
- Found: frame 0 nearly empty (the +$500 bars grew from zero); the 1R zone appeared 1 s after its caption.
  Fix: bars are up from frame 0 (barsAt −0.5, rulers from 0.3 s); zone at 0.4 s. Re-rendered.

## Pass 2 (full re-render 4x5 + 9x16)
1. Truth: PASS (table above, every number re-read on screen). 2. Compliance: PASS. 3. Clarity: PASS (one idea, a
   muted viewer gets the ruler from the picture). 4. Brand: PASS (Sodium once per frame: the R readout / the tower
   total / the −3R / "R" in the rule; TapeStrip in/out; logo + snap on the end card in Bb). 5. Craft: frame 0 now
   carries the payoff (+$500 bars); captions timed; safe zones in both aspects.
   Audio: the first encode measured −0.99 dBTP true peak (AAC overshoot on the supersaw lead), a hair over the
   −1 dBTP rule. Fix in the master bus (scripts/render_batch.mjs): it now measures the encoded true peak and, when it is
   above −1.5 dBTP, pulls the limiter down by the excess and encodes again. Re-render: −14.1 LUFS, −2.32 dBTP
   (limiter −4.7 dBFS). The Release renders run the same script. 6. Distinct: PASS (first R-multiples entry, new
   metaphors RCompare and RRuler).
**Result: qa_passed after 2 passes.**

## Clarity (gate added 2026-10-09; read again muted, as a first-time viewer)
- Learn 1, "R is what you lose if your stop is hit": beat 2 says it in those words and draws the entry-to-stop zone
  labelled 1R = $100.
- Learn 2, "results in R show how good a trade was": the hook (+5R vs +0.25R on the same $500) and beat 3 (+4R at $58).
- Learn 3, "every loss should be about −1R": beat 3 ("Stopped out instead? −1R. Every time."), the tower (every loser the
  same block) and the myth card (−3R means the stop moved or price gapped).
- Jargon: R is defined on screen (glossary). No studio words. One soft spot noted: the hook shows "+5R" 8 s before R is
  defined; kept, because the contrast is the hook and the definition follows at once.
- First-time viewer restatement: "R is how much I'd lose if my stop hits; I should count every result in those units."
**Clarity: PASS.**
