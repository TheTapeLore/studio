---
description: Build one specific Lore entry from a brief
argument-hint: "<idea or brief>" [pillar] [format]
---
Build exactly one entry for: $ARGUMENTS
Run the same pipeline as /batch (steps 1–11) with N=1, but take the idea from the brief.
Before anything else run `registry.py find` on the brief; if it overlaps an existing Lore, propose the closest
genuinely new angle and proceed with that (state the difference in `new_angle`).
