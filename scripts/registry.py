#!/usr/bin/env python3
"""
The Tape Lore — content registry (the channel's memory).

Every entry that has ever been planned, rendered or published lives in content/registry.json.
Nothing new is produced until `check` passes. This is what stops the channel repeating itself.

Commands
  python scripts/registry.py next-id                 -> next Lore number + id (e.g. 18 L0018)
  python scripts/registry.py check  <spec.json>...   -> exit 1 if any spec duplicates the library
  python scripts/registry.py add    <spec.json>...   -> record specs (status from spec)
  python scripts/registry.py status <id> <status> [--release TAG] [--url platform=URL]
  python scripts/registry.py coverage                -> pillar x format matrix + emptiest cells
  python scripts/registry.py find   "<text>"         -> nearest existing entries to an idea
  python scripts/registry.py stats

A spec is a JSON object with at least:
  id, lore_no, pillar, format, concept_key, title, hook, takeaway
Optional fields used by the duplicate rules:
  cluster, data:{symbol,start,end}, legends:[...], question, simulation:{script,params}
"""
import json, math, re, sys, os, datetime
from collections import Counter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
REG = os.path.join(ROOT, "content", "registry.json")

PILLARS = ["conditions", "selection", "setups", "risk", "exits", "leverage", "operator", "legends"]
FORMATS = ["anatomy", "council", "whatif", "replay", "failure", "lexicon", "desknotes", "legendcard"]
STATUSES = ["planned", "scripted", "rendered", "qa_passed", "released", "published", "retired"]

# Similarity thresholds (0..1). Tuned to be strict on wording echoes, lenient on shared jargon.
TEXT_FAIL = 0.58      # title/hook/takeaway cosine similarity that counts as a repeat
TEXT_WARN = 0.40
CONCEPT_COOLDOWN_DAYS = 45   # same concept_key in a different format must wait this long

STOP = set("""a an the and or but if of to in on at for from by with as is are was were be been being this that
these those it its into than then so not no do does did your you we our us they their them how why what when where
which who can will just more most very vs versus over under up down out about""".split())

def load():
    if not os.path.exists(REG):
        return {"version": 1, "entries": []}
    with open(REG) as f:
        return json.load(f)

def save(reg):
    reg["entries"].sort(key=lambda e: e.get("lore_no", 0))
    with open(REG, "w") as f:
        json.dump(reg, f, indent=2, ensure_ascii=False)
        f.write("\n")

def toks(s):
    words = [w for w in re.findall(r"[a-z0-9%+\-]+", (s or "").lower()) if w not in STOP and len(w) > 1]
    bigrams = [a + "_" + b for a, b in zip(words, words[1:])]
    return words + bigrams

def vec(entry):
    text = " ".join([entry.get("title", ""), entry.get("hook", ""), entry.get("takeaway", ""),
                     entry.get("concept_key", "").replace(".", " ").replace("-", " ")])
    return Counter(toks(text))

def cosine(a, b, idf):
    num = sum(a[t] * b[t] * idf.get(t, 1.0) ** 2 for t in a if t in b)
    na = math.sqrt(sum((v * idf.get(t, 1.0)) ** 2 for t, v in a.items()))
    nb = math.sqrt(sum((v * idf.get(t, 1.0)) ** 2 for t, v in b.items()))
    return num / (na * nb) if na and nb else 0.0

def build_idf(entries):
    docs = [set(vec(e)) for e in entries] or [set()]
    df = Counter(t for d in docs for t in d)
    n = len(docs)
    return {t: math.log((n + 1) / (c + 0.5)) + 1 for t, c in df.items()}

def parse_date(s):
    try:
        return datetime.date.fromisoformat(str(s)[:10])
    except Exception:
        return None

def overlap_days(a0, a1, b0, b1):
    if None in (a0, a1, b0, b1):
        return 0
    lo, hi = max(a0, b0), min(a1, b1)
    return max(0, (hi - lo).days)

def sim_signature(sim):
    if not sim:
        return None
    return json.dumps({"script": sim.get("script"), "params": sim.get("params")}, sort_keys=True)

