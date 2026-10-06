#!/usr/bin/env bash
# Sample frames from a render for QA: one every 2 s, plus one just after every beat boundary (from the spec).
#
#   scripts/frames.sh engine/out/L0001-9x16.mp4                       # -> episodes/L0001/frames/9x16/
#   scripts/frames.sh engine/out/L0001-4x5.mp4 /tmp/frames            # custom output dir
#   EVERY=1 scripts/frames.sh engine/out/L0001-4x5.mp4                # one per second
#   SHEET=1 scripts/frames.sh engine/out/L0001-4x5.mp4                # also build contact sheets (4x2 tiles)
#
# Beat boundaries come from episodes/<id>/spec.json (id and aspect parsed from the file name <id>-<aspect>.mp4).
set -euo pipefail
VIDEO="${1:?usage: scripts/frames.sh <video.mp4> [outdir]}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="$(basename "$VIDEO" .mp4)"
ID="${BASE%%-*}"
ASPECT="${BASE#*-}"
OUT="${2:-$ROOT/episodes/$ID/frames/$ASPECT}"
EVERY="${EVERY:-2}"
mkdir -p "$OUT"
rm -f "$OUT"/*.png

DUR="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO")"
echo "video $VIDEO  (${DUR}s) -> $OUT"

# every N seconds
ffmpeg -loglevel error -y -i "$VIDEO" -vf "fps=1/${EVERY}" -start_number 0 "$OUT/t%03d.png"
for f in "$OUT"/t*.png; do
  n="$(basename "$f" .png | sed 's/^t0*//')"; n="${n:-0}"
  mv "$f" "$OUT/$(awk -v n="$n" -v e="$EVERY" 'BEGIN { printf "t%05.1fs.png", n * e }')"
done

# just after each beat boundary (0.5 s in, past the fade)
SPEC="$ROOT/episodes/$ID/spec.json"
if [ -f "$SPEC" ]; then
  python3 - "$SPEC" <<'PY' | while read -r t kind; do
import json, sys
s = json.load(open(sys.argv[1]))
for b in s.get("beats", []):
    print(f"{b['t'] + min(0.5, b['dur'] / 2):.2f} {b['kind']}")
PY
    ffmpeg -loglevel error -y -ss "$t" -i "$VIDEO" -frames:v 1 "$OUT/$(printf 'b%05.1fs' "$t")-${kind}.png"
  done
fi

# the last frame
ffmpeg -loglevel error -y -sseof -0.05 -i "$VIDEO" -frames:v 1 -update 1 "$OUT/zz-last.png"

if [ "${SHEET:-0}" = "1" ]; then
  python3 - "$OUT" <<'PY'
import glob, os, subprocess, sys
out = sys.argv[1]
files = sorted(glob.glob(os.path.join(out, "*.png")))
files = [f for f in files if "sheet-" not in f]
for k in range(0, len(files), 8):
    chunk = files[k:k + 8]
    n = len(chunk)
    args = []
    for f in chunk: args += ["-i", f]
    scale = "".join(f"[{i}]scale=360:-1[s{i}];" for i in range(n))
    # all frames of one video share a size: read it from the first
    w, h = map(int, subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", chunk[0]]).decode().strip().split(","))
    th = round(h * 360 / w)
    layout = "|".join(f"{(i % 4) * 360}_{(i // 4) * th}" for i in range(n))
    stack = "".join(f"[s{i}]" for i in range(n)) + (f"xstack=inputs={n}:layout={layout}:fill=black" if n > 1 else "null")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *args, "-filter_complex", scale + stack, os.path.join(out, f"sheet-{k // 8 + 1:02d}.png")], check=True)
print("sheets written")
PY
fi
ls "$OUT" | wc -l | xargs echo "frames:"

# audio: integrated loudness and true peak of the final mix (rule: peaks <= -1 dBFS)
ffmpeg -nostats -hide_banner -i "$VIDEO" -af ebur128=peak=true -f null - 2>&1 \
  | awk '/Summary:/{s=1} s&&/I:|Peak:/{gsub(/^ +/,""); print "audio  " $0}'

