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

# The committed repo-root index.html (+ .nojekyll) IS the artifact GitHub Pages serves from main.
# `npm run build` above just regenerated it; if it differs from the committed copy, the committed
# page is stale. The build is byte-deterministic, so this diff is a reliable guard. (Skipped when
# not in a git work tree, e.g. a tarball checkout.)
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if ! git diff --quiet -- index.html .nojekyll; then
    echo "  [build] committed GitHub Pages artifact is STALE — run 'npm run build:web' and commit index.html:"
    git --no-pager diff --stat -- index.html .nojekyll
    exit 1
  fi
fi
echo "  [build] artifacts present, self-contained, and Pages page in sync"
