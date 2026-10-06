// Every episodes/<id>/spec.json (+ data.json, sim.json) is bundled at build time so each Lore gets its own
// compositions in the Studio and in render_batch.mjs. Nothing about an episode is hard-coded in the engine.
import { BarsData, Episode, Spec } from "./lib/spec";
// score.json = the cue sheet written by scripts/sound/score.py alongside engine/public/score/<id>.wav

const ctx = require.context("../episodes", true, /^\.\/L\d{4}\/(spec|data|sim|score)\.json$/);

const byId: Record<string, Partial<Episode>> = {};
for (const key of ctx.keys()) {
  const m = key.match(/^\.\/(L\d{4})\/(spec|data|sim|score)\.json$/);
  if (!m) continue;
  const [, id, kind] = m;
  byId[id] = byId[id] ?? {};
  const val = ctx(key);
  if (kind === "spec") byId[id].spec = val as Spec;
  if (kind === "data") byId[id].data = val as BarsData;
  if (kind === "sim") byId[id].sim = val as Record<string, unknown>;
  if (kind === "score") byId[id].score = val as Episode["score"];
}

export const EPISODES: Episode[] = Object.values(byId)
  .filter((e): e is Episode => !!e.spec)
  .sort((a, b) => a.spec.lore_no - b.spec.lore_no);
