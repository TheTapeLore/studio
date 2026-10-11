#!/usr/bin/env python3
"""
One download per batch (founder, 2026-10-10): batch-<id>.zip with one folder per Lore holding everything needed to
post it, so the founder downloads a single file from the Release.

  python scripts/package_batch.py batches/2026-10-09-b.json            -> engine/out/batch-2026-10-09-b.zip
  python scripts/package_batch.py batches/<id>.json --out <path.zip>

Layout:
  batch-<id>/
    README.txt                                  posting order, slots, what each file is for
    Lore 003 - R the only unit a trader needs/
      L0003-4x5.mp4   (X, Instagram feed)       L0003-9x16.mp4  (Reels, Shorts)
      thumb.png (YouTube)   cover.png (Reels/Shorts cover)   captions.srt (YouTube subtitles)
      x.md  instagram.md  youtube.md  (copy to paste)
      + any extra files listed in publish/<id>/meta.json `files` (legend cards, print/, carousel-N.png ...)

Videos come from engine/out/ (render_batch output); everything else from publish/<id>/. A missing video or required
file fails the build: the zip must never ship half a batch.
"""
import json, os, re, sys, zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "engine", "out")
COPY = ["x.md", "instagram.md", "youtube.md"]


def folder_name(meta):
    # keep what reads naturally and is safe on Windows, macOS and Linux ("0.5%", "1,000"); a colon becomes a dash
    title = meta["title"].replace(":", " -")
    title = re.sub(r"[^A-Za-z0-9 .,%'&()+-]+", " ", title).strip().rstrip(".")
    title = re.sub(r"\s+", " ", title)
    return f"Lore {int(meta['lore_no']):03d} - {title}"


def files_for(eid):
    """(source path, name inside the Lore folder) for one entry; raises if anything required is missing."""
    pub = os.path.join(ROOT, "publish", eid)
    meta = json.load(open(os.path.join(pub, "meta.json")))
    out, missing = [], []
    for k, f in (meta.get("files") or {}).items():
        for name in (f if isinstance(f, list) else [f]):
            if not name:
                continue
            if name.startswith("release:"):
                name = name[len("release:"):]
                src = os.path.join(OUT, name)
            else:
                src = os.path.join(pub, name)
            (out if os.path.exists(src) else missing).append((src, name))
    for name in COPY:
        src = os.path.join(pub, name)
        (out if os.path.exists(src) else missing).append((src, name))
    if missing:
        raise SystemExit(f"{eid}: missing " + ", ".join(os.path.relpath(s, ROOT) for s, _ in missing))
    return meta, out


def readme(batch, metas):
    lines = [f"The Tape Lore · batch {batch['batch']}", "",
             "One folder per Lore, in posting order. Post them in this order: each description links back to the one before.", ""]
    for m in metas:
        eid = m["id"]
        dur = m.get("duration_s")
        lines.append(f"{folder_name(m)}  ({dur:.0f} s)" if isinstance(dur, (int, float)) else folder_name(m))
        lines.append(f"  X: {eid}-4x5.mp4 with the post in x.md, then its first reply.")
        lines.append(f"  Instagram: {eid}-9x16.mp4 as a Reel, cover.png as its cover, caption from instagram.md." +
                     ("\n  Instagram carousel: carousel-1.png onward, in order." if any("carousel" in k for k in m.get("files", {})) else ""))
        fr = m.get("youtube", {}).get("shorts_frame_s")
        lines.append(f"  YouTube: {eid}-9x16.mp4 as a Short; captions.srt as subtitles; title and description from youtube.md"
                     f" (playlist: {m.get('youtube', {}).get('playlist', '-')}).")
        lines.append(f"  YouTube Shorts thumbnail: pick the frame at {fr} s while uploading in the app (cover.png once custom"
                     f" Shorts thumbnails are available to the channel). thumb.png is 16:9, for long-form only.")
        lines.append("")
    rp = os.path.join(ROOT, "batches", f"{batch['batch']}-report.md")
    if os.path.exists(rp):
        txt = open(rp).read()
        m = re.search(r"^## Suggested posting slots.*?(?=^## |\Z)", txt, re.M | re.S)
        if m:
            lines += ["Suggested posting slots (from the batch report):", m.group(0).split("\n", 1)[1].strip().replace("**", "").replace("`", ""), ""]
    lines += ["Education only. Never post anything you haven't read first."]
    return "\n".join(lines) + "\n"


def build(batch_path, out=None):
    batch = json.load(open(batch_path))
    bid = batch["batch"]
    out = out or os.path.join(OUT, f"batch-{bid}.zip")
    metas, entries = [], []
    for eid in batch["episodes"]:
        meta, files = files_for(eid)
        metas.append(meta)
        entries.append((meta, files))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    tmp = out + ".part"
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(f"batch-{bid}/README.txt", readme(batch, metas))
        for meta, files in entries:
            base = f"batch-{bid}/{folder_name(meta)}"
            for src, name in files:
                # videos are already compressed: store them, deflate the rest
                ct = zipfile.ZIP_STORED if name.endswith(".mp4") else zipfile.ZIP_DEFLATED
                z.write(src, f"{base}/{name}", compress_type=ct)
    os.replace(tmp, out)
    n = sum(len(f) for _, f in entries)
    print(f"{os.path.relpath(out, ROOT)}: {len(entries)} Lore folder(s), {n} files, {os.path.getsize(out) / 1e6:.1f} MB")
    return out


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    build(a[0], a[a.index("--out") + 1] if "--out" in a else None)
