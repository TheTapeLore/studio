#!/usr/bin/env python3
"""
Voice check: flags the AI tells listed in content/VOICE.md (config/voice.yaml) in on-screen text and social copy.

  python scripts/voice_check.py "some text"                   -> prints problems, exit 1 if any
  python scripts/voice_check.py --file publish/L0001/x.md     -> same, for a file

Used by spec_lint.py (captions, headlines, card text) and validate_publish.py (posts, captions, descriptions).
It catches the mechanical tells. Whether a line sounds like a person is still judged by reading it aloud.
"""
import os, re, sys
import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CFG = yaml.safe_load(open(os.path.join(ROOT, "config", "voice.yaml")))
_PHRASES = [(p, re.compile(r"(?<![\w-])" + re.escape(p).replace(r"\ ", r"\s+") + r"(?![\w-])", re.I)) for p in CFG["slop_phrases"]]
_PATTERNS = [re.compile(p, re.I | re.M) for p in CFG.get("patterns", [])]


def check(text, kind="post"):
    """Problems in one piece of text. kind: 'caption' (on-screen) or 'post' (social copy)."""
    out = []
    t = (text or "").replace("’", "'")
    for p, rx in _PHRASES:
        if rx.search(t):
            out.append(f"AI tell: '{p}'")
    for rx in _PATTERNS:
        m = rx.search(t)
        if m:
            out.append(f"AI tell (pattern): '{m.group(0).strip()}'")
    limit = CFG["em_dash"]["captions_max" if kind == "caption" else "post_max"]
    n = t.count("—")
    if n > limit:
        out.append(f"{n} em dashes (max {limit}): use a full stop, a comma or a colon")
    return out


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    text = open(a[1]).read() if a[0] == "--file" else " ".join(a)
    probs = check(text)
    for p in probs:
        print(p)
    print("PASS" if not probs else f"{len(probs)} problem(s)")
    sys.exit(1 if probs else 0)
