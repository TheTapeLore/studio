#!/usr/bin/env python3
"""
Song sampler: hear how the library's songs differ before they ship. Each song plays as a 20-second short:
its hook (4 bars) -> its chorus (4 bars) -> the sonic logo on the end card (2 bars + 1 bar tail).

  python scripts/sound/sampler.py                         -> L0001's song + the next designed song for 5 pillars
  python scripts/sound/sampler.py risk risk setups ...    -> choose the pillars of the hypothetical next songs

Writes engine/public/score/sampler.wav (generated, not committed) and engine/samples/sampler.json (the timeline the
`song-sampler` composition draws: song cards with a piano roll of each hook). Designs nothing into the library: the
hypothetical songs are designed against the real song memory, exactly as the next episodes would be.
"""
import json, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import song as songlib
import score

ROOT = songlib.ROOT
GAP = 0.6


def short_spec(sg):
    bar = 240 / sg["bpm"]
    beats = [
        {"t": 0.0, "dur": 4 * bar, "kind": "hook"},
        {"t": 4 * bar, "dur": 4 * bar, "kind": "rule", "component": "RuleCard"},
        {"t": 8 * bar, "dur": 3 * bar, "kind": "end", "component": "EndCard"},
    ]
    return {"duration_s": 11 * bar, "beats": beats}


def main():
    pillars = sys.argv[1:] or ["risk", "setups", "leverage", "operator", "selection"]
    prior = songlib.library()
    songs = [dict(prior[0], label="Lore 001 (released)")] if prior else []
    for i, p in enumerate(pillars):
        s = songlib.design(f"NEXT{i + 1}", p, prior=prior)
        s["label"] = f"a future {p} episode"
        prior.append(s)
        songs.append(s)
    parts, segs, t = [], [], 0.0
    for k, sg in enumerate(songs):
        spec = short_spec(sg)
        S = score.compose_spec(spec, sg)
        mix = score.render(S)
        parts += [mix, np.zeros((2, int(GAP * score.SR)))]
        segs.append({
            "t": round(t, 4), "dur": round(S.dur, 4), "label": sg["label"], "song": score.summary(S),
            "mode": sg["mode"], "keypc": sg["key"], "beat": round(S.beat, 6), "melody": sg["melody"],
            "form": sg["form"], "logo": songlib.logo_notes(sg["mode"]),
            "bars": [{"m": b.m, "logo": b.logo, "chord": b.ch["name"], "melody": bool(b.melody),
                      "ci": b.j % 4 if b.deg is None and b.logo is None else None} for b in S.bars],
            "hook_quality": sg.get("hook_quality"), "max_similarity": sg.get("max_similarity"),
        })
        print(f"{t:6.1f}s  {songlib.describe(sg)}")
        t += S.dur + GAP
    out = np.concatenate(parts, axis=1)
    os.makedirs(os.path.join(ROOT, "engine", "public", "score"), exist_ok=True)
    score.write_wav(os.path.join(ROOT, "engine", "public", "score", "sampler.wav"), out)
    with open(os.path.join(ROOT, "engine", "samples", "sampler.json"), "w") as f:
        json.dump({"duration_s": round(t, 3), "vertex_beats": songlib.logo_vertex_beats(), "segments": segs}, f, indent=1)
    sims = [[songlib.similarity(a["melody"], b["melody"]) for b in songs] for a in songs]
    print("hook similarity (0 = unrelated, 1 = the same hook):")
    for i, (a, row) in enumerate(zip(songs, sims)):
        print(f"  {a['id']:7} " + " ".join("  -- " if i == j else f"{x:5.2f}" for j, x in enumerate(row)))
    print(f"wrote engine/public/score/sampler.wav ({t:.1f}s) and engine/samples/sampler.json")


if __name__ == "__main__":
    main()
