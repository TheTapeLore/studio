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

## Delivery
- Actions run https://github.com/TheTapeLore/studio/actions/runs/37506977740: lint, render (CI re-render from the
  spec), validate, Release https://github.com/TheTapeLore/studio/releases/tag/batch-2026-10-06-a with
  L0001-4x5.mp4, L0001-9x16.mp4, L0001-thumb.png, L0001-cover.png. Status `released`.
- The run's registry push-back failed (rendered files left the checkout dirty, so `pull --rebase` refused) while the
  step still reported success. Fixed in render.yml (`--autostash`, explicit failure); status recorded from the session.

## Pass 3: music (founder request, 2026-10-06)
Score composed from this spec by `scripts/sound/score.py` (cue sheet: `score.json`). No samples, no licensed music.
- Story check (cue sheet vs beats): hook = Dm9 with a 4-note fall and a 7-note climb that resolves (+100% = one octave);
  bedrock beat darkens to Gm9, the climb lands with the up arrow at 9.6 s; sweep: −10% climb 1 note, −20% 2 notes,
  −50% 7 notes (resolves), **−75% needs 21 notes, 11 fit (unresolved), −90% needs 63, 18 fit (unresolved)** while the
  harmony sinks Dm9 → Bbmaj7 → Gm9 → Eø7 → A7b9; Nasdaq: price voice traces the drawdown, harmony at 0.74 depth in
  2001–02, **D major on the 2015-04-23 snap**; myth: one held A, then D minor when the math lands; rule: Bbmaj9 → F/A →
  Dm9; end: the mark's path as six notes, D major on the wire snap. PASS.
- Spectrogram and waveform viewed: rising ladders at 20–25 s, the myth beat thinned to one note, swell at the end. PASS.
- Mix (4x5 render): **−15.5 LUFS integrated, −1.9 dBTP** (master: static gain to −15 LUFS, limiter −4 dBFS). PASS.
- Visuals unchanged (same spec); frames re-sampled, no regressions.
**Result: qa_passed with music.**

## Pass 4: music v2, the Tape Machine (founder feedback: piano felt unrelated; wants beat-driven, hooky)
Research: hook audio in the first 1–2 s, upbeat electronic/hip-hop holds short-form attention, drops on reveals, loops
that start and end on the same rhythm (YouTube counts replays as views). Score = dark trap 150 BPM (risk pillar).
- Story check (cue sheet `score.json`): groove + hit on frame 0; −50% hook = 808 slide; bedrock: tape stops at 4.4 s
  (808 slides 6 st), thin "what's left" groove from 6.4 s, riser 1 bar from 9.6 s, **DROP 11.2 s** with "+100%";
  sweep: −10%/−20% small lifts, −50% riser resolves into a drop (19.2 s), **−75% riser needs 3 bars, 1.2 fit;
  −90% needs 9, 2 fit: both cut off unresolved** while the drums thin out; Nasdaq: low-pass follows the drawdown
  (~260 Hz at −75%), ticker traces the price, **DROP on the 2015 snap (34.3 s)**; myth: tape stops, clock only, impact
  when the math lands (41.4 s); rule: full groove + the mark riff; end: riff note-for-note with the line, hit on the wire
  snap, last bar builds into frame 0. PASS.
- Spectrogram + waveform viewed (two iterations: v2a left a 5 s 808 drone after the bedrock tape-stop; fixed by
  restarting a thin groove on the next bar). PASS.
- Loop: end beat 4.0 → 4.6 s, video 56.0 s = 35 bars; seam rendered across the loop point: snare-roll build lands on the
  frame-0 hit. PASS.
- All 8 pillar genres compose at −16.8…−17.5 LUFS (music bus) and ≤ −1.5 dBTP. PASS.
- Final mix (4x5): **−14.3 LUFS, −1.8 dBTP**. Visuals unchanged apart from the 0.6 s longer end card. PASS.
**Result: qa_passed with music v2.**

## Pass 5: music v3, a song (founder: "no tune, no continuous motion"; reference: the 128 BPM motion reel)
Reference analysed: 128 BPM, Am–F–C–G one chord per bar, plucked arpeggio intro, four-on-the-floor from bar 3, one
continuous groove (LRA 3.9 LU), ringing final chord, −14.4 LUFS. Pace assessed for a 60 s captioned lesson: **120 BPM**
(2.0 s bars: two bars per caption; 15 frames per beat), melodic house, A minor.
- Hook = the logo (phrase A: E–A–D–B–D–C → A breakout; phrase B answers). Plays from frame 0. Every melody note sits in
  its chord's scale (checked: 0 out-of-scale notes).
- Spec retimed to whole bars (31 bars = 62.0 s): dig reaches the floor on bar 4; the +100% arrow lands on the 12.0 s drop;
  the Nasdaq reclaim snaps on bar 19 (revealDur 8.037); the math lands on bar 23; the end card draws the mark on the
  hook's notes and the wire snaps on the breakout downbeat (58.0 s). Frames at each moment viewed. PASS.
- Arrangement (score.json): hook → set-up → breakdown "what's left" (F–Dm–E, no breakout) → build → DROP → sweep
  darkening Dm → Bb → E with half-time drums and falls in key → filtered verse through the crash → DROP on the snap →
  myth breakdown → math lands → chorus (C–G–Am–F, both phrases) → end card → loop build. Continuous: LRA 5.4 LU. PASS.
- Visual fixes found in this pass: myth strike-through now follows wrapped lines (9x16); beat changes are hard cuts on
  the downbeat with the incoming beat entering from 40% (no blank frame on a downbeat). PASS.
- Loop seam rendered across the end: snare roll → frame-0 hit, continuous. PASS.
- Final mix, both aspects: **−14.1 LUFS, −2.9 dBTP**. PASS.
**Result: qa_passed with music v3.**

## Note: music v4 (2026-10-07, no re-render needed)
- Song memory introduced: this episode's song is frozen in `song.json` (A minor, 120 BPM, i VI III VII, the v3 hook).
  Its first phrase is now the channel's sonic logo, played on every later end card in that song's key.
- Regression: `score.py L0001` under v4 writes a WAV byte-identical to the released v3 score (`cmp` clean), so the
  released videos stay valid. score.json now labels bars 29–30 `logo1/logo2` (same notes as before).

## Pass 6: voice v2 + the new snap (founder, 2026-10-08: "snap feels a little funny"; "voice feels too AI generated")
- Snap: the old twang fell in pitch (reads as a cartoon fail). New snap = crack + upward whip + a chime rising a fourth
  onto the tonic (E5 → A5 here, in the song's key), short echo. In the 4x5 mix the A5 band jumps ~40x at 36.0 s (Nasdaq
  reclaim) and 58.0 s (end card, on the logo's breakout note). PASS.
- Voice: every caption, card line, thumbnail/cover line and all social copy rewritten per content/VOICE.md (hook = a
  feeling + the number; jokes tied to the lesson: "Cool.", "Bring snacks.", "Boring is the point"). voice_check: PASS
  (spec_lint and validate_publish). Read aloud: PASS.
- Truth for the new lines: "fifteen years" = 2000-03-10 close high → 2015-04-23 first close above it = 15.1 years;
  "One bad stretch: $5,000" = the 50% example; "That still leaves you down 25%" = 7,500 / 10,000 − 1. PASS.
- Stills viewed before the full render: fixed a myth caption that only repeated the card, a rule subline that wrapped
  and repeated the caption, and a thumbnail line that crowded the pit. Full 4x5 frames (44 + 5 sheets): PASS.
- Mix 4x5: −14.2 LUFS, peak −3.2 dBFS. PASS.
