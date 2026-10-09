# The Tape Lore — studio kit

Everything the channel needs: brand assets, the content strategy, and a Claude Code studio that plans,
renders, checks, packages and releases new videos without repeating itself.

## 1. Set up the accounts (once, by hand)
| Platform | Upload | File |
|---|---|---|
| X | Profile photo | brand/assets/profile/avatar-1080.png |
| X | Header | brand/assets/x/x-header-1500x500.png |
| Instagram | Profile photo | brand/assets/profile/avatar-1080.png |
| Instagram | Highlight covers (Start here, Risk, Selection, Setups, Exits, Conditions, Leverage, Operator, Legends) | brand/assets/instagram/highlight-*.png |
| YouTube | Profile picture | brand/assets/profile/avatar-1080.png |
| YouTube | Banner | brand/assets/youtube/youtube-banner-2560x1440.png |
| YouTube | Video watermark (Customization → Branding) | brand/assets/youtube/youtube-watermark-150.png |

Bio (all platforms): `A visual library of how trading works. Risk, setups, exits, leverage, psychology and the
legends, drawn from data, not hindsight. Education only, not advice.`
Display name: `The Tape Lore`. Handle: `TheTapeLore`. Same name on YouTube, Instagram, X, and the .com if free.

## 2. Set up GitHub and Claude Code
1. Create the GitHub organisation `TheTapeLore` (owner: your personal account) and a private repo `studio`.
2. Commit this whole kit to `main`.
3. At claude.ai/code: connect GitHub, then create the environment in **ENVIRONMENT.md**.
4. Start a session on `TheTapeLore/studio` in that environment and paste **SETUP_PROMPT.md**.
5. Review and merge the PR it opens. Lore 001 will be waiting in a GitHub Release.

## 3. Make content (repeat forever)
| Command | What it does |
|---|---|
| `/batch 6` | 6 new entries following the season plan and filling gaps. Never repeats (registry). |
| `/batch 4 risk,leverage whatif,anatomy` | Same, filtered by pillars and formats. |
| `/episode "why stops below the low get hunted"` | One specific idea. |
| `/desk "<your raw notes>"` | Your own lesson or favourite thing, cleaned into the brand voice. |
| `/legend-card next` or `/legend-card "Peter Brandt"` | Researched, sourced Legend Card + reveal video + carousel + print files. |
| `/council next` or `/council "Do you hold through earnings?"` | Legends answer one question side by side. |
| `/sim "what if I risk 2% instead of 0.5%?"` | What If Lab: a seeded simulation, animated. |
| `/metaphor ThePit` | Build or upgrade a visual-metaphor component. |
| `/map` | Rebuild the curriculum Map, pinned post, playlists, highlight plan (monthly). |
| `/backlog 40` | Refill ideas where the library is thin. |
| `/calendar 2` | Two-week posting plan with copy ready to paste. |
| `/article risk` | Monthly X Article + YouTube Chapter. |
| `/review <batch>` | Re-run quality checks. |
| `/specs-check` | Re-verify platform limits (monthly). |
| `/print-cards all` | Print-ready card PDF (asks you before anything is ordered). |

Every entry lands as: videos in the GitHub Release `batch-<id>`, and copy in `publish/<id>/x.md`,
`instagram.md`, `youtube.md` (title, description, tags, hashtags, alt text, playlist, thumbnail, cover).

## 4. What's where
- `CLAUDE.md`: the studio's brain (mission, voice, compliance, rules, workflow). Edit it to change how Claude works.
- `content/STRATEGY.md`: audience, authority map, search intent, Season 1 calendar, linking, metrics.
- `content/registry.json`: the memory of everything made. `scripts/registry.py` blocks repeats.
- `config/platforms.yaml`: platform limits; `scripts/validate_publish.py` enforces them.
- `brand/`: guide, tokens, assets, generators, fonts.

