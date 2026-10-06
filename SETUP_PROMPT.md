# One-time setup prompt

Paste this into a new Claude Code cloud session on the empty `studio` repo, after committing this kit to it.

```
You are co-founder and studio lead of The Tape Lore (@TheTapeLore), a faceless trading-education library on X,
Instagram and YouTube where every piece is built in code. This repo already contains the founder's kit:
CLAUDE.md (read it first; it is the law), brand/ (tokens, assets, generators, fonts), content/ (strategy, pillars,
formats, metaphors, legends, council questions, backlog, empty registry), config/platforms.yaml,
scripts/registry.py and scripts/validate_publish.py (tested; keep their interfaces), data/fetch.py,
.claude/commands/ (the slash commands), .github/workflows/render.yml.

Build the studio around it. Work autonomously; ask me only for credentials or spending.

1. Engine: create engine/ as a Remotion + TypeScript project (latest stable), fonts from @fontsource
   (big-shoulders-display, martian-mono, atkinson-hyperlegible-next), all styling from brand/tokens.json.
   - components/brand: Mark (from tokens.mark), Lockup, TapeStrip (unspool in/out), BlueprintGrid, CornerBug.
   - components/captions: caption cards (<= 12 words; >= 0.35s/word + 0.8s), safe-zone aware.
   - components/charts: CandleChart (bar-by-bar reveal, hollow up / Ember down), VolumePane, MovingAverages
     (10/21/50/200), RSLine, Tripwire (snaps + sfx hook), Annotation, PercentMeasure.
   - components/metaphors: build every entry in content/metaphors.yaml (ThePit, RTower, Seesaw, MarketWeather,
     TheRace, Anatomy, FiveExits, Throttle, Hourglass, Rope, PayoffDiagram, InnerChart, CouncilArc, LegendCard).
     Match the samples in brand/assets (pit, card) and update metaphors.yaml status.
   - formats/: one composition per format in content/formats.yaml, each fully driven by episodes/<id>/spec.json,
     rendering at 1080x1350 and 1080x1920 (and 1920x1080 for chapters). Thumbnail and cover as <Still>s.
   - A `gallery` composition showing every component for visual QA.
2. scripts/render_batch.mjs: renders every episode in batches/<id>.json (both aspects + stills) to engine/out/,
   one at a time, resumable (skip finished files), printing progress. scripts/frames.sh: ffmpeg frame sampler.
3. scripts/sound/gen_cues.py: synthesise snap, tick, whoosh, tape-unspool cues (numpy, -14 LUFS-ish, peaks < -1 dBFS)
   into engine/public/sfx/. No copyrighted music, ever.
4. Delivery smoke test: render a 2-second test clip, try `gh release create smoke-test <file>` then delete that
   release. If it works set `delivery: session` in CLAUDE.md, else make render.yml work end to end
   (`gh workflow run`) and set `delivery: actions`.
5. Produce Lore 001 "The Pit" (backlog B001) end to end with /batch rules: spec, render, view frames, QA loop,
   package, validate, register, deliver. Fix anything in the engine the QA reveals.
6. Update README.md "Status" with what was built, how to run each command, and anything I must do by hand.
Open a PR with everything. Then summarise in chat.
```
