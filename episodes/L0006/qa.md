# QA — L0006 Risk 0.5% vs 2% per trade: 1,000 runs

Batch 2026-10-10-a · whatif · risk/position-sizing · 74.67 s (35 bars) · 4x5 + 9x16
Song: Bb minor, 112.5 BPM house (four), square lead; differs from the last 3 songs in key+mode, progression and lead.

## Pre-render
- spec_lint PASS (two captions 0.03 s short, trimmed; a "The cause?" setup line rewritten as a plain statement:
  "Losing streaks: half the runs hit 9 losses in a row.") · registry check PASS (new angle over Lore 005 stated;
  L0005 + L0001 linked) · validate_publish PASS (X 259/280, title 59 chars).
- New component TwinPaths: one simulated run (the run whose 2% max drawdown is the median, not a cherry-pick), the
  same 200 trades sized two ways, drawdowns shaded under each line. Stills fixes: the two "AT WORST" labels stacked
  on the same spot and the line labels sat on the lines; both moved into a legend above the plot.
- Music timing: the worst-drop markers land on beat 10 (5.33 s) with a fall the size of the −23%; the 1,000-run fans
  each build into a drop on their first bar; the distribution is the breakdown; the two rules are the chorus.

## Truth (sims/risk_per_trade.py, seed 7: 1,000 runs × 200 trades, 40% winners, +2R / −1R)
| On screen | Computed |
|---|---|
| Same 200 trades: worst drop −6% vs −23% | twin run 269: max drawdown −6.3% (0.5%) / −23.2% (2%) |
| In this run 2% grew more: +117% vs +23% | twin finals +117% / +23% |
| All runs at 0.5%: typical worst drop −6%; unluckiest 5% fell 11% | median max DD −6.3%; 5th percentile −10.6% |
| At 2%: typical −23%; almost 1 in 5 fell over 30% | median −23.2%; 18.3% of runs below −30% |
| Half the runs hit 9 losses in a row | median longest losing streak 9 |
| At 2% each, nine straight losses cost 17% | 1 − 0.98^9 = 16.6% (0.5%: 1 − 0.995^9 = 4.4%) |
| A −30% pit needs +43% | 0.3 / 0.7 = 42.9% |

## Compliance
- Simulation: assumptions on screen (runs, seed, win rate, payoff, sizes, same coin flips, no costs/slippage/gaps);
  every chart labelled SIMULATED; the TapeStrip reads SIMULATED · SEED 7. No performance claims; both sizes show
  their losing side (drawdowns shaded on both lines). Disclaimer in IG + YouTube. Sound generated.

## Clarity (read again muted, as a first-time viewer)
- Learn 1, "risk per trade = what you lose when a stop hits": the assumptions beat caption, defined in words.
- Learn 2, "2% made the worst drop about four times deeper, −23% vs −6%": the hook (two lines, legend numbers in red),
  then the cut ("It also fell almost four times deeper").
- Learn 3, "losing streaks hit everyone; 9 in a row costs ~17% at 2%": the distribution beat captions and the
  trade-off card sub ("Nine losses in a row: −4% at 0.5%, −17% at 2%").
- Learn 4, "pick a size whose worst drop you could sit through, before the streak": the rule card.
- Jargon: R defined on the assumptions panel ("a loss costs 1R"); "drawdown" never appears on screen (we say
  "worst drop"). No studio words.
- First-time viewer restatement: "Same trades, but betting 2% instead of 0.5% made the bad stretches four times
  worse. Choose a size you can live with when you lose nine in a row."
**Clarity: PASS.**

## Pass 1 (full render 4x5 + 9x16)
Frames every 2 s + every beat boundary viewed in both aspects.
1. Truth: PASS. 2. Compliance: PASS. 3. Clarity: PASS. 4. Brand: PASS (one Sodium per frame: the rule word;
Ember for drawdowns and the worst 5%; TapeStrip in/out; logo + snap on the end card). 5. Craft: FAIL in 9x16 only:
in the cut beat, "−23% AT WORST" ran into "ENDED +117%" on the narrow stage. 4x5 clean. Audio −14.2 LUFS,
−3.2 dBFS peak, −3.15 dBTP. 6. Distinct: PASS.

## Pass 2 (fix)
TwinPaths: the end values moved under each legend row's worst-drop number (rows spaced further apart, plot lowered),
so nothing shares a line. Verified on renderer stills of the cut beat in both aspects and on the regenerated thumb and
cover; the release videos are rendered from this code by render.yml and sampled again after release.
Shorts thumbnail frame 6.0 s (both lines with −6% / −23% AT WORST, hook caption).
**Result: qa_passed after 2 passes.**
