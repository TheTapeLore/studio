# QA — L0011 The RS line leads price

Batch 2026-10-12-a · anatomy · selection/relative-strength · 67.2 s (36 bars) · 4x5 + 9x16
Song: F dorian, 128.6 BPM garage house (four-broken), supersaw lead; max hook similarity 0.53.

## Pre-render
- spec_lint PASS (two captions trimmed for time; an AI-tell "not just" rule card rewritten as "The line can move
  first.") · registry check PASS · validate_publish PASS (X 251/280, title 57 chars).
- Engine: CandleChart gained `axisRef` (axis in % from a bar, so split-adjusted Netflix reads honestly) and `rsLabel`;
  the RS tag moved off the chart title.
- Stills fixes: the first cut drew the whole 2007-2010 range, which squashed 2008 into a flat strip (the run to +400% set
  the scale). Now the story beats end in June 2009 and the y-axis follows what's on screen; the run beat opens the full
  window. The run measure first read +200% (weekly bars are dated by their Friday, so the window ended a bar early);
  it now ends on the last bar and the spec asserts +176% and +36% from the data. RS label moved off the line.
- Music: the tripwire snap (the price's new 52-week high) drops into the chorus on bar 22 (39.2 s).

## Truth (data.json, weekly closes, Yahoo Finance)
| On screen | Computed |
|---|---|
| Market −56%, Netflix +66% (Oct 2007–Mar 2009) | S&P 500 week of 2007-10-12 → 2009-03-06: −56.2%; NFLX +66% |
| Netflix fell hard too | NFLX −51% from its April 2008 high to the week of 2008-10-24 |
| December 2008: RS line new 52-week high; price 35% below its high | RS 52-week high in the week of 2008-12-05; price −34.5% vs its 52-week high |
| Fourteen weeks later, a new price high; market 52% below its peak | price 52-week high in the week of 2009-03-13; S&P 500 −51.6% vs Oct 2007 |
| Netflix +176% in 15 months; S&P 500 +36% | 2009-03-13 → 2010-06-30 (last weekly bar): +176%, +36% |

## Compliance
- Historical data (ended 2010), % axis. No calls; "a clue for your watchlist, not a buy signal" on screen. Sources in the
  spec. Disclaimer in IG + YouTube. Sound generated.

## Pass 1 (full render 4x5)
Frames every 2 s + every beat boundary viewed.
1. Truth: PASS. 2. Compliance: PASS. 3. Clarity: PASS. 4. Brand: PASS (one Sodium per frame: the leader in the race, the
tripwire, the rule word). 5. Craft: PASS (−14.1 LUFS, −2.2 dBFS peak, −2.21 dBTP; labels clear). 6. Distinct: PASS (first
selection entry).

## Clarity (read again muted, as a first-time viewer)
- Learn 1, "RS = price divided by the market": the define beat caption, word for word, with the line on the chart.
- Learn 2, "December 2008: RS new high while the price was 35% below its high": the lead beat, the ring labelled NEW
  52-WEEK HIGH and the red PRICE: STILL 35% BELOW ITS HIGH label.
- Learn 3, "14 weeks later a new price high; +176% vs +36%": the breakout beat (the wire snaps) and the run measure.
- Learn 4, "a clue, not a buy signal": the rule card and the last caption.
- Jargon: relative strength defined on screen. No studio words.
- First-time viewer restatement: "Divide a stock by the market. If that line makes new highs while the price is still
  down, the stock is stronger than it looks. Watch it, don't just buy it."
**Clarity: PASS.**

## Pass 1, 9x16
Frames every 2 s + beat boundaries viewed: inside the safe zone, labels clear; −14.1 LUFS, −2.21 dBTP.
Shorts thumbnail frame 5.0 s (the finished race: S&P 500 −56%, Netflix +66%, with the hook caption).
**Result: qa_passed after 1 pass (after the still-review fixes).**
