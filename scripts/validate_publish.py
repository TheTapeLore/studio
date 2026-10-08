#!/usr/bin/env python3
"""
Validate publish packages against config/platforms.yaml.

  python scripts/validate_publish.py publish/L0001 [publish/L0002 ...]
  python scripts/validate_publish.py --batch batches/2026-10-06-a.json

Each package folder holds meta.json (the source of truth) plus x.md, instagram.md, youtube.md,
which are rendered from meta.json by `--write-md` so a human can copy-paste them.
Exit code 1 if any package fails.
"""
import json, os, re, sys
import yaml

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import voice_check

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CFG = yaml.safe_load(open(os.path.join(ROOT, "config", "platforms.yaml")))
URL = re.compile(r"https?://\S+")

def x_len(text):
    return len(URL.sub("x" * CFG["x"]["url_chars"], text))

def hashtags(text):
    return re.findall(r"(?<!\w)#\w+", text)

def scan_banned(label, text, errs):
    """Hype/advice phrases and banned emoji (platforms.yaml), plus the AI tells in content/VOICE.md (voice.yaml)."""
    for prob in voice_check.check(text, "post"):
        errs.append(f"{label}: voice: {prob}")
    low = text.lower()
    for p in CFG["banned_phrases"]:
        if p.lower() in low:
            errs.append(f"{label}: banned phrase '{p}'")
    for e in CFG["banned_emoji"]:
        if e in text:
            errs.append(f"{label}: banned emoji {e}")

def validate(pkg):
    errs, warns = [], []
    mp = os.path.join(pkg, "meta.json")
    if not os.path.exists(mp):
        return [f"missing {mp}"], []
    m = json.load(open(mp))
    lore = f"Lore {int(m.get('lore_no', 0)):03d}"
    disc = CFG["required_disclaimer"]

    # files
    for k, f in (m.get("files") or {}).items():
        if f and not f.startswith("release:") and not os.path.exists(os.path.join(pkg, f)):
            warns.append(f"file '{f}' ({k}) not in package folder (fine if it lives in the GitHub Release)")
    dur = m.get("duration_s", 0)

    # X
    x = m.get("x") or {}
    post = x.get("post", "")
    if not post: errs.append("x.post missing")
    if x_len(post) > CFG["x"]["post_max_chars"]: errs.append(f"x.post is {x_len(post)} chars (max {CFG['x']['post_max_chars']})")
    if lore not in post: errs.append(f"x.post must mention '{lore}'")
    if len(hashtags(post)) > CFG["x"]["hashtags_max"]: errs.append("x.post has too many hashtags")
    for i, t in enumerate(x.get("thread", []) or []):
        if x_len(t) > CFG["x"]["post_max_chars"]: errs.append(f"x.thread[{i}] is {x_len(t)} chars")
        scan_banned(f"x.thread[{i}]", t, errs)
    if x.get("reply") and x_len(x["reply"]) > CFG["x"]["post_max_chars"]: errs.append("x.reply too long")
    if dur > CFG["x"]["video_max_seconds"]: errs.append(f"video {dur}s exceeds X limit")
    scan_banned("x.post", post, errs)
    if x.get("reply"): scan_banned("x.reply", x["reply"], errs)

    # Instagram
    ig = m.get("instagram") or {}
    cap = ig.get("caption", "")
    if not cap: errs.append("instagram.caption missing")
    if len(cap) > CFG["instagram"]["caption_max_chars"]: errs.append(f"instagram.caption {len(cap)} chars")
    tags = hashtags(cap)
    if len(tags) > CFG["instagram"]["hashtags_max"]: errs.append(f"instagram.caption has {len(tags)} hashtags (max {CFG['instagram']['hashtags_max']})")
    fold = cap[:CFG["instagram"]["caption_fold_chars"]]
    if "#" in fold[:20]: errs.append("instagram.caption must open with the hook, not hashtags")
    if disc not in cap: errs.append("instagram.caption missing the required disclaimer line")
    if CFG["instagram"]["alt_text_required"] and not ig.get("alt_text"): errs.append("instagram.alt_text missing")
    if dur > CFG["instagram"]["reel_max_seconds"]: errs.append("video exceeds Reels limit")
    scan_banned("instagram.caption", cap, errs)

    # YouTube
    yt = m.get("youtube") or {}
    title, desc = yt.get("title", ""), yt.get("description", "")
    if not title: errs.append("youtube.title missing")
    if len(title) > CFG["youtube"]["title_max_chars"]: errs.append(f"youtube.title {len(title)} chars")
    elif len(title) > CFG["youtube"]["title_target_chars"]: warns.append(f"youtube.title {len(title)} chars (aim <= {CFG['youtube']['title_target_chars']})")
    if len(desc) > CFG["youtube"]["description_max_chars"]: errs.append("youtube.description too long")
    if disc not in desc: errs.append("youtube.description missing the required disclaimer line")
    if lore not in desc and lore not in title: errs.append(f"youtube title/description must mention '{lore}'")
    tag_chars = sum(len(t) for t in yt.get("tags", [])) + max(0, len(yt.get("tags", [])) - 1)
    if tag_chars > CFG["youtube"]["tags_total_max_chars"]: errs.append(f"youtube.tags total {tag_chars} chars")
    if len(hashtags(desc)) > CFG["youtube"]["hashtags_max"]: errs.append("youtube.description has too many hashtags")
    if not yt.get("playlist"): warns.append("youtube.playlist not set")
    if dur > CFG["youtube"]["shorts_max_seconds"] and m.get("aspect_primary") == "9x16": errs.append("too long for Shorts")
    scan_banned("youtube.title", title, errs); scan_banned("youtube.description", desc, errs)
    return errs, warns

