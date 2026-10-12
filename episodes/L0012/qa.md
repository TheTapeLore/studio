# QA — L0012 ADR% in 15 seconds

Batch 2026-10-12-a · lexicon · selection/volatility · 20.0 s (10 bars) · 4x5 + 9x16
Song: B minor, 120 BPM garage (redesigned before release: the first draft was the same garage-house groove as Lore 011
right before it), square lead.

## Pre-render
- spec_lint PASS (definition caption shortened to fit 4 s) · registry check PASS (new angle over Lore 005 stated) ·
  validate_publish PASS (X 250/280, title 60).
- New component RangeBars: each bar is one real day's high-to-low range in %, both stocks on the same scale; the dashed
  line is the average (ADR%); the stop line lights the days that reached it. Stills fix: the count and ADR labels were
  too small to read on a phone.

## Truth (Yahoo Finance daily highs and lows, 2019-12-03 to 2019-12-31)
| On screen | Computed |
|---|---|
| Coca-Cola 0.9% a day, Tesla 2.9% | mean of (high ÷ low − 1) × 100 over 20 days: KO 0.86, TSLA 2.89 |
| 2% stop: 0 of 20 KO days, 15 of 20 TSLA days | days with range ≥ 2%: KO 0, TSLA 15 |
| ADR% = 20-day average daily range | TradingView ADR(20)% scripts (formula) |

## Compliance
- Historical data (2019). The tickers are examples, not calls. Disclaimer in IG + YouTube.


## Clarity (read again muted, as a first-time viewer)
- Learn 1, "ADR% = how far a stock moves, low to high, on a normal day (20-day average)": the definition card.
- Learn 2, "Coca-Cola 0.9%, Tesla 2.9%": the picture beat, both averages drawn and labelled.
- Learn 3, "a 2% stop: 0 vs 15 of 20 days; tight stops on wild stocks get hit by noise": the stop line, the red days,
  the counts on each panel, and the last caption.
- Jargon: ADR defined on screen. No studio words.
- First-time viewer restatement: "Check how much a stock normally moves in a day before you pick your stop."
**Clarity: PASS.**

## Pass 1 (full render 4x5)
Frames every 1 s viewed. Truth, compliance, clarity, brand, distinct: PASS. Craft: FAIL: Tesla's "ADR 2.9%" label sat on
its own tall bars and was hard to read; the thumbnail headline ran into the chart.

## Pass 2 (fix)
RangeBars labels got a dark halo (stroke behind the text); thumb lines shortened ("Same stop. 0 hits or 15."). Both
aspects re-rendered; frames at 7 s and the thumb viewed: readable. −14.2 LUFS, −2.32 dBTP.
Shorts thumbnail frame 9.0 s (both panels with the 2% stop and the 0 / 15 counts).
**Result: qa_passed after 2 passes.**
