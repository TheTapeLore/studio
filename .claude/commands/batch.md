---
description: Plan, build, QA, package and release N new Lore entries without repeating the library
argument-hint: <n> [pillars,comma,separated] [formats,comma,separated]
---
Produce a batch for The Tape Lore. Arguments: $ARGUMENTS
(first = how many entries; optional second = pillar filter; optional third = format filter).
Follow CLAUDE.md exactly. Work autonomously; stop only for credentials or spending.

## 1. Sync
- `git pull`. Read CLAUDE.md, content/STRATEGY.md (current season + week), content/formats.yaml, content/metaphors.yaml.
- Run `python scripts/registry.py stats` and `python scripts/registry.py coverage`.
- Batch id = `<YYYY-MM-DD>-<next free letter>`. Lore numbers from `registry.py next-id`, consecutive.

## 2. Plan (no repeats)
- Choose N slots. Unless filters were given: follow the season arc in STRATEGY.md, fill empty/thin pillar x format
  cells, and mix formats (never more than 2 of one format in a batch unless asked).
- Pull candidates from content/backlog.yaml (status: open). If fewer than 2N fit, invent new ideas first-principles.
- For EACH candidate: `registry.py find "<title + hook>"`. Read the nearest 5 entries and judge meaning.
  Reject if a viewer would feel "they already did this". A new angle must write `"new_angle": "..."` in the spec
  and link the earlier Lore in `links.prerequisites`.
- Draft specs into episodes/<id>/spec.json, then `registry.py check episodes/<ids>/spec.json`. Replace every FAIL.
- Write batches/<batch>.json: {batch, created, episodes:[ids], rationale per id}. Mark used backlog items `taken: <id>`.

## 3. Research
- Web-search every factual claim, definition, statistic and legend reference. Prefer primary sources (books,
  exchange/issuer docs, the legend's own writing or interviews). Store in `sources`. Paraphrase.
- If a claim cannot be verified, cut it.

## 4. Data and simulations
- Charts: `python data/fetch.py <SYMBOL> <start> <end>` (cached). Enforce end <= today - 90 days.
  Prefer famous historical leaders; vary symbols across the library (check registry for reuse).
- Simulations: `sims/<slug>.py`, fixed seed, writes episodes/<id>/sim.json. Assumptions go on screen.

## 5. Script
- Write in the voice of content/VOICE.md: read it first. Name the one `emotion` in the spec. Hook = a feeling + the
  number. One or two jokes, tied to the lesson. Read every caption out loud; voice_check runs inside spec_lint.
- beats[] with component + props + caption + sfx. Hook (payoff visual + question) inside 1.5s.
- One idea. 30–75s (lexicon 12–20s). Captions <= 12 words, >= 0.35s/word + 0.8s on screen.
- End: tripwire snap -> "Lore N. Next: Lore N+1 — <title>" (an `end` beat + spec `next`). Run
  `python scripts/spec_lint.py episodes/<id>/spec.json` until PASS. Set status `scripted`.

## 6. Build and render
- Reuse components. A missing component: build it in engine/components/metaphors (tokens only), add to gallery.
- Render 3 key stills per aspect (hook, peak, end): `node scripts/render_batch.mjs batches/<batch>.json --stills`
  -> episodes/<id>/stills/, and VIEW them. Fix before full render. Full renders: `node scripts/render_batch.mjs batches/<batch>.json`.
- Full renders: `engine/out/<id>-4x5.mp4` and `<id>-9x16.mp4`, one command per render, in the background.
  Thumbnail (1280x720) and cover (1080x1920) from Remotion stills into publish/<id>/. Status `rendered`.
- Music: design each episode's song BEFORE timing the spec: `python scripts/sound/song.py <id>` (writes and freezes
  episodes/<id>/song.json, prints the bar length). Time beats in whole bars of that tempo; end beat >= 2 bars + 1 s,
  no `vertexAt`. render_batch composes the score. Run `python scripts/sound/score.py <id> --report`: read the cue
  sheet against the beats (falls on losses, drops on reveals, the sonic logo on the end card, the wire snap on its
  breakout note) and fix anything off the grid. `python scripts/sound/song.py --audit` shows the library's variety.
  Commit song.json with the spec. A component without an interpreter gets a default groove by beat kind.

## 7. QA loop (max 3 passes per entry; log every pass in episodes/<id>/qa.md)
Extract frames every 2s and at every beat boundary (`SHEET=1 scripts/frames.sh engine/out/<id>-<aspect>.mp4`), VIEW them, and score:
1. Truth: every claim matches a source; numbers recomputed from data/sim.
2. Compliance: the 9 rules in CLAUDE.md.
3. Clarity: one idea; a first-time viewer gets it muted.
4. Brand: tokens only, Sodium once per frame, TapeStrip intro/outro, snap on breakout, sonic logo on the end card.
5. Craft: safe zones, caption timing, no overlaps/clipping, contrast, smooth motion, audio peaks <= -1 dBFS.
6. Distinct: still not a repeat after seeing it rendered.
Fix and re-render failing entries. If an entry cannot pass in 3 passes, drop it, mark backlog item `blocked`, explain.

## 8. Package (per entry: publish/<id>/meta.json). Same voice as the video (content/VOICE.md, "Per platform").
- `x`: post <= 280 chars: the hook line, then the punchline that makes it click, "Lore NNN · <title>". No hashtags.
  First reply = the real-world proof, then "Next: Lore NNN · <title>". Council/whatif may add a `thread` (each <= 280).
- `instagram`: caption opens with the hook (first 125 chars), short paragraphs teaching the idea like you'd tell a
  friend, numbers as a list, one light line, a useful send/save line (never "follow for more"), the disclaimer,
  then <= 5 hashtags (always #TheTapeLore + 3–4 topic tags matched to search terms).
  `alt_text` describing the visual. `cover_frame_s`.
- `youtube`: title = the feeling + the number in searchable words, then "| Lore NNN" (<= 60 chars ideal, 100 max).
  Description: the hook in the first two lines, 2–3 lines of value, prerequisites/next as "Lore NNN, title", sources,
  the disclaimer, <= 3 hashtags.
  `tags` (<= 500 chars total), `playlist` = pillar name.
- `files`: video_4x5, video_9x16 (prefix `release:` when they live in the Release), thumb, cover. `duration_s`, `aspect_primary`.
- Run `python scripts/validate_publish.py --write-md publish/<id>` until PASS (it also runs voice_check). Then read the
  copy out loud once more.

## 9. Register
`registry.py add episodes/<ids>/spec.json`, then `registry.py status <id> qa_passed` for each.

## 10. Deliver (mode in CLAUDE.md)
- session: commit to `main` (no MP4s in git), push.
  `gh release create batch-<batch> engine/out/<ids>*.mp4 publish/<ids>/thumb.png --title "Batch <batch>" --notes-file batches/<batch>-report.md`
- actions: commit to `main`, push, then `gh workflow run render.yml --ref main -f batch=<batch> -f ref=main`; watch it with `gh run view <run-id>` until it finishes (it also marks entries released).
- `registry.py status <id> released --release batch-<batch>`.

## 11. Report (batches/<batch>-report.md, also printed)
Table: Lore, title, pillar/format, duration, QA passes, release link, warnings. Then suggested posting slots from
STRATEGY.md cadence, and the 3 thinnest coverage cells to target next batch.
