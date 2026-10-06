---
description: What If Lab — answer a trading question with a seeded simulation, animated from its output
argument-hint: "<question, e.g. what if I risk 2% vs 0.5% per trade?>"
---
Question: $ARGUMENTS
1. `registry.py find` it. Design the experiment first-principles: variables, fixed assumptions, number of runs,
   seed. Real historical data where possible (90-day rule); otherwise synthetic, labelled "simulated".
2. Write sims/<slug>.py (numpy only, deterministic, fast < 60s) that writes episodes/<id>/sim.json with exactly the
   series the animation needs (downsampled). Include a summary block of the key numbers.
3. Sanity-check results analytically where possible (e.g. expectancy = wr*avgWin - (1-wr)*avgLoss). Note checks in qa.md.
4. Episode (format `whatif`): show the setup, the rule(s), the runs unfolding, the distribution of outcomes
   (median AND the bad tail), the one-line lesson, assumptions on screen. Never imply a guaranteed outcome.
5. Package, register (`simulation` field with script + params), deliver like /batch 8–11.
Ideas bank: risk per trade vs drawdown; win rate x payoff; same winner five exits; averaging down; stop width vs
size; correlation of positions; leveraged ETF decay; options theta vs move size; consecutive-loss streaks.
