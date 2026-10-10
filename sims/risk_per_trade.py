#!/usr/bin/env python3
"""
What If Lab template and first sim: same edge, different risk per trade -> different drawdowns.

  python sims/risk_per_trade.py --out episodes/L00NN/sim.json --seed 7 --runs 1000 --trades 200 \
      --win-rate 0.4 --avg-win-r 2.0 --risk 0.005 0.02
  python sims/risk_per_trade.py --demo      # prints the summary only

Model (state every line of this on screen as assumptions):
  - each trade risks a fixed fraction of current equity; a loser costs exactly 1R, a winner pays avg_win_r R
  - win/loss is an independent coin with probability win_rate (no streak modelling beyond chance)
  - no costs, slippage or gaps; equity compounds trade to trade
Output (consumed by engine components RunsFan / Distribution):
  {"meta": {...}, "summary": {...}, "runs_<risk>": [[equity...] x 60 runs, downsampled to 50 points],
   "values": {"maxdd_<risk>": [...per run...], "final_<risk>": [...per run...]}}
Analytic check printed with the summary: expectancy per trade in R = wr*avgWin - (1-wr)*1.
Also: runs_<risk>_median / _tail5 (full-population paths for RunsFan labels) and the longest losing streak.
"""
import argparse, json, os
import numpy as np


def simulate(rng, runs, trades, wr, avg_win_r, risk):
    wins = rng.random((runs, trades)) < wr
    r = np.where(wins, avg_win_r, -1.0)
    eq = np.cumprod(1 + risk * r, axis=1)
    eq = np.concatenate([np.ones((runs, 1)), eq], axis=1)
    peak = np.maximum.accumulate(eq, axis=1)
    maxdd = (eq / peak - 1).min(axis=1)
    return eq, maxdd


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out"); ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--runs", type=int, default=1000); ap.add_argument("--trades", type=int, default=200)
    ap.add_argument("--win-rate", type=float, default=0.4); ap.add_argument("--avg-win-r", type=float, default=2.0)
    ap.add_argument("--risk", type=float, nargs="+", default=[0.005, 0.02])
    ap.add_argument("--demo", action="store_true")
    a = ap.parse_args()
    out = {"meta": {"script": "sims/risk_per_trade.py", "seed": a.seed, "runs": a.runs, "trades": a.trades,
                    "win_rate": a.win_rate, "avg_win_r": a.avg_win_r, "risk": a.risk,
                    "assumptions": [f"{a.runs:,} runs of {a.trades} trades, seed {a.seed}",
                                    f"{round(a.win_rate * 100)}% winners; wins pay {a.avg_win_r}R, losses cost 1R",
                                    "Risk is a fixed % of current equity", "No costs, slippage or gaps"]},
           "summary": {}, "values": {}}
    expectancy = a.win_rate * a.avg_win_r - (1 - a.win_rate)
    out["summary"]["expectancy_r"] = round(expectancy, 3)
    idx = np.linspace(0, a.trades, 50).round().astype(int)
    eqs, dds = {}, {}
    for risk in a.risk:
        rng = np.random.default_rng(a.seed)  # same coin flips for every risk level: only the sizing differs
        eq, maxdd = simulate(rng, a.runs, a.trades, a.win_rate, a.avg_win_r, risk)
        k = f"{risk * 100:g}pct"
        eqs[k], dds[k] = eq, maxdd
        out[f"runs_{k}"] = eq[:60, idx].round(4).tolist()
        # median and worst-5% paths over ALL runs (RunsFan draws 60 runs but labels the full population)
        out[f"runs_{k}_median"] = np.quantile(eq[:, idx], 0.5, axis=0).round(4).tolist()
        out[f"runs_{k}_tail5"] = np.quantile(eq[:, idx], 0.05, axis=0).round(4).tolist()
        out["values"][f"maxdd_{k}"] = maxdd.round(4).tolist()
        out["values"][f"final_{k}"] = (eq[:, -1] - 1).round(4).tolist()
        out["summary"][k] = {"median_final": round(float(np.median(eq[:, -1]) - 1), 4),
                             "median_maxdd": round(float(np.median(maxdd)), 4),
                             "worst5_maxdd": round(float(np.quantile(maxdd, 0.05)), 4),
                             "worst5_final": round(float(np.quantile(eq[:, -1], 0.05) - 1), 4),
                             "share_dd_over_30": round(float((maxdd <= -0.30).mean()), 4),
                             "share_up": round(float((eq[:, -1] > 1).mean()), 4)}
    # one representative run drawn at every size (TwinPaths): the run whose max drawdown at the largest size is the
    # median one, so the picture is typical, not cherry-picked
    big = f"{max(a.risk) * 100:g}pct"
    j = int(np.argmin(np.abs(dds[big] - np.median(dds[big]))))
    out["twin"] = {"run": j, "paths": {k: eqs[k][j].round(4).tolist() for k in eqs},
                   "maxdd": {k: round(float(dds[k][j]), 4) for k in eqs},
                   "final": {k: round(float(eqs[k][j, -1] - 1), 4) for k in eqs}}
    out["summary"]["twin"] = {"run": j, "maxdd": out["twin"]["maxdd"], "final": out["twin"]["final"]}
    # the same coin flips for every risk level, so one streak count describes both
    wins = np.random.default_rng(a.seed).random((a.runs, a.trades)) < a.win_rate
    best = np.zeros(a.runs, dtype=int); cur = np.zeros(a.runs, dtype=int)
    for j in range(a.trades):
        cur = np.where(~wins[:, j], cur + 1, 0); best = np.maximum(best, cur)
    out["summary"]["median_longest_losing_streak"] = int(np.median(best))
    out["summary"]["worst5_longest_losing_streak"] = int(np.quantile(best, 0.95))
    print(json.dumps({"meta": out["meta"], "summary": out["summary"]}, indent=2))
    if a.out and not a.demo:
        os.makedirs(os.path.dirname(a.out), exist_ok=True)
        json.dump(out, open(a.out, "w"), separators=(",", ":"))
        print("wrote", a.out)


if __name__ == "__main__":
    main()
