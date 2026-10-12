# QA — L0015 Replay reveal: what happened next

Batch 2026-10-12-a · replay (reveal) · setups/replay · 52.0 s (26 bars) · 4x5 + 9x16
Song: F# mixolydian, 120 BPM melodic techno (four), bell lead.

## Pre-render
- spec_lint PASS · registry check PASS (pair exemption, see Lore 014) · validate_publish PASS (X 262/280, title 59).
- TapeStrip reads THE REVEAL (formats.ts: replay entries whose concept_key ends in .reveal).
- Stills fix: the SOLD label sat on the chart title; moved into the empty space right of the sell point.

## Truth (GOOG daily, Yahoo Finance; % from the 2007-09-21 close)
| On screen | Computed |
|---|---|
| Never closed below the buy price | min close from 2007-09-21 to the peak = the buy close itself |
| Up 32% six weeks later | 2007-11-06 close +32.4% |
| Sold on a close below the 50-day average, December, +20% | first close below the 50-day average after the peak: 2007-12-17, +19.5% |
| Holding and hoping: −25% by March | 2008-03-17 close −25.0% |

## Compliance
- Historical; the 50-day rule is shown as one example ("not the only rule"), not advice. Disclaimer in IG + YouTube.

## Clarity (read again muted, as a first-time viewer)
- Learn 1, "it was Google; +32% six weeks later": the recap and run beats with the measure.
- Learn 2, "the market topped; a close below the 50-day average sold at +20%": the turn and exit beats, the green label.
- Learn 3, "holding and hoping was −25%: plan the sell before you buy": the red label and the rule card.
- The 50-day average is explained in plain words in the copy; on screen it is the drawn line and its label.
- First-time viewer restatement: "The buy worked, but without a sell plan you'd have given it all back and more."
**Clarity: PASS.**

## Pass 1 (full render 4x5 + 9x16)
Frames every 2 s + every beat boundary (4x5) and at 2, 12, 22, 36, 44 s (9x16) viewed. 1. Truth: PASS (+32% measure;
green SOLD label at December 17, +20%; red HELD AND HOPED at March 17, −25%). 2. Compliance: PASS. 3. Clarity: PASS.
4. Brand: PASS (one Sodium per frame: the rule word; Lichen and Ember for the two endings; TapeStrip reads THE REVEAL).
5. Craft: PASS (−14.1 LUFS, −2.3 dBFS peak, −2.29 dBTP; labels clear). 6. Distinct: PASS. Thumb and cover viewed
("+32%. Then −25%."). Shorts thumbnail frame 36.0 s (both endings labelled on the chart).
**Result: qa_passed after 1 pass.**
