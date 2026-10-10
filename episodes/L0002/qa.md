# QA — L0002 35% winners can beat 60% winners

Batch 2026-10-09-a · whatif (What If Lab) · risk/expectancy · 61.6 s (33 bars) · 4x5 + 9x16
Song: E dorian, 128.6 BPM melodic house (four-broken), i v VII IV, square lead (song memory: max hook similarity 0.35
vs Lore 001; different key, mode, tempo, progression, lead and groove).

## Pre-render
- `spec_lint.py`: PASS (caption timing, voice check, bar grid, end card ≥ 2 bars + 1 s, whatif assumptions beat,
  simulation seeded, sources). `registry.py check`: PASS (nearest: L0001 at 0.01).
- `validate_publish.py`: PASS (X 249/280 chars, reply 233, YouTube title 58 chars, voice check, disclaimer).
- Stills viewed (both aspects, every beat, thumbnail, cover). Fixed before the full render:
  - a minus sign wrapping away from its number ("−" / "$200"): signs are now glued with a word joiner engine-wide;
  - the math card headline wrapping in the middle of "−$20": now "−$20 vs +$40." with the formulas below;
  - Distribution labels colliding (median and worst 5%), then the median label clipping the left edge: labels now
    point away from each other and flip sides instead of leaving the chart; bars sit under the labels;
  - assumption lines leaving orphans ("seed / 7"): pretty wrapping;
  - the thumbnail had two Sodium highlights (headline + the +$800 total): headline plain, the total keeps it;
  - the math card caption repeated the card: now "Right loses $20 a trade. Wrong makes $40.";
  - music: sections started one bar early (spec times rounded to 4 decimals sat just under the bar line): score.py
    bar lookup is tolerant; dorian's "darker" chord was its bright major IV: the dorian depth ladder now borrows
    iv / bVI / bII from minor. Lore 001's score is still byte-identical.

## Truth (every number recomputed from episodes/L0002/sim.json, seed 7)
| On screen | Computed | Check |
|---|---|---|
| Duel: Mostly Right wins 60%, Mostly Wrong 35% | 12/20 and 7/20 winners | sim `duel` |
| "Mostly Wrong loses 13 of 20" | 13 losers | sim `duel` |
| Totals −$400 vs +$800; "finishes $1,200 ahead" | 12×100 − 8×200 = −400; 7×300 − 13×100 = 800; gap 1,200 | arithmetic |
| Mostly Wrong takes the lead (Sodium + drop) | trade 16 for good; its low point −$600 at trade 14 | sim `duel` |
| Mostly Right median −20%, "only 8% of runs end up" | median final −0.20; share up 0.084 | 1,000 runs |
| Mostly Wrong median +40%, "97% of runs end up" | median final +0.40; share up 0.972 | 1,000 runs |
| Fan labels (median, worst 5%) | full-population paths `runs_*_median` / `_tail5` (−20% / −44%, +40% / +8%) | not just the 60 drawn |
| −$20 vs +$40 per trade | 0.6×100 − 0.4×200 = −20; 0.35×300 − 0.65×100 = 40 | TradeZella, Heygotrade formula |
| "usual worst streak: 9 losses"; worst 5% 14 | median longest losing streak 9; 95th percentile 14 | 1,000 runs |

## Compliance
- Education only; no calls, levels, tickers or live setups. No price data (simulation only).
- Rule 4: simulated results, labelled "SIMULATED · SEED 7" on the tape for the whole video and on every chart label;
  not presented as anyone's performance. Rule 8: assumptions on screen (5 lines, 7.5 s) before any result.
- The cost is shown with equal weight: Mostly Wrong's losing streaks get their own beat and the worst 5% is marked
  on both fans. Rule 6: sources in the spec (expectancy formula x2, the simulation script).
- Rule 7: disclaimer in the Instagram caption and the YouTube description. Rule 9: music and sound generated.
- Voice: hook = feeling + number ("Guess who's losing."); humor tied to the lesson ("Ouch.", "Huh.", "It doesn't pay
  rent."); never at a real person. voice_check PASS.

## Pass 1 (full render 4x5, then fixes)
- Frames every 2 s + beat boundaries, contact sheets viewed. Found: the hook's first frames read "WINS 0%" / "$0"
  (weak opening). Fix: the win rate is each lane's identity and shows from frame 0; by 1.5 s the screen reads
  "Mostly Right +$300 vs Mostly Wrong −$300" under "Guess who's losing." Re-rendered.
- Found on 9x16: the "WORST 5% +8%" label sat on its own red path. Fix: dark halo behind fan labels. Re-rendered.

## Pass 2 (full re-render, 4x5 + 9x16 + thumbnail + cover)
1. Truth: PASS (table above; every number re-read on screen).
2. Compliance: PASS (simulated label on the tape for the whole video, assumptions before results, the cost shown,
   sources, disclaimer, generated sound).
3. Clarity: PASS. One idea (win rate is half the math); muted, captions + totals + fans carry it.
4. Brand: PASS. One Sodium per frame (the leader's total, the +$40, "money", the end-card wire); TapeStrip in/out;
   snap on the end card in E (E5 chime measured at 57.9 s, no A5 bleed).
5. Craft: PASS. Safe zones in both aspects, captions timed (lint), no overlaps after the fixes, loudness
   −14.1 LUFS / −2.4 dBFS peak (4x5 and 9x16).
6. Distinct: PASS. First What If Lab, new metaphor (Duel), new song (E dorian 128.6 BPM, square lead).
**Result: qa_passed after 2 passes.**

## Clarity (gate added 2026-10-09; read again muted, as a first-time viewer, after release)
- Learn 1, "win rate alone doesn't decide profit": the duel (60% winner ends −$400, 35% winner +$800) and both fans.
- Learn 2, "average result per trade = win rate × average win − loss rate × average loss": the math card with both
  formulas worked (−$20 vs +$40).
- Learn 3, "small losses and big wins mean long losing streaks": the streak distribution (usual worst 9 in a row).
- No undefined jargon (the formula is spelled out instead of saying "expectancy"); no studio words. Shorts thumbnail
  frame: 2.0 s (both lanes with win rates and running totals).
- First-time viewer restatement: "A high win rate can still lose money if the losses are bigger than the wins."
**Clarity: PASS.**
