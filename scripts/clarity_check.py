#!/usr/bin/env python3
"""
Clarity gate: will a first-time viewer understand this video, and will they learn something from it?

  python scripts/clarity_check.py episodes/L0004/spec.json [more ...]     -> FAIL/WARN per spec, exit 1 on FAIL

Run by spec_lint.py (every spec) and validate_publish.py (copy + qa.md). Rules in config/clarity.yaml:
  FAIL  no `learn` list (2-5 plain sentences: what a viewer can say after watching)
  FAIL  studio-internal words on screen ("Sodium", "Blueline" ...): viewers don't know our colour names
  FAIL  jargon on screen without a `glossary` entry, or a glossary definition that never appears on screen
  FAIL  a title inside a caption ("Legend 01. ..."): titles go on a title card
  FAIL  note-style shorthand in a caption ("At 14: posting stock prices"): write the sentence
  WARN/FAIL  reading grade of the caption script above the bar (Flesch-Kincaid)
Machines can't judge understanding: the qa.md "## Clarity" section (validate_publish checks it exists and passes)
records the human read: each `learn` point found on screen, and a first-time viewer's one-line restatement.
"""
import json, os, re, sys
import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CFG = yaml.safe_load(open(os.path.join(ROOT, "config", "clarity.yaml")))
TEXT_PROPS = ("myth", "fact", "text", "sub", "note", "label", "quote", "headline", "definition", "term", "title", "kicker", "question")


def _words(s):
    return re.findall(r"[A-Za-z][A-Za-z'’-]*|\d[\d,.$%]*", s)


