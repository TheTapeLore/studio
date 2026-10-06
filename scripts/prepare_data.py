#!/usr/bin/env python3
"""
Turn spec.data into episodes/<id>/data.json for the engine (bars the charts read).

  python scripts/prepare_data.py L0001

spec.data: {"symbol": "^IXIC", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "interval": "1d"|"1wk"|"1mo",
            "benchmark": "^GSPC" (optional, for RS lines), "source": "yfinance"}
Downloads through data/fetch.py (cache + the 90-day rule), resamples, and writes
{"symbol", "interval", "source", "start", "end", "bars": [{"t","o","h","l","c","v"}], "benchmark": {...}}.
"""
import json, os, subprocess, sys
import pandas as pd

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RULE = {"1d": None, "1wk": "W-FRI", "1mo": "ME"}


def fetch(sym, start, end):
    out = subprocess.run([sys.executable, os.path.join(ROOT, "data", "fetch.py"), sym, start, end], capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit(out.stderr or out.stdout)
    path = out.stdout.strip().splitlines()[-1]
    return pd.read_csv(path, parse_dates=["Date"], index_col="Date")


def resample(df, interval):
    rule = RULE.get(interval or "1d")
    if not rule:
        return df
    return df.resample(rule).agg({"Open": "first", "High": "max", "Low": "min", "Close": "last", "Volume": "sum"}).dropna()


def bars(df):
    return [{"t": d.strftime("%Y-%m-%d"), "o": round(float(r.Open), 4), "h": round(float(r.High), 4), "l": round(float(r.Low), 4),
             "c": round(float(r.Close), 4), "v": int(r.Volume)} for d, r in df.iterrows()]


def main(eid):
    spec_path = os.path.join(ROOT, "episodes", eid, "spec.json")
    spec = json.load(open(spec_path))
    d = spec.get("data")
    if not d:
        print(f"{eid}: no data block; nothing to do"); return
    df = resample(fetch(d["symbol"], d["start"], d["end"]), d.get("interval"))
    out = {"symbol": d["symbol"], "interval": d.get("interval", "1d"), "source": d.get("source", "yfinance"),
           "start": d["start"], "end": d["end"], "bars": bars(df)}
    if d.get("benchmark"):
        bdf = resample(fetch(d["benchmark"], d["start"], d["end"]), d.get("interval"))
        out["benchmark"] = {"symbol": d["benchmark"], "bars": bars(bdf)}
    path = os.path.join(ROOT, "episodes", eid, "data.json")
    json.dump(out, open(path, "w"), separators=(",", ":"))
    print(f"{eid}: {len(out['bars'])} {out['interval']} bars of {d['symbol']} -> {os.path.relpath(path, ROOT)}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
