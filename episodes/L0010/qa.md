# QA — L0010 Legend 02: William O'Neil

Batch 2026-10-10-a · legendcard (Legend story) · legends/legend-cards · 106.67 s (40 bars) · 4x5 + 9x16
Song: F# minor, 90 BPM boom bap (hiphop), i III VII iv, pluck lead (redesigned twice before release: first it shared
B minor 90 with Lore 004, then a 100 BPM tempo with Lore 007; max hook similarity 0.47).

## Pre-render
- spec_lint PASS (one 13-word caption cut to 11) · clarity_check PASS (base and cup with handle defined on screen) ·
  registry check PASS (first O'Neil card; Lore 004 linked) · validate_publish PASS (X 278/280, title 60 chars).
- Research: every fact checked against Wikipedia, the Bloomberg obituary (WealthManagement.com) and O'Neil's firm.
  Cut as unverifiable: a widely retold 1961 "post-analysis of his own trades" story (no primary text found).
  The fund's slide uses his own explanation (to the Los Angeles Times, via the WSJ obituary): too many small names,
  growing too fast. CAN SLIM is IBD's mark: attributed in the copy, never used in our branding.
- Stills fixes: the buy-point label crossed the price line (moved left onto the cup, wire now starts over the cup);
  the stop label sat on the handle (two lines, and the CUP/HANDLE labels fade as the stop arrives); Milestones
  labels were small and could pile up (only the newest milestone keeps its label, earlier ones step back to a dot
  and year; label 1.55x, kept inside the frame). The label "PIVOT" became "BUY POINT: TOP OF THE HANDLE".
- Music timing: the buy point snaps on bar 19 (48.00 s) with a one-bar build into it; the misses beat is darker and
  half-time with a fall on the slide (69.33 s) and builds into the rules (drop at 80.00 s); logo on bar 38.

## Truth
| On screen | Source |
|---|---|
| 1933 – 2023; stocks | Wikipedia (25 Mar 1933 – 28 May 2023) |
| 1958 stockbroker, Hayden Stone, Los Angeles | Wikipedia; Bloomberg obituary |
| Early 1962 his rules said sell everything; that spring stocks crashed | Bloomberg obituary |
| Three big trades turned $5,000 into $200,000 | Bloomberg obituary, citing Market Wizards (1989) |
| At 30 he bought a New York Stock Exchange seat; youngest at the time | Wikipedia; obituary (1964) |
| First computerized daily stock database | Wikipedia (William O'Neil + Co., 1963) |
| Over 1,000 big winners, back to the 1880s | williamoneil.com (Model Book) |
| Investor's Daily 1984, now Investor's Business Daily | Wikipedia (renamed 1991) |
| Cup with handle; cut every loss at 7–8% | Wikipedia: CAN SLIM |
| Fund +116% in 1967, the year's best (FundScope) | Bloomberg obituary |
| Assets $49 million peak, $6 million by 1975 | Bloomberg obituary, citing the Los Angeles Times |
| Investors pulled out when stocks fell; "too many small stocks, growing too fast" | Wikipedia, citing the WSJ obituary (paraphrased) |
| How to Make Money in Stocks (1988) | Bloomberg obituary (first published 1988) |

## Compliance
- Education only; no tickers, levels or calls. The cup with handle is labelled ILLUSTRATION · NOT A CHART.
- Legend: abstract emblem only, no photo, likeness, voice or signature; paraphrased; no affiliation implied.
  CAN SLIM not on screen; attributed to IBD in the copy. Disclaimer in IG + YouTube. Sound generated.

## Pass 1 (full render 4x5)
Frames every 2 s + every beat boundary viewed.
1. Truth: PASS. 2. Compliance: PASS. 3. Clarity: PASS (below). 4. Brand: PASS (one Sodium per frame: the buy-point
wire, the active list number, the card; TapeStrip in/out; logo + snap on the end card). 5. Craft: PASS (−14.1 LUFS,
−2.8 dBFS peak, −2.76 dBTP; no overlaps; every caption readable before it changes). 6. Distinct: PASS (Lore 004's
story is a fortune line; this one is a timeline, a pattern drawn part by part and a fund's slide).

## Clarity (read again muted, as a first-time viewer)
- Learn 1, "$5,000 into $200,000, then measured over 1,000 big winners": hook (title card + caption), the timeline
  (1963 · $5,000 GROWS TO $200,000), the why-a-legend list item 2.
- Learn 2, "a legend because he studied winners by computer and shared it in a daily paper": the why-a-legend list,
  three captions, one item each.
- Learn 3, "the cup with handle; he bought the break above the handle on heavy volume": the method beat, the shape
  drawn part by part (CUP, HANDLE, BUY POINT: TOP OF THE HANDLE, SURGE ON THE BREAK) under the captions that define
  a base ("a sideways pause") and the cup with handle ("a rounded dip, then a smaller dip").
- Learn 4, "cut every loss at 7–8%, because small losses are easy to win back": the sell-rule beat, the red line
  "SELL IF IT FALLS 7–8% BELOW YOUR BUY" and the caption with the reason.
- Learn 5, "his fund grew too fast and owned too many small stocks, so own a few and know them": the misses list
  and rule 3 on the rules card.
- Respect: the misses are framed "Even legends slip", with his own explanation; the card closes on "Study his
  winners, and his rules."
- No studio words on screen or in copy. Rewrote: "PIVOT" (unexplained) to "BUY POINT: TOP OF THE HANDLE".
- First-time viewer restatement: "He studied what big winning stocks had in common, bought them as they broke out of a
  quiet pause, and sold any loser 7 to 8% down. And don't own too many stocks."
**Clarity: PASS.**

## Pass 1, 9x16
Frames every 2 s + beat boundaries viewed: everything sits inside the safe zone, no overlaps, the stop label clears the
handle; −14.1 LUFS, −2.76 dBTP. Shorts thumbnail frame 4.0 s (the title card with the hook caption).
**Result: qa_passed after 1 pass.**
