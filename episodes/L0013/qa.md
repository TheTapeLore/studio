# QA — L0013 Distribution days, drawn

Batch 2026-10-12-a · anatomy · conditions/distribution · 64.0 s (30 bars) · 4x5 + 9x16
Song: Db minor, 112.5 BPM breaks, square lead; max hook similarity 0.54.

## Pre-render
- spec_lint PASS (two captions over 12 words rewritten; a "Month day:" shorthand avoided) · registry check PASS ·
  validate_publish PASS (X 255/280, title 56).
- New chart overlay DistributionDays: every day is computed from the index's closes and volume by the stated rule
  (≤ −0.2% on higher volume; live for 25 sessions unless the index closes 5% above it) and the badge counts the live
  ones on the newest bar. Score: each distribution day gets a short fall; the harmony darkens when the count reaches 5.
- Stills fixes: the hook froze on November 30, when the count had already fallen back to 3; it now freezes on November
  7 at 8. One linear reveal can't hold on October 9 while its caption plays, so the count ran ahead of the words; the
  build is now three beats, one per milestone (record day 1, eight days later 5, November 7 8).

## Truth (^GSPC daily, Yahoo Finance)
| On screen | Computed |
|---|---|
| October 9 record close; count one | 1,565.15 (record close); live: 2007-09-28 |
| Eight trading days later, five | 2007-10-19: 09-28, 10-11, 10-15, 10-16, 10-19 |
| By November 7, eight | 10-11, 10-15, 10-16, 10-19, 10-24, 10-30, 11-01, 11-07 |
| Down 19% by March 2008; 57% a year later | 2008-03-10 close −18.6%; 2009-03-09 close −56.8% |
| Definition, 25 sessions, 5% rally, O'Neil's four or five | LuxAlgo Library: Distribution Days |

## Compliance
- Historical data; "a warning, not a crystal ball" on screen and in copy. O'Neil paraphrased and sourced; CAN SLIM
  attributed to IBD in the copy. Disclaimer in IG + YouTube.

## Clarity (read again muted, as a first-time viewer)
- Learn 1, "a distribution day = index down 0.2%+ on higher volume": the definition card and its caption.
- Learn 2, "count over 25 days; four or five in a month is a warning": the count card and O'Neil's line.
- Learn 3, "2007: from 1 at the record to 8 in a month, then −19%": the three build beats with the live badge, then the
  after beat's two measures.
- Learn 4, "a warning, not a forecast; go easy on new buys": the rule card.
- Jargon: distribution day defined on screen. No studio words.
- First-time viewer restatement: "Count the days the market drops on heavy volume. When there are five or more in a
  month, be careful."
**Clarity: PASS.**
