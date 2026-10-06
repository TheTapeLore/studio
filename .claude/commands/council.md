---
description: Build a Council episode — several legends answer one question, side by side
argument-hint: "<question>" | next
---
Question: $ARGUMENTS (if `next`, take the first open question in content/council_questions.yaml).
1. `registry.py find` the question; skip if already asked.
2. Research 4–6 legends' DOCUMENTED positions (sources required, paraphrase). Prefer legends from different eras
   and markets so real disagreement shows. Save content/council/<slug>.md: each position + source, where they
   agree (the timeless part), where they differ (where the viewer must choose their style).
3. Episode (format `council`): CouncilArc component — the question in the centre, each seat lights with its legend's
   emblem and a <= 10-word paraphrase; then "Where they agree" and "Where they split" beats. 45–75s.
4. X: a thread (one post per legend + agree/split + "Lore NNN"). IG: carousel version. YouTube: Short.
5. Validate, register (`question` field filled), deliver like /batch 8–11. Mark the question `asked: <id>`.
