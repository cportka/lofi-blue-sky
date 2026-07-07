#!/usr/bin/env bash
# Typecheck every project (core + both targets) with the repo's pinned TypeScript.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
echo "  [typecheck] tsc -b"
npm run --silent typecheck