def check_one(spec, entries, idf, today=None):
    """Return (errors, warnings) for a spec against existing entries (excluding itself)."""
    today = today or datetime.date.today()
    errs, warns = [], []
    for f in ["id", "lore_no", "pillar", "format", "concept_key", "title", "hook", "takeaway"]:
        if not spec.get(f) and spec.get(f) != 0:
            errs.append(f"missing field: {f}")
    if spec.get("pillar") and spec["pillar"] not in PILLARS:
        errs.append(f"unknown pillar '{spec['pillar']}' (use one of {PILLARS})")
    if spec.get("format") and spec["format"] not in FORMATS:
        errs.append(f"unknown format '{spec['format']}' (use one of {FORMATS})")
    # 90-day data rule (education only; never recent price action)
    d = spec.get("data") or {}
    end = parse_date(d.get("end"))
    if end and (today - end).days < 90:
        errs.append(f"data window ends {end}, which is under 90 days before today. Use older history.")
    sv = vec(spec)
    for e in entries:
        if e.get("id") == spec.get("id") or e.get("status") == "retired":
            continue
        tag = f"{e.get('id')} '{e.get('title')}'"
        if e.get("concept_key") == spec.get("concept_key"):
            if e.get("format") == spec.get("format"):
                errs.append(f"same concept_key + format as {tag}")
            else:
                ed = parse_date(e.get("created"))
                if ed and (today - ed).days < CONCEPT_COOLDOWN_DAYS:
                    errs.append(f"concept_key reused within {CONCEPT_COOLDOWN_DAYS} days of {tag}. Pick another angle or wait.")
                else:
                    warns.append(f"concept_key also covered by {tag} in format '{e.get('format')}'. Make sure the angle is new and link to it.")
        s = cosine(sv, vec(e), idf)
        if s >= TEXT_FAIL:
            errs.append(f"wording too close to {tag} (similarity {s:.2f})")
        elif s >= TEXT_WARN:
            warns.append(f"wording resembles {tag} (similarity {s:.2f})")
        ed_ = e.get("data") or {}
        if d.get("symbol") and ed_.get("symbol") and d["symbol"].upper() == ed_["symbol"].upper():
            ov = overlap_days(parse_date(d.get("start")), parse_date(d.get("end")),
                              parse_date(ed_.get("start")), parse_date(ed_.get("end")))
            if ov > 20 and e.get("format") == spec.get("format"):
                errs.append(f"same chart ({d['symbol']}, {ov} overlapping days) already used in this format by {tag}")
            elif ov > 20:
                warns.append(f"chart {d['symbol']} overlaps {ov} days with {tag}. Fine only if the lesson differs.")
        if spec.get("format") == "council" and e.get("format") == "council" and spec.get("question") and e.get("question"):
            qs = cosine(Counter(toks(spec["question"])), Counter(toks(e["question"])), idf)
            if qs >= 0.5:
                errs.append(f"council question already asked in {tag} (similarity {qs:.2f})")
        if spec.get("format") == "legendcard" and e.get("format") == "legendcard":
            if set(map(str.lower, spec.get("legends", []))) & set(map(str.lower, e.get("legends", []))):
                errs.append(f"legend card already exists for {spec.get('legends')} in {tag}. Make a follow-up format instead.")
        ss, es = sim_signature(spec.get("simulation")), sim_signature(e.get("simulation"))
        if ss and es and ss == es:
            errs.append(f"identical simulation script+params as {tag}")
    return errs, warns

def read_specs(paths):
    out = []
    for p in paths:
        with open(p) as f:
            out.append(json.load(f))
    return out

def cmd_check(paths):
    reg = load(); entries = reg["entries"]; specs = read_specs(paths)
    idf = build_idf(entries + specs)
    bad = 0
    for i, s in enumerate(specs):
        # also check against the other specs in this same batch
        others = entries + [x for j, x in enumerate(specs) if j != i]
        errs, warns = check_one(s, others, idf)
        label = f"{s.get('id')} [{s.get('pillar')}/{s.get('format')}] {s.get('title')}"
        if errs:
            bad += 1
            print(f"FAIL  {label}")
            for e in errs: print(f"      x {e}")
        else:
            print(f"PASS  {label}")
        for w in warns: print(f"      ! {w}")
    print(f"\n{len(specs) - bad}/{len(specs)} passed")
    sys.exit(1 if bad else 0)

