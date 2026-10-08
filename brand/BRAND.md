# The Tape Lore — brand guide

## Idea
"Tape" is the trader's word for price action. "Lore" is the knowledge passed down from those who came before.
The look is a **cyanotype blueprint**: deep Prussian blue, a faint drafting grid, ink-white lines, and one
amber Sodium highlight, like the glow of a ticker. It says *engineered, studied, calm*, the opposite of the
neon-on-black hype feed.

## The mark: the Snapped Tripwire
A Tape-white price line makes three shrinking pullbacks (a volatility contraction) beneath a Sodium pivot
line, then breaks up through it. The wire **snaps** and both broken ends recoil. It is the single most
satisfying moment in trading, and the brand repeats it at the end of every video with the snap sound.
- Clear space: half the mark's height on every side. Minimum size: 24px.
- Use `mark-transparent-for-dark-bg` on Prussian/Abyss, `mark-transparent-for-light-bg` on Tape/white.
- Don't recolour, rotate, outline, add shadows, or redraw the zigzag.

## Colour
| Token | Hex | Job |
|---|---|---|
| Prussian | #0F2A47 | Base background |
| Abyss | #081A2E | Depth, vignette edges, card backs |
| Blueline | #2F5D8A | Grid, lanes, hairlines, secondary chart elements |
| Tape | #EAF0F2 | Primary ink: text, price line, hollow up-candles |
| Sodium | #FFB21A | The one highlight per frame: pivot tripwire, the key number, the leader |
| Ember | #E8574F | Losses, down candles, redlines (functional only) |
| Lichen | #7FD1B0 | Gains, RS line (functional only, sparing) |
| Mist | #9DB4C8 | Secondary text, labels |

## Type
- **Big Shoulders Display 800/900**: headlines and the numbers that matter. Built on Chicago's industrial
  lettering, the home of the futures exchanges.
- **Martian Mono 400/600**: the TapeStrip, Lore numbers, data labels. Tape text is uppercase with wide tracking,
  like ticker tape. Nowhere else uses uppercase labels.
- **Atkinson Hyperlegible Next 400/700**: captions and explanations. Chosen for legibility on phones.

## Signature devices
1. **TapeStrip**: a Tape-coloured band carrying "LORE 017   RISK & SIZING". It unspools in at the start and
   rolls out at the end of every video, and tops every thumbnail and post.
2. **Blueprint grid**: 54px at 1080 wide, 16% Blueline.
3. **Tripwire snap**: any breakout snaps the Sodium line with the snap sound (crack, upward whip, a chime rising a
   fourth onto the song's tonic: the channel's reward sound).
4. **Lore numbering**: three digits, always.

## Voice
A sharp friend who trades: warm, dry, a bit funny, exact with numbers. Sentence case. Never hype, never advice,
never P&L. Full guide and the research behind it: content/VOICE.md.
Good: "Down 50%? Cool. Now you just need +100%." Bad: "This one secret will 10x your account!!!" Also bad (AI tells):
"It's not just about losses, it's about recovery. Let's dive in."

## Asset index (brand/assets)
- logo/: marks (4 colourways, 1024), lockups (on Prussian, transparent for dark, transparent for light)
- profile/avatar-1080: one avatar for X, Instagram and YouTube (circle-safe)
- x/x-header-1500x500
- youtube/: banner 2560x1440 (+ safe-area guide, do not upload), watermark 150x150, sample thumbnail
- instagram/: highlight covers for all 9 sections, sample post 1080x1350, sample reel cover 1080x1920
- video/: transparent corner bug (mark) and lockup overlay for the engine
- glyphs/: 9 pillar icons, transparent and on Prussian tiles
- cards/: Legend Card front sample (Livermore), back, and print files 825x1125 with 0.125in bleed
Regenerate or extend everything with `python3 brand/gen/assets.py` and `python3 brand/gen/templates.py`
(needs `pip install cairosvg fonttools`). Text in every SVG is converted to outlines.
