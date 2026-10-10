# QA — L0007 The Council: where does your stop go?

Batch 2026-10-10-a · council · legends/council · 69.6 s (29 bars) · 4x5 + 9x16
Song: B dorian, 100 BPM boom bap (hiphop), glide lead; differs from the last 3 in key+mode, progression and lead.

## Pre-render
- spec_lint PASS (one 13-word caption cut: "Camp two: just under the range it broke out of.") · registry check PASS
  (council question new; marked used in content/council_questions.yaml) · validate_publish PASS (X 277/280 after a
  trim from 286, title 56 chars).
- Seats chosen for what we could source: Livermore (his 1940 book), O'Neil (CAN SLIM rule), Darvas (box stop),
  Kovner and Seykota (Market Wizards). Minervini was on the hint list but his stop numbers could not be verified
  from a primary text, so he is not seated.
- New component StopMap: one illustrated breakout, the two schools of stop drawn under the buy. Stills fixes: "BUY"
  sat on the line (moved left of the dot); the range label ran into the stop line (shortened); jargon labels
  "BREAKOUT LINE" / "THE BASE" renamed to plain "TOP OF THE RANGE" / "THE RANGE ("BOX")".

## Truth
| On screen (paraphrased) | Source |
|---|---|
| Livermore: if it doesn't rise like it should after you buy, get out | How to Trade in Stocks (1940), ch. V |
| O'Neil: sell any stock 7 to 8% below what you paid, no exceptions | Wikipedia: CAN SLIM |
| Darvas: just under the low of the range it broke out of, set as he bought | Wikipedia: Nicolas Darvas; Nasdaq |
| Kovner: a stop where it's hard to reach, fewer contracts, same dollar risk | Market Wizards (1989), Kovner |
| Seykota: cut losses, cut losses, cut losses | Market Wizards (1989), Seykota |
| "Never argue with the tape" | Reminiscences of a Stock Operator (1923) |

## Compliance
- Education only; StopMap labelled ILLUSTRATION · NOT A CHART. Legends as abstract emblems; every answer marked
  PARAPHRASED (TapeStrip); no affiliation implied; CAN SLIM attributed in the copy. Disclaimer in IG + YouTube.

## Clarity (read again muted, as a first-time viewer)
- Learn 1, "a stop is the price where you sell to take a small loss": the question beat caption, in those words.
- Learn 2, "two camps: a fixed percent vs the chart": the StopMap beat, both lines labelled with who uses them, and
  the two "Camp one / Camp two" captions.
- Learn 3, "all five agree: decide before you buy, keep it small, go when it hits": the agreement list.
- Learn 4, "stop far away: buy fewer shares": the closing rule card and its caption (callback to Lore 005).
- No jargon left on screen ("breaks out" is said in plain words; no "breakout", "base" or "pivot" labels).
- First-time viewer restatement: "Pick the price that proves you wrong before you buy, keep the loss small, and if
  it's far away, buy fewer shares."
**Clarity: PASS.**

## Pass 1 (full render 4x5 + 9x16)
Frames every 2 s + every beat boundary viewed in both aspects.
1. Truth: PASS. 2. Compliance: PASS (PARAPHRASED on the TapeStrip throughout). 3. Clarity: PASS. 4. Brand: PASS
(one Sodium per frame: the question diamond, then the top of the range, then the rule word; logo + snap on the end
card). 5. Craft: FAIL in 9x16 only: "TOP OF THE RANGE" touched the buy dot on the narrow stage. Also found: the
thumbnail and cover used the component's default stop labels ("8%", "BOX LOW") instead of the video's ("7–8%",
"RANGE LOW"). Audio −14.1 LUFS, −2.9 dBFS peak, −2.85 dBTP. 6. Distinct: PASS.

## Pass 2 (fix)
StopMap: the range label moved to the right end of its line (empty space in both aspects); the defaults now match
the video, so thumb and cover agree with it. 9x16 re-rendered and the StopMap beat re-checked (40 s); thumb and
cover regenerated and viewed. 4x5 checked on renderer stills; sampled again from the release.
Shorts thumbnail frame 9.0 s (the five emblems around "Where does your stop go?" with the hook caption).
**Result: qa_passed after 2 passes.**
