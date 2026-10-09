#!/usr/bin/env python3
"""
Lore 003: twenty trades measured in R (R = what you lose if the stop hits).

  python sims/r_multiples.py --out episodes/L0003/sim.json --seed 3
  python sims/r_multiples.py --demo        # summary only

Model (on screen as the tower's label: "20 SIMULATED TRADES"):
  - each trade wins with probability 40%; a loser is stopped out for exactly -1R (the stop is honoured, no gaps)
  - a winner's size in R is drawn from a fixed ladder: 0.5R 15%, 1R 20%, 1.5R 15%, 2R 20%, 3R 15%, 4R 10%, 6R 5%
    (mean 2.05R), so expectancy = 0.4 x 2.05 - 0.6 x 1 = +0.22R per trade, about +4.4R per 20 trades
  - the tower shows ONE sequence of 20. To avoid cherry-picking a lucky run, the script takes the first seed (from
    --seed upward) whose total sits within 1R of the median 20-trade total of 100,000 simulated sequences, and whose
    win rate is the model's 40%.
Output (engine: RTower reads `trades`):
  {"meta", "summary", "trades": [20 R-multiples], "totals_20": {"median", "p5", "p95", "share_up"}}
Dollar conversions shown in the video (R x risk per trade) are plain arithmetic on summary.total_r.
"""
import argparse, json
import numpy as np

WIN_RATE = 0.40
LADDER = np.array([0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 6.0])
PROBS = np.array([0.15, 0.20, 0.15, 0.20, 0.15, 0.10, 0.05])
N = 20


def sequence(rng, n):
    win = rng.random(n) < WIN_RATE
    size = rng.choice(LADDER, size=n, p=PROBS)
    return np.where(win, size, -1.0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=3)
    ap.add_argument("--out")
    ap.add_argument("--demo", action="store_true")
    a = ap.parse_args()

    big = np.random.default_rng(a.seed)
    win = big.random((100_000, N)) < WIN_RATE
    size = big.choice(LADDER, size=(100_000, N), p=PROBS)
    totals = np.where(win, size, -1.0).sum(axis=1)
    med = float(np.median(totals))

    seed = a.seed
    while True:
        tr = sequence(np.random.default_rng(seed), N)
        if abs(tr.sum() - med) <= 1.0 and (tr > 0).sum() == round(WIN_RATE * N):
            break
        seed += 1
    exp_r = WIN_RATE * float((LADDER * PROBS).sum()) - (1 - WIN_RATE)
    out = {
        "meta": {"script": "sims/r_multiples.py", "seed": a.seed, "sequence_seed": seed, "trades": N,
                 "win_rate": WIN_RATE, "ladder": LADDER.tolist(), "probs": PROBS.tolist(), "runs_for_median": 100_000},
        "summary": {"total_r": float(tr.sum()), "winners": int((tr > 0).sum()), "losers": int((tr < 0).sum()),
                    "biggest_win_r": float(tr.max()), "expectancy_r": round(exp_r, 4),
                    "expected_total_20": round(exp_r * N, 2)},
        "trades": tr.tolist(),
        "totals_20": {"median": med, "p5": float(np.percentile(totals, 5)), "p95": float(np.percentile(totals, 95)),
                      "share_up": float((totals > 0).mean())},
    }
    print(json.dumps({k: out[k] for k in ("meta", "summary", "totals_20")}, indent=1))
    print("trades:", " ".join(f"{x:+g}" for x in tr))
    if a.out and not a.demo:
        with open(a.out, "w") as f:
            json.dump(out, f, separators=(",", ":"))


if __name__ == "__main__":
    main()
