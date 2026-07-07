#!/usr/bin/env bash
# Build the core and run the deterministic unit suite (rng / genome / palettes / loop / features).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
echo "  [unit] node --test"
npm run --silent unit
