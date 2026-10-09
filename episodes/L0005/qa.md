# QA — L0005 The Seesaw: wider stop, smaller size

Batch 2026-10-09-b · anatomy · risk/position-sizing · 46.67 s (25 bars) · 4x5 + 9x16
Song: F# minor, 128.6 BPM melodic house (four), i iv VI V, bell lead (redesigned once before release so it doesn't share
Lore 003's tempo and groove; max hook similarity 0.48).

## Pre-render
- spec_lint PASS (after trimming one caption that was 0.03 s short) · registry check PASS (new angle over Lore 003
  stated; L0003 linked as prerequisite) · validate_publish PASS (X 245/280, title 60 chars).
- Seesaw rebuilt as a real lever: risk budget = the Sodium counterweight; the share stack sits at its stop distance
  on a ruled beam; tilt follows shares × stop ÷ budget. Stills fixes: the AT RISK label sat under the big number;
  at 4× risk the stack sank through the floor and the $4 tick hit the axis label (tilt capped at 11°, label lower).
- Music timing: the tips land on bar lines (1.87 s, 3.73 s); the re-levels land on bars (13.07 s, 16.80 s).
- Copy check: an "isn't X. Y is." construction in the IG caption and YouTube description was rewritten.

## Truth
| On screen | Computed |
|---|---|
| 100 shares: stop $1 = $100, $2 = $200, $4 = $400 at risk | 100 × stop |
| Risk budget 1% of $10,000 = $100 | 0.01 × 10,000 |
| $1 → 100 shares, $2 → 50, $4 → 25 | floor(100 ÷ stop) |
| Shares = risk ÷ stop distance, round down | TradeZella formula; 5paisa (round down, wider stop = fewer shares) |

## Compliance
- Education only, no tickers or levels; prices are a labelled example. No simulation, no data. Sources in the spec.
  Disclaimer in IG + YouTube. Sound generated.

## Pass 1 (full render 4x5)
1. Truth: PASS. 2. Compliance: PASS. 3. Clarity: PASS (muted, the beam tipping and levelling carries it).
4. Brand: PASS (Sodium = the counterweight, the Sodium word on each card, the end-card wire; TapeStrip in/out; logo
   and snap on the end card at 42.93 s). 5. Craft: PASS (−14.1 LUFS, −3.5 dBFS; no overlaps after the stills fixes;
   live at-risk number turns Ember mid-move, then Tape when level). 6. Distinct: PASS.

## Pass 1, 9x16
Frames viewed (hook tips, re-levels, cards, end card): safe zones respected, no overlaps; −14.1 LUFS, −3.48 dBTP.
**Result: qa_passed after 1 pass.**

## Clarity (gate added 2026-10-09; read again muted, as a first-time viewer)
- Learn 1, "pick your dollar risk first": beat 2 ("Flip it. Fix the risk first: $100.") with the counterweight labelled
  RISK BUDGET 1% OF $10,000.
- Learn 2, "shares = risk ÷ stop distance": the math card, with $100 ÷ $4 = 25 shares worked on screen.
- Learn 3, "the same share count makes risk change with every stop": the hook, the beam tipping as $100 → $400.
- No jargon beyond basic words (stop, shares, risk); no studio words.
- First-time viewer restatement: "Decide how many dollars I'm willing to lose, then divide by how far my stop is."
**Clarity: PASS.**
