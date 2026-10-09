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

## 4. The Legend story video (60-110 s, format `legendcard`, content/formats.yaml)
We don't call anyone a legend lightly: the video must earn the title and teach. Beats, each in plain sentences:
1. **Title** (LegendTitle): emblem, a LEGEND NN tag on its own line, the name, years and markets. The caption is the
   hook (a feeling + a number); never put "Legend NN" in a caption.
2. **Who** (FortuneLine): where they started, in a sentence a newcomer understands.
3. **The record** (FortuneLine): the big wins, with what they did to win them.
4. **Why a legend** (ListCard): 2-4 sourced reasons that set them apart (what they figured out first, a defining
   moment, influence that lasts). This is the respect beat.
5. **Method** (PivotStep or a component built for their idea): the core idea, defined on screen, drawn.
6. **Mistakes, with causes** (FortuneLine losses): what went wrong and WHY (their own account first). Respectful:
   mistakes don't take from the legacy; they are the most useful part of it. Never their death, never mockery.
7. **Their rules** (ListCard): the lessons, each tied to the win or the loss that taught it, so viewers can use them.
8. **The card** (LegendCard) and the end card.
Every claim sourced; contested figures say "reportedly"; paraphrase. The spec's `learn` list covers who they were,
why they're a legend, their method, and what their mistakes teach.

## 5. Social package
- The Legend story video above in 4x5 + 9x16.
- Instagram carousel: card front, then 3 slides teaching their ideas in our visual language, then "Which legend
  next?" slide. X: card image + post. YouTube: the reveal as a Short.
- Carousel: card front, why a legend, the method, how they lost (with causes), their rules, "Which legend next?".
- Register as pillar `legends`, format `legendcard`, `legends: ["<name>"]`. Validate, deliver like /batch 7-11
  (the Clarity section in qa.md is required).
