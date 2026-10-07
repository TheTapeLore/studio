#!/usr/bin/env node
/**
 * Render a batch: every episode in batches/<id>.json, both aspects + thumbnail + cover, one at a time.
 * Resumable: finished files are skipped (renders go to *.part and are renamed only when complete).
 *
 *   node scripts/render_batch.mjs batches/2026-10-06-a.json            # videos + thumb + cover
 *   node scripts/render_batch.mjs batches/2026-10-06-a.json --stills   # key stills only -> episodes/<id>/stills/
 *   node scripts/render_batch.mjs batches/<id>.json --only L0001 --aspects 9x16 --force
 *   node scripts/render_batch.mjs --comp smoke --out engine/out/smoke.mp4      # any single composition
 *   node scripts/render_batch.mjs --gallery [--aspect 9x16]                     # one still per gallery entry
 *
 * Options: --force (re-render), --concurrency N (default: half the CPUs), --quiet
 * Output: engine/out/<id>-4x5.mp4, <id>-9x16.mp4, <id>-thumb.png, <id>-cover.png; thumb/cover copied to publish/<id>/.
 */
import { createRequire } from "node:module";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENGINE = path.join(ROOT, "engine");
const OUT = path.join(ENGINE, "out");
const require = createRequire(path.join(ENGINE, "package.json"));
const { bundle } = require("@remotion/bundler");
const { renderMedia, renderStill, selectComposition, getCompositions } = require("@remotion/renderer");

const argv = process.argv.slice(2);
const flag = (k) => argv.includes(k);
const opt = (k, d = null) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const FORCE = flag("--force");
const QUIET = flag("--quiet");
const CONCURRENCY = Number(opt("--concurrency", Math.max(1, Math.floor(os.cpus().length / 2))));
const log = (...a) => console.log(...a);
const rel = (p) => path.relative(ROOT, p);