## 5. Before money is involved
- Remotion is free for individuals and very small companies; check remotion.dev/license as you grow.
- Physical Legend Cards use real names commercially: get a lawyer's view on publicity rights before selling.
- Yahoo data is fine for education; consider a licensed data source if the channel is monetised.

## Status
Studio built (2026-10-06). Released: Lore 001 (The Pit), Lore 002 (Mostly Wrong, 2026-10-09), Lore 003 (The Ruler), Lore 004 (Legend 01: Livermore), Lore 005 (The Seesaw) (batch 2026-10-09-b). Delivery mode: **actions** (see CLAUDE.md).

### What was built
| Part | Where | Notes |
|---|---|---|
| Render engine | `engine/` | Remotion 4.0.533 + TypeScript + React 19. Fonts from `@fontsource`. Every colour, size, ease and safe zone comes from `brand/tokens.json` via `engine/tokens.ts`. |
| Brand components | `engine/components/brand` | Mark (draws, then the wire snaps), Lockup, TapeStrip (unspools in, rewinds out, right-hand compliance label), BlueprintGrid + Paper, CornerBug. |
| Captions | `engine/components/captions` | Burned-in cards, safe-zone aware. Timing rule (≤ 12 words, ≥ 0.35 s/word + 0.8 s) lives in `timing.ts` and in `scripts/spec_lint.py`. |
| Charts | `engine/components/charts` | CandleChart (bar-by-bar reveal, hollow up / Ember down, line mode, no-hindsight y-range), VolumePane, MovingAverages 10/21/50/200, RSLine, Tripwire (snaps + snap sound), Annotation, PercentMeasure, plus RunsFan and Distribution for the What If Lab (median and worst-5% always both shown). One shared scale. |
| Metaphors | `engine/components/metaphors` | All 14 in `content/metaphors.yaml` (status now `built`) + PitCurve. Every number on screen is computed (recovery math, Black–Scholes, sizing, exits, margin). Abstract legend emblems only. |
| Formats | `engine/formats` | One spec-driven composition per format (anatomy, council, whatif, replay, failure, lexicon, desknotes, legendcard) at 1080x1350 and 1080x1920, plus `chapter` at 1920x1080. Thumbnail (1280x720) and cover (1080x1920) are `<Still>`s. Demo specs for each in `engine/samples`. |
| Gallery | compositions `gallery`, `gallery-9x16`, `gallery-16x9` | Every component in the real frame with safe-zone guides. |
| Music | `scripts/sound/song.py` + `score.py` → `engine/public/score` | The Tape Machine v4: every Lore gets its own song. `song.py <id>` designs it (key, mode, tempo, chords, an 8-bar hook, groove, lead/bass/arp) and freezes it in `episodes/<id>/song.json`; the song memory keeps each new song away from recent keys, progressions, sounds and grooves and from every earlier hook. The constant signature is the sonic logo: the mark's path as nine notes, played on every end card in the song's key while the mark draws, its breakout note on the wire snap. `score.py` arranges the song from the data (falls, darker chords, withheld breakout notes, builds and drops, filter sweeps) in one continuous groove; picture is cut to the bar grid and loops seamlessly. `song.py --audit` reports variety; `sampler.py` + the `song-sampler` composition audition the next songs. |
| Sound | `scripts/sound/gen_cues.py` → `engine/public/sfx` | snap, tick, click, whoosh, tape-in, tape-out, dig, rise. Pure numpy synthesis, BS.1770 loudness, true peak ≤ −1.2 dBTP. No samples, no music. |
| Simulations | `sims/risk_per_trade.py` | Seeded numpy template for /sim: writes `episodes/<id>/sim.json` (downsampled runs + per-run outcomes + assumptions + analytic check). Its demo output drives the whatif sample. |
| Tooling | `scripts/` | `render_batch.mjs` (resumable), `frames.sh` (QA frames + contact sheets), `spec_lint.py`, `prepare_data.py`. |
| Delivery | `.github/workflows/render.yml` | Lint → render → validate → Release `batch-<id>` → registry `released`. Smoke-tested 2026-10-06. |