def write_md(pkg):
    m = json.load(open(os.path.join(pkg, "meta.json")))
    x, ig, yt = m.get("x", {}), m.get("instagram", {}), m.get("youtube", {})
    f = m.get("files", {})
    with open(os.path.join(pkg, "x.md"), "w") as o:
        o.write(f"# X — {m['id']}\n\nVideo: {f.get('video_4x5','')}\n\n## Post\n\n{x.get('post','')}\n")
        if x.get("reply"): o.write(f"\n## First reply\n\n{x['reply']}\n")
        for i, t in enumerate(x.get("thread", []) or []): o.write(f"\n## Thread {i+2}\n\n{t}\n")
    with open(os.path.join(pkg, "instagram.md"), "w") as o:
        o.write(f"# Instagram — {m['id']}\n\nReel: {f.get('video_9x16','')}  \nFeed/carousel: {f.get('video_4x5','')}  \n"
                f"Cover: {f.get('cover','')} (cover frame at {ig.get('cover_frame_s','')}s)\n\n## Caption\n\n{ig.get('caption','')}\n\n## Alt text\n\n{ig.get('alt_text','')}\n")
    with open(os.path.join(pkg, "youtube.md"), "w") as o:
        o.write(f"# YouTube — {m['id']}\n\nShort: {f.get('video_9x16','')}  \nThumbnail: {f.get('thumb','')}\n\n## Title\n\n{yt.get('title','')}\n\n"
                f"## Description\n\n{yt.get('description','')}\n\n## Tags\n\n{', '.join(yt.get('tags', []))}\n\n"
                f"Playlist: {yt.get('playlist','')}  \nCategory: {CFG['youtube']['category']}  \nMade for kids: No\n")

def main():
    a = sys.argv[1:]
    if not a: print(__doc__); sys.exit(0)
    md = "--write-md" in a; a = [x for x in a if x != "--write-md"]
    if a and a[0] == "--batch":
        b = json.load(open(a[1])); pkgs = [os.path.join(ROOT, "publish", i) for i in b["episodes"]]
    else:
        pkgs = a
    bad = 0
    for p in pkgs:
        errs, warns = validate(p)
        print(("FAIL  " if errs else "PASS  ") + p)
        for e in errs: print("      x", e)
        for w in warns: print("      !", w)
        if errs: bad += 1
        elif md: write_md(p)
    print(f"\n{len(pkgs)-bad}/{len(pkgs)} packages passed")
    sys.exit(1 if bad else 0)

if __name__ == "__main__":
    main()
