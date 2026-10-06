---
description: Build a posting calendar from released entries
argument-hint: [weeks, default 2]
---
From registry entries with status `released`, build schedule/<start-date>.md for $ARGUMENTS weeks using the
cadence in content/STRATEGY.md. Balance pillars (no pillar twice in a row), respect learning order (prerequisites
first), put Council/What If entries on peak days, Legend Card on Sunday. For each slot: platform, time (founder's
local time, IST), file names, and the copy from publish/<id>/*.md ready to paste. Flag gaps the next /batch must fill.
After the founder confirms posting, they (or you, when told) run `registry.py status <id> published --url <platform>=<url>`.