### How to run things
Inside a Claude Code session, the slash commands in section 3 do everything. By hand:
```bash
cd engine && npm ci && npx remotion studio                    # preview every episode, format and the gallery
python scripts/spec_lint.py episodes/L0001/spec.json          # rules check before rendering
python scripts/registry.py check episodes/L0001/spec.json     # no-repeat check
python scripts/prepare_data.py L0001                          # spec.data -> episodes/L0001/data.json
node scripts/render_batch.mjs batches/2026-10-06-a.json --stills   # hook/peak/end stills -> episodes/<id>/stills
node scripts/render_batch.mjs batches/2026-10-06-a.json       # MP4s + thumb + cover -> engine/out, publish/<id>
node scripts/render_batch.mjs --gallery                       # one still per component -> engine/out/gallery
node scripts/render_batch.mjs --comp gallery --out engine/out/gallery.mp4
SHEET=1 scripts/frames.sh engine/out/L0001-9x16.mp4           # QA frames + contact sheets
python scripts/sound/song.py L0002                            # design + freeze an episode's song (prints the bar length)
python scripts/sound/score.py L0001 --report                  # bar-by-bar arrangement of the score
python scripts/sound/sampler.py && node scripts/render_batch.mjs --comp song-sampler --out engine/out/song-sampler.mp4
python scripts/sound/gen_cues.py                              # regenerate the sound cues
python scripts/validate_publish.py --write-md publish/L0001   # platform limits + copy-paste files
gh workflow run render.yml --ref <branch> -f batch=<id> -f ref=<branch>   # render + release in Actions
```

### Lore 001
- Spec, data, stills and QA log: `episodes/L0001/` (QA passed; see `qa.md`).
- Copy to paste: `publish/L0001/x.md`, `instagram.md`, `youtube.md`; thumbnail, cover and subtitles (`captions.srt`) in `publish/L0001/`.
- Videos: GitHub Release [batch-2026-10-06-a](https://github.com/TheTapeLore/studio/releases/tag/batch-2026-10-06-a) (MP4s, thumbnail, cover), created by the render workflow. Registry status: `released`.

### Lore 002 · 35% winners can beat 60% winners (What If Lab)
- Spec, simulation (`sims/win_rate_vs_payoff.py`, seed 7), song and QA log: `episodes/L0002/` (QA passed).
- Copy to paste, thumbnail, cover and subtitles: `publish/L0002/`.
- Videos: GitHub Release [batch-2026-10-09-a](https://github.com/TheTapeLore/studio/releases/tag/batch-2026-10-09-a). Registry status: `released`.

### Lore 003–005 · batch 2026-10-09-b
- Lore 003 · R: the only unit a trader needs (anatomy; sim `sims/r_multiples.py`, seed 3). Lore 004 · Legend 01: Jesse
  Livermore (Legend story, 101 s, rebuilt after founder review; fact sheet `content/legends/livermore.md`). Lore 005 · The Seesaw: wider stop, smaller size.
- Specs, songs, stills, QA logs: `episodes/L0003..L0005/`. Copy, thumbnails, covers, subtitles: `publish/L0003..L0005/`;
  Lore 004 also has the card front/back, print files (`print/`, with bleed) and a 6-slide carousel (`carousel-1..6.png`).
- Videos: GitHub Release [batch-2026-10-09-b](https://github.com/TheTapeLore/studio/releases/tag/batch-2026-10-09-b).
  Report and posting slots: `batches/2026-10-09-b-report.md`. Registry status: `released`.

### What you must do by hand
1. **Upload Lore 001 to 005** from their Releases and `publish/<id>/*.md`, in order (each description links back to the one before). Claude never posts.
2. **Check the Remotion licence** (remotion.dev/license) before monetising or hiring: it is free for individuals and very small companies; larger teams need a company licence. That is a money decision for you.
3. Nothing else needs credentials. Cloud sessions cannot create Releases themselves (HTTP 403 for this session type), which is why delivery runs through Actions with the workflow's own token.
