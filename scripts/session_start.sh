#!/bin/bash
# Fast, idempotent project setup for every session (cloud and local).
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
if [ -f engine/package.json ] && [ ! -d engine/node_modules ]; then
  (cd engine && npm ci --no-audit --no-fund >/dev/null 2>&1 || npm install --no-audit --no-fund >/dev/null 2>&1) || true
fi
if [ -f engine/package.json ]; then
  (cd engine && npx --yes remotion browser ensure >/dev/null 2>&1) || true
fi
[ -f engine/public/sfx/snap.wav ] || python3 scripts/sound/gen_cues.py >/dev/null 2>&1 || true
python3 -c "import yaml, yfinance, numpy" 2>/dev/null || pip install --break-system-packages -q pyyaml yfinance pandas numpy >/dev/null 2>&1 || true
echo "Tape Lore studio ready. Registry: $(python3 scripts/registry.py stats 2>/dev/null | head -1)"
exit 0
