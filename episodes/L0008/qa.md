# QA — L0008 Expectancy in 15 seconds

Batch 2026-10-10-a · lexicon · risk/expectancy · 18.67 s (10 bars) · 4x5 + 9x16
Song: E dorian, 128.6 BPM house with ghost snares (four-ghost), supersaw lead (redesigned once before release so its
tempo and groove differ from the previous song).

## Pre-render
- spec_lint PASS · registry check PASS after a fix: the first draft reused Lore 003's exact simulated sequence
  (same script and params, same tower). Now a fresh sequence from the same model (seed 47 → sequence 49, the
  median-total pick), so the tower is new while the model stays the one Lore 003 explained. validate_publish PASS.
- Stills fix: the tower's label was clipped on the right; shortened to "SIMULATED · 1R = WHAT YOU LOSE IF THE STOP HITS".

## Truth (sims/r_multiples.py, seed 47 → sequence 49)
| On screen | Computed |
|---|---|
| 20 trades, +3.5R in total | sum of the 20 R-multiples = +3.5R (8 winners, 12 losers) |
| +0.18R per trade | 3.5 / 20 = 0.175, shown rounded |
| Expectancy = what you make or lose per trade, on average | LuxAlgo; TradeZella (mean R per trade) |

## Compliance
- Simulated trades labelled SIMULATED on the tower; no performance claims. Disclaimer in IG + YouTube.

## Clarity (read again muted, as a first-time viewer)
- Learn 1, "expectancy = what you make or lose per trade, on average": the definition card.
- Learn 2, "in R: add every result, divide by the number of trades: +3.5R / 20 = +0.18R": the tower builds the total
  live; the caption does the division.
- Learn 3, "above zero = an edge, below = none": the last caption.
- Jargon: expectancy and R both defined on screen. No studio words.
- First-time viewer restatement: "Add up my trades in R and divide by how many: if it's above zero I have an edge."
**Clarity: PASS.**