let serveUrl = null;
const getBundle = async () => {
  if (serveUrl) return serveUrl;
  log("bundling engine ...");
  const t0 = Date.now();
  serveUrl = await bundle({ entryPoint: path.join(ENGINE, "index.ts"), publicDir: path.join(ENGINE, "public"), onProgress: () => {} });
  log(`bundled in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  return serveUrl;
};

const done = (f) => !FORCE && fs.existsSync(f) && fs.statSync(f).size > 0;

const progressPrinter = (label) => {
  let last = -1;
  const t0 = Date.now();
  return ({ progress }) => {
    const pct = Math.floor(progress * 100);
    if (QUIET || pct === last || (pct % 5 !== 0 && pct !== 100)) return;
    last = pct;
    const el = (Date.now() - t0) / 1000;
    const eta = progress > 0.02 ? el / progress - el : 0;
    process.stdout.write(`  ${label}  ${String(pct).padStart(3)}%  ${el.toFixed(0)}s elapsed${eta ? `, ~${eta.toFixed(0)}s left` : ""}\n`);
  };
};

/**
 * Master bus. Cues are mastered one by one (gen_cues.py) and the score is a quiet bed (score.py), but overlaps, the
 * renderer's mix and AAC overshoot (~2 dB) can still push the encoded track over the ceiling. So: measure the
 * integrated loudness, apply one static gain to reach -14 LUFS (short-form platforms normalise around -14), then a
 * brick-wall limiter at -4 dBFS so the encoded true peak lands near -2 dBTP (CLAUDE.md rule: <= -1).
 * Video is stream-copied, never re-encoded.
 */
const MASTER_LUFS = -14;
/** Integrated loudness (EBU R128) of a file's audio, from ffmpeg's ebur128 summary. */
const integrated = (file) => {
  const r = spawnSync("ffmpeg", ["-nostdin", "-hide_banner", "-nostats", "-i", file, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" });
  const m = [...(r.stderr || "").matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop();
  return m ? Number(m[1]) : null;
};
const masterAudio = (part, out) => {
  const tmp = out.replace(/\.mp4$/, ".master.mp4");
  const I = integrated(part);
  const gain = I === null || I < -60 ? 0 : Math.max(-6, Math.min(8, MASTER_LUFS - I));
  execFileSync("ffmpeg", ["-nostdin", "-loglevel", "error", "-y", "-i", part, "-map", "0:v:0", "-map", "0:a:0", "-c:v", "copy",
    "-af", `volume=${gain.toFixed(2)}dB,alimiter=limit=0.631:attack=2:release=60:level=false`, "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", tmp]);
  fs.renameSync(tmp, out);
  fs.unlinkSync(part);
  log(`audio ${path.basename(out)}: ${I === null ? "?" : I.toFixed(1)} LUFS -> gain ${gain.toFixed(1)} dB, limiter -4 dBFS`);
};

export const renderVideo = async (id, out) => {
  if (done(out)) return log(`skip  ${rel(out)} (exists)`);
  const url = await getBundle();
  const composition = await selectComposition({ serveUrl: url, id, inputProps: {} });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const part = out.replace(/\.mp4$/, ".part.mp4");
  log(`render ${id} -> ${rel(out)}  (${composition.width}x${composition.height}, ${(composition.durationInFrames / composition.fps).toFixed(1)}s)`);
  const t0 = Date.now();
  await renderMedia({
    composition, serveUrl: url, codec: "h264", outputLocation: part, crf: 18, pixelFormat: "yuv420p",
    audioCodec: "aac", audioBitrate: "192k", enforceAudioTrack: true, imageFormat: "jpeg", jpegQuality: 95,
    concurrency: CONCURRENCY, onProgress: progressPrinter(id), chromiumOptions: { gl: "swangle" },
  });
  masterAudio(part, out);
  log(`done  ${rel(out)}  ${(fs.statSync(out).size / 1e6).toFixed(1)} MB in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
};

export const renderStillTo = async (id, out, frame = 0) => {
  if (done(out)) return log(`skip  ${rel(out)} (exists)`);
  const url = await getBundle();
  const composition = await selectComposition({ serveUrl: url, id, inputProps: {} });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await renderStill({ composition, serveUrl: url, output: out, frame: Math.min(frame, composition.durationInFrames - 1), imageFormat: "png" });
  log(`still ${id}@${frame} -> ${rel(out)}`);
};

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

/** Key moments for stills: the hook (inside 1.5 s), the peak beat, the end card. Override with spec.stills. */
const keyStills = (spec) => {
  if (spec.stills) return spec.stills;
  const beats = spec.beats ?? [];
  const peak = beats.find((b) => b.peak) ?? beats[Math.floor(beats.length / 2)] ?? { t: spec.duration_s / 2, dur: 0 };
  return { hook: 1.4, peak: peak.t + peak.dur - 0.4, end: spec.duration_s - 0.9 };
};

const prepareData = (id) => {
  const spec = readJson(path.join(ROOT, "episodes", id, "spec.json"));
  if (!spec.data) return;
  const dj = path.join(ROOT, "episodes", id, "data.json");
  if (fs.existsSync(dj)) return;
  log(`data  ${id}: ${spec.data.symbol} ${spec.data.start}..${spec.data.end}`);
  execFileSync("python3", [path.join(ROOT, "scripts", "prepare_data.py"), id], { stdio: "inherit" });
};

/** Compose the episode's song from its spec + song.json (scripts/sound/score.py) when missing or older than its inputs. */
const prepareScore = (id) => {
  const dir = path.join(ROOT, "episodes", id);
  const spec = readJson(path.join(dir, "spec.json"));
  if (spec.score === false) return;
  const wav = path.join(ENGINE, "public", "score", `${id}.wav`);
  const mtime = (f) => (fs.existsSync(f) ? fs.statSync(f).mtimeMs : 0);
  const sound = path.join(ROOT, "scripts", "sound");
  const newest = Math.max(...[path.join(dir, "spec.json"), path.join(dir, "data.json"), path.join(dir, "song.json"), path.join(sound, "score.py"), path.join(sound, "song.py")].map(mtime));
  if (fs.existsSync(wav) && fs.existsSync(path.join(dir, "score.json")) && mtime(wav) >= newest) return;
  log(`score ${id}: composing from the spec`);
  execFileSync("python3", [path.join(ROOT, "scripts", "sound", "score.py"), id], { stdio: ["ignore", "ignore", "inherit"] });
};

const runBatch = async (batchPath) => {
  const batch = readJson(path.resolve(ROOT, batchPath));
  let ids = batch.episodes;
  if (opt("--only")) ids = ids.filter((i) => opt("--only").split(",").includes(i));
  const aspectsOpt = opt("--aspects");
  ids.forEach(prepareData);
  ids.forEach(prepareScore);
  const jobs = [];
  for (const id of ids) {
    const spec = readJson(path.join(ROOT, "episodes", id, "spec.json"));
    const aspects = (spec.aspects ?? ["4x5", "9x16"]).filter((a) => !aspectsOpt || aspectsOpt.split(",").includes(a));
    if (flag("--stills")) {
      const ks = keyStills(spec);
      for (const a of aspects) for (const [name, s] of Object.entries(ks)) jobs.push(["still", `${id}-${a}`, path.join(ROOT, "episodes", id, "stills", `${a}-${name}.png`), Math.round(s * 30)]);
      continue;
    }
    for (const a of aspects) jobs.push(["video", `${id}-${a}`, path.join(OUT, `${id}-${a}.mp4`)]);
    jobs.push(["still", `${id}-thumb`, path.join(OUT, `${id}-thumb.png`), 0, path.join(ROOT, "publish", id, "thumb.png")]);
    jobs.push(["still", `${id}-cover`, path.join(OUT, `${id}-cover.png`), 0, path.join(ROOT, "publish", id, "cover.png")]);
  }
  log(`batch ${batch.batch}: ${ids.length} episode(s), ${jobs.length} job(s), concurrency ${CONCURRENCY}`);
  let n = 0;
  for (const [kind, id, out, frame, copyTo] of jobs) {
    n++;
    log(`\n[${n}/${jobs.length}] ${kind} ${id}`);
    if (kind === "video") await renderVideo(id, out);
    else await renderStillTo(id, out, frame);
    if (copyTo) {
      fs.mkdirSync(path.dirname(copyTo), { recursive: true });
      fs.copyFileSync(out, copyTo);
      log(`copy  ${rel(out)} -> ${rel(copyTo)}`);
    }
  }
  log(`\nbatch ${batch.batch} complete: ${jobs.length} job(s).`);
};

const runGallery = async () => {
  const aspect = opt("--aspect", "4x5");
  const id = aspect === "4x5" ? "gallery" : `gallery-${aspect}`;
  const url = await getBundle();
  const comps = await getCompositions(url, { inputProps: {} });
  const comp = comps.find((c) => c.id === id);
  // the gallery composition carries its segment list as default props
  const entries = comp.defaultProps.segments;
  let start = 0;
  for (const [i, e] of entries.entries()) {
    const f = start + Math.round((e.secs - 0.3) * comp.fps);
    await renderStillTo(id, path.join(OUT, "gallery", aspect, `${String(i + 1).padStart(2, "0")}-${e.component}.png`), f);
    start += Math.round(e.secs * comp.fps);
  }
};

const main = async () => {
  if (flag("--gallery")) return runGallery();
  if (opt("--comp")) {
    const id = opt("--comp");
    const out = path.resolve(ROOT, opt("--out", path.join(OUT, `${id}.mp4`)));
    if (out.endsWith(".png")) return renderStillTo(id, out, Number(opt("--frame", 0)));
    return renderVideo(id, out);
  }
  const b = argv.find((a) => a.endsWith(".json"));
  if (!b) {
    console.error("usage: node scripts/render_batch.mjs batches/<id>.json [--stills] [--only ids] [--aspects 4x5,9x16] [--force]");
    process.exit(2);
  }
  await runBatch(b);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
