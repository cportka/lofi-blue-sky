#!/usr/bin/env bash
# The Portka runner treats package.json as the version source of truth. We also keep a bare VERSION
# file (some tools read it) — this asserts the two never drift. CHANGELOG + README are already
# cross-checked by tests/run-tests.sh.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
PKG="$(node -e 'process.stdout.write(require("./package.json").version)')"
FILE="$(tr -d '[:space:]' < VERSION)"
if [[ "$PKG" != "$FILE" ]]; then
  echo "version drift: package.json=$PKG VERSION=$FILE"
  exit 1
fi
echo "  [version] package.json and VERSION agree ($PKG)"
