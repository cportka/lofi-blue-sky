#!/usr/bin/env bash
# Build both shippable targets. Each build asserts its output is self-contained (no external
# resources, no leftover ESM imports, no runtime fetch) and fails otherwise — so this case is also
# the fxhash-compliance / GitHub-Pages check.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
echo "  [build] core + fxhash + web"
npm run --silent build >/dev/null

test -f targets/fxhash/dist/index.html || { echo "missing fxhash dist"; exit 1; }
test -f targets/fxhash/upload.zip      || { echo "missing upload.zip"; exit 1; }
test -f index.html                     || { echo "missing GitHub Pages index.html"; exit 1; }
test -f .nojekyll                      || { echo "missing .nojekyll"; exit 1; }

# Belt-and-braces: no absolute external URLs in the shipped artifacts.
if grep -Eq 'src=["'"'"']https?://|href=["'"'"']https?://' targets/fxhash/dist/index.html; then
  echo "fxhash bundle references an external resource"; exit 1
fi
echo "  [build] artifacts present and self-contained"