def cmd_add(paths):
    reg = load(); specs = read_specs(paths)
    keep = ["id", "lore_no", "slug", "pillar", "cluster", "format", "concept_key", "title", "hook", "takeaway",
            "data", "legends", "question", "simulation", "links", "status", "batch"]
    by_id = {e["id"]: e for e in reg["entries"]}
    for s in specs:
        e = {k: s[k] for k in keep if k in s}
        e.setdefault("status", "planned")
        e["created"] = by_id.get(s["id"], {}).get("created") or datetime.date.today().isoformat()
        e["updated"] = datetime.date.today().isoformat()
        if s["id"] in by_id:
            e = {**by_id[s["id"]], **e}
        by_id[s["id"]] = e
        print(f"recorded {s['id']} ({e['status']})")
    reg["entries"] = list(by_id.values()); save(reg)

def cmd_status(args):
    reg = load(); id_ = args[0]; st = args[1]
    if st not in STATUSES:
        sys.exit(f"status must be one of {STATUSES}")
    for e in reg["entries"]:
        if e["id"] == id_:
            e["status"] = st; e["updated"] = datetime.date.today().isoformat()
            if "--release" in args:
                e["release"] = args[args.index("--release") + 1]
            for i, a in enumerate(args):
                if a == "--url":
                    k, v = args[i + 1].split("=", 1)
                    e.setdefault("urls", {})[k] = v
            save(reg); print(f"{id_} -> {st}"); return
    sys.exit(f"{id_} not found")

def cmd_next_id():
    reg = load()
    n = max([e.get("lore_no", 0) for e in reg["entries"]] + [0]) + 1
    print(n, f"L{n:04d}")

def cmd_coverage():
    reg = load(); live = [e for e in reg["entries"] if e.get("status") != "retired"]
    m = Counter((e["pillar"], e["format"]) for e in live)
    w = 11
    print("pillar".ljust(w) + "".join(f[:9].rjust(10) for f in FORMATS) + "   total")
    for p in PILLARS:
        row = [m[(p, f)] for f in FORMATS]
        print(p.ljust(w) + "".join(str(v).rjust(10) for v in row) + str(sum(row)).rjust(8))
    tot = Counter(e["pillar"] for e in live)
    print("\nthinnest pillars:", ", ".join(f"{p}({tot[p]})" for p in sorted(PILLARS, key=lambda p: tot[p])[:3]))
    sensible = [(p, f) for p in PILLARS for f in FORMATS
                if not (f == "legendcard" and p != "legends") and not (p == "legends" and f in ("anatomy", "whatif", "lexicon"))]
    empties = [f"{p}/{f}" for p, f in sensible if m[(p, f)] == 0]
    print("empty cells:", ", ".join(empties[:16]) + (" ..." if len(empties) > 16 else ""))

def cmd_find(text):
    reg = load(); entries = reg["entries"]
    probe = {"title": text, "hook": "", "takeaway": "", "concept_key": ""}
    idf = build_idf(entries + [probe]); pv = vec(probe)
    ranked = sorted(((cosine(pv, vec(e), idf), e) for e in entries), key=lambda x: -x[0])[:8]
    for s, e in ranked:
        print(f"{s:.2f}  {e['id']}  [{e['pillar']}/{e['format']}]  {e['title']}")

def cmd_stats():
    reg = load(); e = reg["entries"]
    print(f"entries: {len(e)}")
    print("by status:", dict(Counter(x.get("status") for x in e)))
    print("by format:", dict(Counter(x.get("format") for x in e)))

if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        print(__doc__); sys.exit(0)
    c = a[0]
    if c == "check": cmd_check(a[1:])
    elif c == "add": cmd_add(a[1:])
    elif c == "status": cmd_status(a[1:])
    elif c == "next-id": cmd_next_id()
    elif c == "coverage": cmd_coverage()
    elif c == "find": cmd_find(" ".join(a[1:]))
    elif c == "stats": cmd_stats()
    else:
        print(__doc__); sys.exit(2)
