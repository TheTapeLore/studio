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
Kit delivered. Engine not built yet: run SETUP_PROMPT.md.
