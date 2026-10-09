# QA — L0004 Legend 01: Jesse Livermore

Batch 2026-10-09-b · legendcard · legends · 24.0 s (9 bars) · 4x5 + 9x16 · card front/back, print files, 5-slide carousel
Song: B minor, 90 BPM boom bap (hiphop-lazy, swing 0.088), iv i VII VI, glide lead (max hook similarity 0.40).

## Research
- Fact sheet: content/legends/livermore.md (every fact sourced; contested points flagged). Roster updated
  (content/legends.yaml: verified, card L0004).
- Method lines checked against the text of his 1940 book (ch. V "The Pivotal Point": patience to wait for the pivotal
  point, then sit tight; ch. II: no second trade if the first shows a loss, never average losses) and Project
  Gutenberg's Reminiscences (1923: "my sitting", never argue with the tape). Everything on screen is paraphrased; no
  quotes are used.

## Pre-render
- spec_lint PASS · registry check PASS · validate_publish PASS (X 242/280, title 57 chars).
- Stills viewed. Fixed: the card's field text was too small to read on a phone in 4x5 (the card is bound by the
  stage height): a slow push-in onto the fields (4.3 s, ×1.5, clipped to the stage). Carousel type-only slides were
  empty in the middle: now centred type slides with the source line under the headline.

## Truth
| On screen | Source |
|---|---|
| Legend 01, 1890s – 1940, stocks and commodities | Wikipedia (born 1877, traded from the 1890s, died 1940) |
| At 14, posting stock prices, $5 a week | Wikipedia (1891, board boy at Paine Webber, Boston, $5/week) |
| Made fortunes and lost them | Wikipedia (1907 and 1929 gains; bankruptcy filings 1915 and 1934) |
| Edge: waited for the pivotal point, then sat tight | How to Trade in Stocks (1940), ch. V |
| Habit: added only to a winner, never averaged a loss | How to Trade in Stocks (1940), ch. II and IV |
| Key read: How to Trade in Stocks (1940) | first edition, Duell, Sloan & Pearce, 1940 |

## Compliance
- Rule 5: abstract emblem only (pivot-step); no photo, likeness, voice or signature; no implied affiliation (stated in
  the YouTube description). Rule 6: sources in the spec. PivotStep is labelled "ILLUSTRATION · NOT A CHART".
- Respectful voice: the fortunes lost are a lesson ("Study both."), never a joke; his death is not mentioned.

## Pass 1 (full render 4x5)
1. Truth: PASS. 2. Compliance: PASS. 3. Clarity: PASS (card, then the idea drawn as wait / act / sit tight).
4. Brand: PASS (TapeStrip in/out, the pivotal point snaps with the snap at 10.67 s, a bar line where the music drops;
   sonic logo and wire snap on the end card at 18.67 s). 5. Craft: PASS (−14.3 LUFS, −2.7 dBFS; captions timed;
   the push-in keeps the fields inside the stage). 6. Distinct: PASS (first Legend Card).

## Pass 1, 9x16
Frames viewed: card push-in, the pivotal point, end card; −14.3 LUFS, −2.71 dBTP. Card, print files and carousel
(5 slides) viewed: print files are 825×1125 with Prussian/Abyss bleed and square corners; text sits ≥ 62 px inside the
trim (> 0.125 in). Note for the physical deck: the decorative Sodium frame sits 22 px inside the trim, inside the
cut tolerance of most printers; check it on the proof (see /print-cards; legal review first).
**Result: qa_passed after 1 pass.**

## Pass 2 (copy, caught on the final read before release)
"Our Sodium tripwire?" used our internal colour name, which viewers don't know. Caption now "The line that snaps in
our setups? His pivotal point." (9 words, 3.95 s needed, timed by lint); X reply, Instagram caption and YouTube
description say "amber line/tripwire". Frame checked in 9x16 (two lines, inside the caption band). Release run
cancelled and re-dispatched with the fix.
**Result: qa_passed after 2 passes.**
