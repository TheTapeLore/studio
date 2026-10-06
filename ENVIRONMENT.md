# Claude Code cloud environment for The Tape Lore

Create it once at claude.ai/code → environment selector (cloud icon) → **Add cloud environment**.

**Name:** tapelore-studio

**Network access:** Full  (simplest).
Tighter alternative: Custom, tick "Also include default list", and add:
```
*.yahoo.com
stooq.com
remotion.media
*.remotion.dev
```
Research for legend cards and councils uses web search; if a page fetch is blocked under Custom, add that domain
or switch to Full.

**Environment variables:**
```
BASH_DEFAULT_TIMEOUT_MS=600000
BASH_MAX_TIMEOUT_MS=1800000
PYTHONUNBUFFERED=1
```
Never put secrets here; anyone using the environment can read them. GitHub auth goes through Anthropic's GitHub
proxy, so no token is needed.

**Setup script** (must finish in about 5 minutes and exit 0 so the environment is cached):
```bash
#!/bin/bash
apt-get update
apt-get install -y ffmpeg libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2t64 libxrandr2 \
  libxkbcommon-dev libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 || true
pip install --break-system-packages yfinance pandas numpy pyyaml cairosvg fonttools || true
exit 0
```
Project dependencies (npm, the Remotion browser) install via the repo's SessionStart hook (scripts/session_start.sh).

**Limits to design around:** about 4 vCPU / 16 GB RAM / 30 GB disk per session; render one video per command;
tag pushes are rejected by the proxy (releases are created through `gh`, which works).
