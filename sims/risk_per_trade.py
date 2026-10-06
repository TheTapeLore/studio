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
    for risk in a.risk:
        rng = np.random.default_rng(a.seed)  # same coin flips for every risk level: only the sizing differs
        eq, maxdd = simulate(rng, a.runs, a.trades, a.win_rate, a.avg_win_r, risk)
        k = f"{risk * 100:g}pct"
        out[f"runs_{k}"] = eq[:60, idx].round(4).tolist()
        out["values"][f"maxdd_{k}"] = maxdd.round(4).tolist()
        out["values"][f"final_{k}"] = (eq[:, -1] - 1).round(4).tolist()
        out["summary"][k] = {"median_final": round(float(np.median(eq[:, -1]) - 1), 4),
                             "median_maxdd": round(float(np.median(maxdd)), 4),
                             "worst5_maxdd": round(float(np.quantile(maxdd, 0.05)), 4)}
    print(json.dumps({"meta": out["meta"], "summary": out["summary"]}, indent=2))
    if a.out and not a.demo:
        os.makedirs(os.path.dirname(a.out), exist_ok=True)
        json.dump(out, open(a.out, "w"), separators=(",", ":"))
        print("wrote", a.out)


if __name__ == "__main__":
    main()
