#!/usr/bin/env python3
"""
Subtitles for upload (YouTube, and anywhere else that takes .srt), from the spec, with exactly the on-screen timing.

  python scripts/make_srt.py L0001        -> publish/L0001/captions.srt

The captions are burned into the video too (feeds autoplay muted); the SRT is for accessibility, search and
auto-translation. Cue timing mirrors engine/components/captions/timing.ts: a beat's cards share the beat in
proportion to each card's minimum time (0.35 s/word + 0.8 s). The end card's line is added as the last cue.
validate_publish.py --write-md runs this for every package.
"""
import json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def words(s):
    return len(s.replace("**", "").split())


def clean(s):
    return re.sub(r"\[\[(.*?)\]\]", r"\1", s.replace("**", "")).strip()


def cues(spec):
    out = []
    for b in spec["beats"]:
        cards = b.get("captions") or ([b["caption"]] if b.get("caption") else [])
        if cards:
            need = [0.35 * words(c) + 0.8 for c in cards]
            t = b["t"]
            for c, n in zip(cards, need):
                d = b["dur"] * n / sum(need)
                out.append((t, t + d, clean(c)))
                t += d
        elif b.get("kind") == "end" and spec.get("next"):
            # the end card's text appears just after the wire snaps (~2 s in) and holds to the end
            nx = spec["next"]
            out.append((b["t"] + 2.2, b["t"] + b["dur"] - 0.05,
                        f"Lore {spec['lore_no']:03d}. Next: Lore {nx['lore_no']:03d}, {nx['title']}"))
    return out


def stamp(s):
    ms = int(round(s * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def write(eid):
    spec = json.load(open(os.path.join(ROOT, "episodes", eid, "spec.json")))
    lines = []
    for i, (a, b, text) in enumerate(cues(spec), 1):
        lines.append(f"{i}\n{stamp(a)} --> {stamp(b - 0.001)}\n{text}\n")
    path = os.path.join(ROOT, "publish", eid, "captions.srt")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return path


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    for eid in sys.argv[1:]:
        print("wrote", os.path.relpath(write(eid), ROOT))