def _syllables(w):
    w = w.lower().strip("'’")
    if not w or w[0].isdigit():
        return max(1, len(re.findall(r"\d", w)) // 2 or 1)
    w = re.sub(r"(?:[^laeiouy]es|ed|[^laeiouy]e)$", "", w) if len(w) > 3 else w
    w = re.sub(r"^y", "", w)
    return max(1, len(re.findall(r"[aeiouy]{1,2}", w)))


def fk_grade(text):
    sents = max(1, len(re.findall(r"[.!?]+", text)) or 1)
    ws = _words(text)
    if not ws:
        return 0.0
    syl = sum(_syllables(w) for w in ws)
    return 0.39 * len(ws) / sents + 11.8 * syl / len(ws) - 15.59


def captions(spec):
    out = []
    for b in spec.get("beats", []):
        out += list(b.get("captions") or ([b["caption"]] if b.get("caption") else []))
    return [c.replace("**", "") for c in out]


def _collect(o, out):
    if isinstance(o, dict):
        for k, v in o.items():
            if isinstance(v, str) and k in TEXT_PROPS:
                out.append(v)
            elif k == "items" and isinstance(v, list):
                for it in v:
                    if isinstance(it, str):
                        out.append(it)
                    else:
                        _collect(it, out)
            elif k == "events" and isinstance(v, list):
                out += [e.get("label", "") for e in v if isinstance(e, dict)]
            elif isinstance(v, (dict, list)):
                _collect(v, out)
    elif isinstance(o, list):
        for v in o:
            _collect(v, out)


def on_screen(spec):
    """Everything a viewer reads: captions, headlines, card/prop text, thumbnail and cover lines, carousel text."""
    out = captions(spec)
    for b in spec.get("beats", []):
        if b.get("headline"):
            out.append(b["headline"])
        _collect(b.get("props") or {}, out)
    for k in ("thumb", "cover"):
        st = spec.get(k) or {}
        out += list(st.get("lines") or []) + ([st["sub"]] if st.get("sub") else [])
        _collect(st.get("props") or {}, out)
    for sl in spec.get("carousel") or []:
        out += [sl.get(x) for x in ("headline", "sub") if sl.get(x)]
        _collect(sl.get("props") or {}, out)
    return [re.sub(r"\[\[|\]\]", "", t) for t in out if t]


def _norm(s):
    return re.sub(r"[^a-z0-9$%]+", " ", s.lower().replace("’", "'")).strip()


def internal_hits(texts):
    out = []
    blob = "\n".join(texts)
    for w in CFG["internal_words"]:
        if re.search(r"(?<![\w-])" + re.escape(w) + r"(?![\w-])", blob, re.I):
            out.append(w)
    for w in CFG.get("internal_words_case_sensitive", []):
        if re.search(r"(?<![\w-])" + re.escape(w) + r"(?![\w-])", blob):
            out.append(w)
    return out


def check(spec):
    E, W = [], []
    texts = on_screen(spec)
    caps = captions(spec)
    # 1. the viewer learns something, written down before anything is built
    L = CFG["learn"]
    learn = spec.get("learn") or []
    if len(learn) < L["min_items"]:
        E.append(f"clarity: `learn` needs {L['min_items']}-{L['max_items']} plain sentences (what a viewer can say after watching)")
    for x in learn:
        n = len(_words(x))
        if not L["min_words"] <= n <= L["max_words"]:
            E.append(f"clarity: learn point has {n} words ({L['min_words']}-{L['max_words']}): \"{x[:60]}\"")
    if len(learn) > L["max_items"]:
        W.append(f"clarity: {len(learn)} learn points; one idea per entry, {L['max_items']} at most")
    # 2. no studio vocabulary
    for w in internal_hits(texts):
        E.append(f"clarity: '{w}' is a studio word (our colour/brand name); viewers don't know it. Say what they see.")
    # 3. jargon is defined on screen
    gl = {k.lower(): v for k, v in (spec.get("glossary") or {}).items()}
    screen = _norm(" ".join(texts))
    needed = {}
    for rx, key in CFG["jargon"].items():
        for t in texts:
            m = re.search(rx, t, re.I if key != "R" else 0)
            if m:
                needed.setdefault(key, m.group(0))
    for key, hit in needed.items():
        d = gl.get(key.lower())
        if not d:
            E.append(f"clarity: jargon '{hit.strip()}' on screen with no glossary entry: add glossary {{\"{key}\": \"<plain definition>\"}} and show it")
        elif _norm(d) not in screen:
            E.append(f"clarity: glossary '{key}' is defined in the spec but its definition never appears on screen: \"{d}\"")
    # 4. captions read as speech, not notes or titles
    for c in caps:
        if re.search(CFG["caption_title_prefix"], c, re.I):
            E.append(f"clarity: title inside a caption (put it on a title card): \"{c}\"")
        if any(re.search(CFG["caption_shorthand"], sent, re.I) for sent in re.split(r"(?<=[.?!])\s+", c)):
            E.append(f"clarity: note-style shorthand, write the full sentence: \"{c}\"")
    # 5. reading level
    R = CFG["readability"]
    if caps:
        g = fk_grade(" ".join(caps))
        if g > R["script_grade_fail"]:
            E.append(f"clarity: caption script reads at grade {g:.1f} (max {R['script_grade_fail']}): shorter words, shorter sentences")
        elif g > R["script_grade_warn"]:
            W.append(f"clarity: caption script reads at grade {g:.1f} (aim <= {R['script_grade_warn']})")
        for c in caps:
            gc = fk_grade(c)
            if gc > R["caption_grade_warn"] and len(_words(c)) >= 6:
                W.append(f"clarity: hard caption (grade {gc:.1f}): \"{c}\"")
    return E, W


def check_copy(text):
    """Social copy: studio words only (copy is longer and may define terms in passing)."""
    return [f"clarity: '{w}' is a studio word; viewers don't know it" for w in internal_hits([text])]


def qa_clarity(eid):
    """The human read, recorded in episodes/<id>/qa.md under '## Clarity': each learn point checked on screen and a
    first-time viewer's restatement. Returns a list of problems."""
    p = os.path.join(ROOT, "episodes", eid, "qa.md")
    if not os.path.exists(p):
        return [f"no {os.path.relpath(p, ROOT)}"]
    txt = open(p).read()
    m = re.search(r"^## Clarity[^\n]*\n(.*?)(?=^## |\Z)", txt, re.M | re.S)
    if not m:
        return [f"qa.md has no '## Clarity' section (learn points checked on screen + a first-time viewer's restatement)"]
    sec = m.group(1)
    probs = []
    if not re.search(r"first-time viewer", sec, re.I):
        probs.append("qa.md Clarity: missing the first-time viewer restatement")
    if not re.search(r"\bPASS\b", sec):
        probs.append("qa.md Clarity: no PASS verdict")
    return probs


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    bad = 0
    for p in a:
        spec = json.load(open(p))
        E, W = check(spec)
        print(("FAIL  " if E else "PASS  ") + f"{spec.get('id')} {spec.get('title')}  (script grade {fk_grade(' '.join(captions(spec))):.1f})")
        for e in E:
            print("      x", e)
        for w in W:
            print("      !", w)
        bad += bool(E)
    sys.exit(1 if bad else 0)
