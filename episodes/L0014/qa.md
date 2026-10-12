# QA — L0014 Replay: would you buy here?

Batch 2026-10-12-a · replay · setups/replay · 44.0 s (22 bars) · 4x5 + 9x16
Song: Eb minor, 120 BPM melodic techno (four-broken), supersaw lead.

## Pre-render
- spec_lint PASS · registry check PASS (it flagged the shared chart with Lore 015; formats.yaml defines the reveal as
  the replay's companion, so registry.py now exempts exactly that pair: concept_key + ".reveal") · validate_publish
  PASS (X 274/280; X poll and Instagram story poll checked: 2-4 options, ≤ 25 chars; validate_publish now writes them
  into x.md and instagram.md).
- No hindsight by construction: the chart's window ends on the frozen day, the y-axis grows with the revealed bars, the
  axis is % from the frozen close, the name is hidden ("MYSTERY STOCK"), and the TapeStrip reads NO HINDSIGHT.
- Stills fixes: the chart title collided with the RS tag and the tripwire label (headroom added above the base; RS tag
  moved). Music: the wire snaps on the breakout bar, on bar 10 (18.0 s), after the reveal was re-timed onto the grid.

## Truth (GOOG and ^GSPC daily, Yahoo Finance)
| On screen | Computed |
|---|---|
| Pulled back 14% over six weeks | the 30 sessions before 2007-09-21: 13.7% from the high to the low |
| New high on 80% more volume than usual | 2007-09-21 close above the base high; volume 1.77× its 50-day average |
| RS line at a new high | GOOG ÷ S&P 500 above its prior high in the window |
| The market: one distribution day | S&P 500 live count on 2007-09-21: 1 (2007-09-05), Lore 013 rule |

## Compliance
- Historical, frozen in 2007; the question is a quiz about the past, not a call. Disclaimer in IG + YouTube.

## Clarity (read again muted, as a first-time viewer)
- Learn 1, "a base is a sideways pause; this one six weeks, 14% deep": the reveal caption and list item 1 with its
  definition.
- Learn 2, "a close at a new high on heavier volume, RS at a new high = a strong breakout": the snap on the chart,
  the captions and list items 2 and 3.
- Learn 3, "check the market too: one distribution day = calm": list item 4 and its caption.
- Jargon: base, relative strength and distribution day each defined on screen (list subs, with Lore links).
- First-time viewer restatement: "It broke out of a quiet pause on big volume, it was beating the market, and the market
  was calm. Would I buy? Probably."
**Clarity: PASS.**
