# QA — L0004 Legend 01: Jesse Livermore (rebuilt 2026-10-09)

Batch 2026-10-09-b · legendcard (Legend story) · legends · 101.3 s (38 bars) · 4x5 + 9x16 · card front/back, print
files, 6-slide carousel. Song unchanged (frozen): B minor, 90 BPM boom bap, iv i VII VI, glide lead.

## Why it was rebuilt (founder review of the first release)
The 24 s card reveal was too short and taught nothing: "Legend 01" and "At 14:" shared a caption, "At 14: posting
stock prices, $5 a week" read as notes, and "He made fortunes and lost them. Study both." pointed at a lesson without
giving it. It also never said why he is called a legend. The new cut is a Legend story: title, who, the record, why a
legend, the method, the mistakes with their causes, his rules, the card. The engine and the playbooks changed with it
(clarity gate, see CLAUDE.md and content/VOICE.md "Teach, don't allude").

## Research (content/legends/livermore.md)
- His own 1940 book read for causes: ch. VI "The Million Dollar Blunder" (impatience: bought cotton before his pivotal
  point five times in six weeks, about $200,000 lost), ch. IV (lost every cent put into outside ventures; drew out cash
  after wins; tips and over-trading), ch. II and IV (never average losses), ch. V (the pivotal point).
- Reminiscences (1923): the cotton episode (kept buying a falling market on a friend's analysis, lost nearly all) and
  the 1907 day (stopped selling when asked, bought).
- Wikipedia (biography + the book's page): 1891 board boy; first trade at 15; 1907 $1M in a single day; J.P. Morgan
  asked him to stop short selling; 1908 Teddy Price cotton losses; bankruptcies 1915 and 1934; 1929 about $100M;
  Reminiscences still in print, Paul Tudor Jones foreword (2009), Greenspan's praise.
- Disagreements handled: bankruptcy count differs between sources (two vs three): we say "more than once". The 1929
  figure is "reportedly". The fortune line is labelled "sketch, not to scale".

## Truth
| On screen | Source |
|---|---|
| Made $1 million in a day (1907 panic, betting on falling prices) | Wikipedia ("$1 million in a single day") |
| Went bankrupt more than once (1915, 1934) | Wikipedia + second biography source |
| At 14, writing stock prices on a big board; first trade at 15 | Wikipedia (1891 board boy; 1892 first bucket-shop trade) |
| 1929: about $100 million, reportedly | Wikipedia ("approximately $100 million") |
| Taught himself to read markets from prices alone (technical analysis) | Wikipedia |
| 1907: J.P. Morgan asked him to stop selling. He did. | Wikipedia; Reminiscences |
| A century on, traders still study his story | Reminiscences in print; 2009 annotated edition |
| Pivotal point: a price that starts the move; buy the break; add only while it rises; sit tight | How to Trade in Stocks, ch. V-VI |
| 1908: followed a friend's cotton tips; kept buying as it fell; most of his fortune went | Wikipedia (Teddy Price); Reminiscences |
| Lost every cent he put into outside businesses | How to Trade in Stocks, ch. IV |
| Rules: don't jump early (about $200,000 cotton blunder); never add to a loser; your rules over tips; take some profit out | How to Trade in Stocks, ch. II, IV, VI |

## Clarity
- Learn 1, who he was and why a legend: title card + "who" + "record" beats (14 → board job, 15 → first trade, 1907 and
  1929 wins drawn on the fortune line) and the "Why he's a legend" list (self-taught; J.P. Morgan; still studied).
- Learn 2, the pivotal point: defined in the caption ("a price that starts the move"), drawn: WAIT under the line,
  ACT as it snaps, two ADD markers, SIT TIGHT.
- Learn 3, why he lost: three causes, each in a plain sentence (friend's tips, kept buying the fall, outside
  businesses), each marked on the fortune line (1908, 1915, 1934).
- Learn 4, his rules: four numbered rules, each with the loss that taught it.
- clarity_check: PASS (no studio words, the one jargon term defined on screen, no titles or shorthand in captions,
  script grade 2.1). LEGEND 01 sits alone on the title card; no caption starts with it.
- First-time viewer restatement: "Livermore was a self-taught trader who made millions by waiting for a key price
  and riding the move, then lost them by following tips and buying more as cotton fell; his rules are what those
  losses taught him."
**Clarity: PASS.**

## Compliance
Education only; abstract emblem (rule 5), no likeness; sources in the spec (rule 6); the fortune line and the pivotal
point are labelled as sketch / illustration; disclaimer in IG + YouTube (rule 7); song generated (rule 9). Respect:
mistakes taught plainly, never mocked; his death not mentioned.

## Pass 1 (full render 4x5 + 9x16)
- Frames every 2 s + beat boundaries viewed in both aspects. Loudness −14.1 LUFS, true peak −3.45 dBTP.
- Music: full groove on the title; impact on 1907; build into the 1929 win (drop on bar 9, 21.33 s, as the caption
  "In 1929..." starts); chorus on "why a legend"; breakdown under the wire, drop on the pivotal-point snap (45.33 s);
  a fall into each loss (1908, 1915, 1934) with darker chords; chorus on his rules; sonic logo and wire snap on the
  end card (96.0 s).
- Stills fixes before this render: loss labels piled on the baseline (now lanes under the year axis with leader
  lines; each beat shows only the events it talks about); ADD collided with SIT TIGHT; "BROKE" under the line's end.
- Found in the render: the rules list sat ghosted for 5 s before its first rule lit. Fix: rule 1 appears with the
  first line, the others with their captions (0.4 / 6.0 / 8.95 / 10.9 s). Checked with stills; the Release renders
  include it.

## Pass 2
1. Truth: PASS. 2. Compliance: PASS. 3. Clarity and learning: PASS (above). 4. Brand: PASS (one Sodium per frame:
   the emblem diamond, the pivotal-point line, the newest rule number; TapeStrip in/out; snap on the pivotal point and
   on the end card). 5. Craft: PASS (captions timed by lint, three-line captions fit 9x16, labels clear).
   6. Distinct: PASS (first Legend story; new components LegendTitle, FortuneLine, ListCard).
**Result: qa_passed after 2 passes.**
