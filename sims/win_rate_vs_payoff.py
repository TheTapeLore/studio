#!/usr/bin/env python3
"""
What If Lab: win rate vs payoff. Two made-up traders, same account, same risk per trade.

  "Mostly Right"  wins 60% of trades, makes $100 a win, loses $200 a loss   (cuts winners, lets losers run)
  "Mostly Wrong"  wins 35% of trades, makes $300 a win, loses $100 a loss   (cuts losers, lets winners run)

  python sims/win_rate_vs_payoff.py --out episodes/L0002/sim.json --seed 7 --runs 1000 --trades 100
  python sims/win_rate_vs_payoff.py --demo      # prints the summary only

Model (every line of this is on screen as assumptions):
  - $10,000 account; every trade is a fixed dollar result (no compounding, so dollars add up exactly)
  - each trade is an independent coin with the trader's win rate; no costs, slippage or gaps
Output (engine: Duel reads `duel`, RunsFan reads runs_right / runs_wrong, Distribution reads values.streak_wrong):
  {"meta", "summary", "duel": {right: [...20 trades], wrong: [...]}, "runs_right", "runs_wrong",
   "values": {final_right, final_wrong, streak_right, streak_wrong}}
Analytic check printed with the summary: expectancy per trade = win% x win - loss% x loss.
"""
import argparse, json, os
import numpy as np

ACCOUNT = 10_000
DUEL_SEEDS = {"right": 11, "wrong": 82}
TRADERS = {
    "right": dict(name="Mostly Right", win_rate=0.60, win=100, loss=200),
    "wrong": dict(name="Mostly Wrong", win_rate=0.35, win=300, loss=100),
}


def longest_run(mask):
    """Longest run of True per row."""
    best = np.zeros(mask.shape[0], dtype=int)
    cur = np.zeros(mask.shape[0], dtype=int)
    for j in range(mask.shape[1]):
        cur = np.where(mask[:, j], cur + 1, 0)
        best = np.maximum(best, cur)
    return best


def duel_sequence(n, wins, seed):
    """A fixed, natural-looking order of exactly `wins` winners in n trades (for the 20-trade opener)."""
    r = np.random.default_rng(seed)
    order = np.zeros(n, dtype=bool)
    order[r.choice(n, wins, replace=False)] = True
    return order


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out"); ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--runs", type=int, default=1000); ap.add_argument("--trades", type=int, default=100)
    ap.add_argument("--demo", action="store_true")
    a = ap.parse_args()
    out = {"meta": {"script": "sims/win_rate_vs_payoff.py", "seed": a.seed, "runs": a.runs, "trades": a.trades,
                    "account": ACCOUNT, "traders": TRADERS,
                    "assumptions": [f"Simulated: {a.runs:,} runs of {a.trades} trades each, seed {a.seed}",
                                    "Mostly Right: wins 60%. +$100 a win, −$200 a loss",
                                    "Mostly Wrong: wins 35%. +$300 a win, −$100 a loss",
                                    "$10,000 account. Fixed dollar risk, no compounding",
                                    "Every trade independent. No costs, slippage or gaps"]},
           "summary": {}, "values": {}, "duel": {}}
    idx = np.linspace(0, a.trades, 50).round().astype(int)
    rng = np.random.default_rng(a.seed)
    coins = rng.random((a.runs, a.trades))          # the same coin flips for both: only the rules differ
    for k, t in TRADERS.items():
        wins = coins < t["win_rate"]
        pnl = np.where(wins, t["win"], -t["loss"])
        eq = 1 + np.concatenate([np.zeros((a.runs, 1)), np.cumsum(pnl, axis=1)], axis=1) / ACCOUNT
        final = eq[:, -1] - 1
        streak = longest_run(~wins)
        out[f"runs_{k}"] = eq[:60, idx].round(4).tolist()
        # median and worst-5% paths over ALL runs (RunsFan draws 60 runs but labels the full population)
        out[f"runs_{k}_median"] = np.quantile(eq[:, idx], 0.5, axis=0).round(4).tolist()
        out[f"runs_{k}_tail5"] = np.quantile(eq[:, idx], 0.05, axis=0).round(4).tolist()
        out["values"][f"final_{k}"] = final.round(4).tolist()
        out["values"][f"streak_{k}"] = streak.tolist()
        e = t["win_rate"] * t["win"] - (1 - t["win_rate"]) * t["loss"]
        out["summary"][k] = {
            "expectancy_per_trade": round(e, 2),
            "expected_after_trades": round(e * a.trades, 2),
            "median_final_pct": round(float(np.median(final)), 4),
            "median_final_usd": round(float(np.median(final)) * ACCOUNT, 2),
            "worst5_final_pct": round(float(np.quantile(final, 0.05)), 4),
            "best5_final_pct": round(float(np.quantile(final, 0.95)), 4),
            "share_of_runs_up": round(float(np.mean(final > 0)), 4),
            "median_win_rate": round(float(np.median(wins.mean(axis=1))), 4),
            "median_longest_losing_streak": int(np.median(streak)),
            "worst5_longest_losing_streak": int(np.quantile(streak, 0.95)),
        }
    # the 20-trade opener: exactly 12/20 and 7/20 winners, so the scoreboard reads 60% vs 35%
    # seeds picked once (and fixed) for a clear story: Mostly Right leads early, Mostly Wrong sinks to −$600 by trade 14
    # and climbs back with three winners. Any order of 12/20 and 7/20 ends at the same totals: −$400 and +$800.
    for k, wins_n, sd in (("right", 12, DUEL_SEEDS["right"]), ("wrong", 7, DUEL_SEEDS["wrong"])):
        t = TRADERS[k]
        seq = duel_sequence(20, wins_n, sd)
        out["duel"][k] = [t["win"] if w else -t["loss"] for w in seq]
    out["summary"]["duel_totals"] = {k: int(sum(v)) for k, v in out["duel"].items()}
    print(json.dumps({"meta": {k: v for k, v in out["meta"].items() if k != "traders"}, "summary": out["summary"],
                      "duel": out["duel"]}, indent=1))
    if a.out and not a.demo:
        os.makedirs(os.path.dirname(a.out), exist_ok=True)
        with open(a.out, "w") as f:
            json.dump(out, f, separators=(",", ":"))
        print("wrote", a.out)


if __name__ == "__main__":
    main()
