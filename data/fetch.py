#!/usr/bin/env python3
"""Fetch daily OHLCV for education charts, with a cache and the 90-day rule.
  python data/fetch.py <SYMBOL> <YYYY-MM-DD start> <YYYY-MM-DD end>
Writes data/cache/<SYMBOL>_<start>_<end>.csv (Date,Open,High,Low,Close,Volume). Source: yfinance, then stooq."""
import sys, os, datetime
import pandas as pd
ROOT = os.path.dirname(os.path.abspath(__file__)); CACHE = os.path.join(ROOT, "cache")
def main(sym, start, end):
    endd = datetime.date.fromisoformat(end)
    if (datetime.date.today() - endd).days < 90:
        sys.exit(f"refused: {end} is under 90 days ago. Education charts use older history only.")
    os.makedirs(CACHE, exist_ok=True)
    out = os.path.join(CACHE, f"{sym.upper()}_{start}_{end}.csv")
    if os.path.exists(out):
        print(out); return
    df = None
    try:
        import yfinance as yf
        df = yf.download(sym, start=start, end=(endd + datetime.timedelta(days=1)).isoformat(),
                         auto_adjust=True, progress=False, multi_level_index=False)
    except Exception as e:
        print("yfinance failed:", e, file=sys.stderr)
    if df is None or df.empty:
        url = f"https://stooq.com/q/d/l/?s={sym.lower()}.us&d1={start.replace('-','')}&d2={end.replace('-','')}&i=d"
        df = pd.read_csv(url, parse_dates=["Date"], index_col="Date")
    if df is None or df.empty:
        sys.exit(f"no data for {sym}")
    df = df[["Open", "High", "Low", "Close", "Volume"]].dropna()
    df.index.name = "Date"; df.round(4).to_csv(out); print(out)
if __name__ == "__main__":
    if len(sys.argv) != 4: sys.exit(__doc__)
    main(*sys.argv[1:])
