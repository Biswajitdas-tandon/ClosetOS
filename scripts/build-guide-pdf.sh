#!/usr/bin/env bash
# Rebuild docs/ClosetOS-User-Guide.pdf from docs/user-guide/guide-print.html
# using headless Chrome (Windows paths; adjust CHROME for macOS/Linux).
# Usage: scripts/build-guide-pdf.sh
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
SRC="docs/user-guide/guide-print.html"
OUT="docs/ClosetOS-User-Guide.pdf"

[ -f "$CHROME" ] || { echo "Chrome not found at $CHROME (set CHROME=...)"; exit 1; }

"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=8000 \
  --print-to-pdf="$(cygpath -w "$PWD/$OUT")" \
  "file:///$(cygpath -m "$PWD/$SRC")" 2>/dev/null

echo "✓ $OUT"
