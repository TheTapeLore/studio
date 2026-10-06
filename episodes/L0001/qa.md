# QA — L0001 The Pit: why a 50% loss needs +100%

Batch 2026-10-06-a · anatomy · risk/math-of-losses · 55.4 s · 4x5 + 9x16

## Pre-render
- `spec_lint.py`: PASS (caption timing, beats contiguous 0 → 55.4 s, hook at 0 with visual + question, `end` beat, sources complete, data ends 2015-12-31).
- `registry.py check`: PASS (empty library).
- Key stills viewed (`stills/`): hook, peak (Nasdaq chart), end, both aspects. Fix before full render: the data window
  ended two months after the reclaim, cramping the tripwire recoil; extended the window to 2015-12-31.

## Truth (numbers recomputed from data)
| On screen | Computed | Check |
|---|---|---|
| −50% needs +100% | 0.5 / (1 − 0.5) = 1.00 | formula, exceljet |
| −10% +11% · −20% +25% · −25% +33% · −33% +49% · −75% +300% · −90% +900% | L/(1−L) | engine `recoveryGain`, rounded |
| $10,000 → $5,000 left; +$5,000 = +100% | 10,000 × 0.5 | arithmetic |
| Nasdaq −78% | 1,114.11 / 5,048.62 − 1 = −77.93% (closes 2000-03-10 → 2002-10-09) | yfinance data; Wikipedia "fell 78%" |
| +353% needed | 5,048.62 / 1,114.11 − 1 = +353.2% | yfinance data |
| "two and a half years" | 2000-03-10 → 2002-10-09 = 2.58 years | dates |
| "took until 2015" | first close above 5,048.62: 2015-04-23 (5,056.06) | data; CNN Money, NPR |
| Myth: up 50% from $5,000 = $7,500, still down 25% | 5,000 × 1.5 = 7,500; 7,500/10,000 − 1 = −25% | arithmetic |
Wire snap happens on the 2015-04-23 bar (computed `snapAt: auto` = first close above the March 2000 close).

## Pass 1 (full render, 4x5)
Frames: every 2 s + every beat boundary, 5 contact sheets viewed. Audio: ebur128.
1. Truth: PASS (table above).
2. Compliance: PASS. Education only, no calls or levels of today; data ends 2015 (> 90 days); no P&L/performance
   claims; no legends; 6 sources in spec; disclaimer in IG caption + YT description (validator); no simulation; no
   third-party media; sound is synthesised.
3. Clarity: PASS. One idea (the climb is measured from what's left). Muted: captions + numbers carry it.
4. Brand: PASS. Tokens only; Sodium = the climb arrow / tripwire / one highlighted word per frame (plus the corner
   bug); TapeStrip unspools in and rewinds out; snap on the Nasdaq reclaim and on the end card.
5. Craft: **FAIL**
   - Audio true peak **+0.2 dBFS** (rule ≤ −1). Cues are −1.2 dBTP individually; overlaps, the renderer's mix and AAC
     overshoot add ~3 dB. Fix: master-bus limiter in `render_batch.mjs` (verified on this file: **−1.8 dBTP, −13.2 LUFS**).
   - Table sweep: the big climb label (+613%, +900%) touches the table's loss column. Fix: 40 px gutter, narrower pit.
   - Last frame: the end card faded out with the beat. Fix: the last beat now holds its final frame.
   - Tooling: `frames.sh` let ffmpeg read the beat list from stdin (missing boundary frames) and sampled `fps=1/2`
     mid-interval (frames ~1 s late). Fixed: `-nostdin`, exact `-ss` timestamps.
6. Distinct: PASS (first entry; new beyond the brand sample: $0 bedrock line, keyframed sweep to −90%, real Nasdaq pit
   with a data-driven tripwire snap).

## Pass 2 (full re-render, 4x5 + 9x16 + thumbnail + cover)
Frames every 2 s (exact timestamps) + beat boundaries, contact sheets viewed for both aspects.
1. Truth: PASS (unchanged numbers; re-read on screen).
2. Compliance: PASS.
3. Clarity: PASS.
4. Brand: PASS.
5. Craft: PASS.
   - Audio, both aspects: **−13.2 LUFS integrated, −1.8 dBTP** (≤ −1 dBFS).
   - Table sweep labels clear the table at −75% / −90%; last frame holds the end card under the tape roll-out.
   - 9x16: everything inside the safe zone (top 250 / bottom 420 / right 150); the corner bug sits inside it.
   - Found and fixed during packaging: thumbnail and cover rendered their visual at frame 0 (undrawn pit) because
     `<Freeze>` is clamped to a Still's one-frame duration. Stills now run the clock forward with a negative
     `<Sequence>` offset; both re-rendered and viewed — they match brand/assets samples.
   - Files: L0001-4x5.mp4 1080x1350 h264/aac 55.4 s 3.0 MB; L0001-9x16.mp4 1080x1920 55.4 s 3.3 MB.
6. Distinct: PASS.

**Result: qa_passed after 2 passes.**
