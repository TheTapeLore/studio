---
description: Research a legendary trader and produce their Legend Card (digital + print-ready) and social package
argument-hint: <legend name | next>
---
Legend: $ARGUMENTS (if `next`, take the highest-priority legend in content/legends.yaml without a card).

## 1. Research (no card without sources)
- Use at least 2 reputable sources (their own books/interviews, Market Wizards-type interview books, reputable
  press). Write content/legends/<id>.md: era, markets, timeframe, style, signature ideas (paraphrased),
  habits/rules (paraphrased), key reads (title + year), documented facts with a source each, contested points
  flagged as contested. No quotes unless verified word-for-word from a primary source and under 15 words.
- Update content/legends.yaml (verified: true, sources).

## 2. Emblem
An abstract geometric emblem that encodes their core idea (e.g. Livermore: flat tape, one decisive step through a
Sodium pivotal-point diamond). Rules: built from lines, arcs, diamonds and the tape motif; Tape + Sodium on
Abyss; no faces, silhouettes, signatures, flags or logos. Save the emblem as an engine component props preset.

## 3. Card (Remotion <Still>, layout follows brand/assets/cards/legend-card-front-sample-*)
- Front: TapeStrip "LEGEND NN   <ERA>", emblem medallion, NAME, fields Markets / Edge / Habit / Key read
  (each <= 2 lines), pillar glyph, footer "THE TAPE LORE   COUNCIL OF LEGENDS".
- Back: shared design (brand/assets/cards/legend-card-back-*).
- Outputs: publish/<id>/card-front-750x1050.png, card-back-750x1050.png, and print/ versions at 825x1125
  (2.5x3.5in trim + 0.125in bleed @300dpi), text kept 0.125in inside trim.

## 4. Social package
- 20s "card reveal" video (TapeStrip in, emblem draws itself, fields type on, snap) in 4x5 + 9x16.
- Instagram carousel: card front, then 3 slides teaching their ideas in our visual language, then "Which legend
  next?" slide. X: card image + post. YouTube: the reveal as a Short.
- Register as pillar `legends`, format `legendcard`, `legends: ["<name>"]`. Validate, deliver like /batch 8–11.
