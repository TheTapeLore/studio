#!/usr/bin/env python3
"""
Lint episode specs against the production and compliance rules in CLAUDE.md before anything is rendered.

  python scripts/spec_lint.py episodes/L0001/spec.json [more specs ...]
  python scripts/spec_lint.py --batch batches/2026-10-06-a.json

Checks (FAIL blocks the render, WARN needs a human look):
  schema: required fields, pillar/format/aspects valid, beats contiguous from 0 to duration_s
  duration within the format's range (content/formats.yaml)
  every beat component exists in engine/components/registry.ts
  captions: <= 12 words per card; on screen >= 0.35 s/word + 0.8 s (same split rule as the engine)
  hook: first beat starts at 0 with a visual and a caption; ends with an `end` beat and a `next` entry
  compliance: sources present and complete; data ends >= 90 days before today; simulations seeded;
              banned phrases and emoji (config/platforms.yaml) absent from title, hook, captions, headlines
"""
import datetime, json, os, re, sys
import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CFG = yaml.safe_load(open(os.path.join(ROOT, "config", "platforms.yaml")))
FORMATS = yaml.safe_load(open(os.path.join(ROOT, "content", "formats.yaml")))["formats"]
PILLARS = ["conditions", "selection", "setups", "risk", "exits", "leverage", "operator", "legends"]
ASPECTS = ["4x5", "9x16", "16x9"]
REGISTRY = os.path.join(ROOT, "engine", "components", "registry.ts")
DEFAULT_BY_KIND = {"end", "poll", "freeze", "rule", "misconception", "term", "quote", "assumptions", "title", "chapter"}
MAX_WORDS = 12


def components():
    src = open(REGISTRY).read()
    block = src[src.index("COMPONENTS"):]
    return set(re.findall(r"^\s+(\w+)(?::|,)", block, re.M))


def words(s):
    return len([w for w in s.replace("**", "").split() if w])


def min_secs(s):
    return 0.35 * words(s) + 0.8


def cues(beats):
    out = []
    for b in beats:
        cards = b.get("captions") or ([b["caption"]] if b.get("caption") else [])
        if not cards:
            continue
        need = [min_secs(c) for c in cards]
        tot = sum(need)
        t = b["t"]
        for c, n in zip(cards, need):
            d = b["dur"] * n / tot
            out.append((c, t, d))
            t += d
    return out


def lint(spec, today=None):
    today = today or datetime.date.today()
    E, W = [], []
    for f in ["id", "lore_no", "slug", "pillar", "format", "concept_key", "title", "hook", "takeaway", "duration_s", "aspects", "beats", "sources"]:
        if f not in spec or spec[f] in (None, "", []):
            (E if f != "sources" else E).append(f"missing field: {f}")
    fmt = spec.get("format")
    if spec.get("pillar") not in PILLARS:
        E.append(f"unknown pillar {spec.get('pillar')}")
    if fmt not in FORMATS and fmt != "chapter":
        E.append(f"unknown format {fmt}")
    for a in spec.get("aspects", []):
        if a not in ASPECTS:
            E.append(f"unknown aspect {a}")
    dur = float(spec.get("duration_s", 0))
    if fmt in FORMATS:
        lo, hi = FORMATS[fmt]["duration_s"]
        if not lo <= dur <= hi:
            E.append(f"duration {dur}s outside {fmt} range {lo}-{hi}s")
    beats = spec.get("beats", [])
    known = components()
    t = 0.0
    for i, b in enumerate(beats):
        if abs(b.get("t", -1) - t) > 0.011:
            E.append(f"beat {i + 1} starts at {b.get('t')}s, expected {t:.2f}s (beats must be contiguous)")
        t = b.get("t", 0) + b.get("dur", 0)
        c = b.get("component")
        if c and c not in known:
            E.append(f"beat {i + 1}: unknown component '{c}' (add it to engine/components/registry.ts)")
        if not c and b.get("kind") not in DEFAULT_BY_KIND:
            W.append(f"beat {i + 1} ({b.get('kind')}) has no component: only captions will show")
        if b.get("transition") == "cut" and i and beats[i - 1].get("component") != c:
            W.append(f"beat {i + 1}: 'cut' transition but the component changes")
    if beats and abs(t - dur) > 0.011:
        E.append(f"beats end at {t:.2f}s but duration_s is {dur}s")
    # captions
    for text, start, d in cues(beats):
        if words(text) > MAX_WORDS:
            E.append(f"caption has {words(text)} words (max {MAX_WORDS}): \"{text}\"")
        if d + 1e-6 < min_secs(text):
            E.append(f"caption on screen {d:.2f}s, needs {min_secs(text):.2f}s: \"{text}\"")
    # hook and end
    if beats:
        b0 = beats[0]
        if b0.get("t") != 0 or not (b0.get("component") or b0.get("kind") in DEFAULT_BY_KIND):
            E.append("first beat must start at 0 with the payoff visual")
        if not (b0.get("caption") or b0.get("captions") or b0.get("headline")):
            E.append("hook beat needs its question on screen (caption or headline) inside 1.5 s")
        if beats[-1].get("kind") != "end":
            E.append("last beat must be the `end` beat (tripwire snap + next Lore)")
        if fmt not in ("desknotes",) and not spec.get("next"):
            W.append("no `next` {lore_no, title}: the end card will not name the next Lore")
    # compliance
    srcs = spec.get("sources") or []
    for k, s in enumerate(srcs):
        for f in ("title", "url", "used_for"):
            if not s.get(f):
                E.append(f"sources[{k}] missing {f}")
    d = spec.get("data") or {}
    if d.get("end"):
        end = datetime.date.fromisoformat(d["end"][:10])
        if (today - end).days < 90:
            E.append(f"data ends {end}: under 90 days before today")
    sim = spec.get("simulation")
    if sim and sim.get("seed") is None:
        E.append("simulation without a fixed seed")
    if fmt == "whatif" and not any(b.get("kind") == "assumptions" or b.get("component") == "AssumptionsPanel" for b in beats):
        E.append("whatif must state its assumptions on screen (an `assumptions` beat)")
    if spec.get("pillar") == "leverage":
        W.append("leverage: confirm the losing side has equal prominence (rule 3) when you view the frames")
    texts = [spec.get("title", ""), spec.get("hook", ""), spec.get("takeaway", "")]
    for b in beats:
        texts += [b.get("caption") or "", b.get("headline") or ""] + list(b.get("captions") or [])
    blob = " ".join(texts)
    for p in CFG["banned_phrases"]:
        if p.lower() in blob.lower():
            E.append(f"banned phrase '{p}'")
    for e in CFG["banned_emoji"]:
        if e in blob:
            E.append(f"banned emoji {e}")
    return E, W


def main():
    a = sys.argv[1:]
    if not a:
        print(__doc__); sys.exit(0)
    if a[0] == "--batch":
        b = json.load(open(a[1]))
        paths = [os.path.join(ROOT, "episodes", i, "spec.json") for i in b["episodes"]]
    else:
        paths = a
    bad = 0
    for p in paths:
        spec = json.load(open(p))
        E, W = lint(spec)
        print(("FAIL  " if E else "PASS  ") + f"{spec.get('id')} {spec.get('title')}")
        for e in E: print("      x", e)
        for w in W: print("      !", w)
        bad += bool(E)
    print(f"\n{len(paths) - bad}/{len(paths)} specs passed")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
