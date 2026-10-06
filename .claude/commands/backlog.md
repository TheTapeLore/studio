---
description: Refill the idea backlog where the library is thin
argument-hint: [how many ideas, default 40]
---
1. `registry.py coverage`; read content/STRATEGY.md and content/backlog.yaml.
2. Generate $ARGUMENTS new ideas (default 40), weighted to empty/thin cells and the next season's arc. Each idea:
   id, pillar, cluster, format, concept_key, title, hook, why_now, search_terms (what people type on YouTube/IG),
   priority (quick_win | big_bet | fill_in). First-principles and specific; no generic listicles.
3. `registry.py find` each idea and drop near-repeats of existing entries or backlog items.
4. Append to content/backlog.yaml (status: open). Commit.
