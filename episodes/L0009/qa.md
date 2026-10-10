# QA — L0009 Failure File: averaging down a loser

Batch 2026-10-10-a · failure · risk/failure-files · 58.0 s (29 bars) · 4x5 + 9x16
Song: C dorian, 120 BPM house (four), bell lead (redesigned twice before release for variety against the songs
before it).

## Pre-render
- spec_lint PASS · registry check PASS (first Failure File; L0001 + L0004 linked) · validate_publish PASS
  (X 263/280, title 55 chars). Data ends 2003-06-30, over 20 years before publish.
- New component AverageDown: every buy computed from the weekly closes by a stated rule (first buy once the close is
  25% under the high, then one more every further 20%, five buys of $10,000). Stills fixes: the MONEY IN line sat under
  the WORTH number; BUY 3–5 labels collided (all labels now sit left of their dots); the tell label crossed the
  average-cost line; the stop label crossed the price line.
- Music timing: each buy lands with a fall sized by the drop (buys closer than two beats merge into one run); deeper =
  darker chords and half-time, breakout withheld; the tells are a breakdown; the one-stop rule is the chorus with an
  impact where the stop fires (42.50 s, on a beat).

## Truth (data/cache CSCO 1999-06-01 to 2003-06-30, weekly, split-adjusted; % from the high)
| On screen | Computed |
|---|---|
| Down 28% from its high | first buy 2000-04-14 close, −28.2% from the 2000-03-24 high |
| Weeks earlier, the world's most valuable company | Wikipedia: Cisco (late March 2000) |
| Every 20% lower, another $10,000; five buys, $50,000 in by March 2001 | buys 2000-04-14, 2000-12-22, 2001-02-09, 2001-03-02, 2001-03-30 |
| October 2002: down 88% from the top | 2002-10-04 close, −88.1% |
| The $50,000 was worth about $17,500 | $17,542 |
| (copy) +185% needed to get back to even | 50,000 / 17,542 − 1 = 185% |
| One buy, a stop 8% below it: out for $800 | stop crossed the week of 2000-10-27; −$800 assumes a fill at the stop (that week's close was −11%), disclosed in the copy |

## Compliance
- Historical data, ended over 20 years ago; % from the high because prices are split-adjusted. The averaging rule is
  ours, for illustration; said in the copy. No calls, no current levels. Disclaimer in IG + YouTube.

## Clarity (read again muted, as a first-time viewer)
- Learn 1, "averaging down = buying more as it falls": the myth beat ("Buying more as it falls is called averaging
  down"), with the definition on screen.
- Learn 2, "five $10,000 buys, $50,000 became about $17,500": the build and breaks beats, the MONEY IN / WORTH
  readout and the % live in the corner.
- Learn 3, "each buy went into a trade already losing; the bet grew": the tells beat and the myth's math line ("It
  lowers your average price. It raises what you can lose.").
- Learn 4, "one buy with an 8% stop cost about $800: never add to a loser": the rule beat, the stop line and the
  closing caption naming Livermore and O'Neil.
- No studio words; "averaging down" defined. Numbers each say what they mean (money in, worth, % from the top).
- First-time viewer restatement: "Buying more of a falling stock made one loss five times bigger. One stop would have
  cost $800."
**Clarity: PASS.**

## Pass 1 (full render 4x5)
Frames every 2 s + every beat boundary viewed.
1. Truth: PASS (buys, readout values and dates recomputed from data.json above). 2. Compliance: PASS. 3. Clarity:
PASS. 4. Brand: PASS (one Sodium per frame: the stop line in the rule beat; Ember for losses and the average cost;
TapeStrip in/out; logo + snap on the end card). 5. Craft: PASS (−14.1 LUFS, −2.7 dBFS peak, −2.71 dBTP; readout,
buy labels, tell and stop labels clear of the line). 6. Distinct: PASS (first real-chart failure in the library).

## Pass 1, 9x16
Frames every 2 s + beat boundaries viewed: inside the safe zone, no overlaps; −14.1 LUFS, −2.71 dBTP.
Shorts thumbnail frame 20.0 s (WORTH $17,500, −65%, with "By October 2002 it was down 88% from the top").
**Result: qa_passed after 1 pass.**
