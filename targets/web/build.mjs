/**
 * Build Target B (breathe-lite) — the GitHub Pages front-end. Bundles the engine + UI into a
 * single self-contained page written to the repo root as `index.html` (plus `.nojekyll`), because
 * GitHub Pages "deploy from main" serves the repo root. The file is committed so Pages can serve
 * it directly with no build step of its own. All asset paths are inline, so it works at any base
 * URL (including the project-pages subpath, cportka.github.io/lofi-blue-sky/).
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { bundleJs, injectHtml, assertSelfContained, sizes } from '../../scripts/bundle.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');

async function main() {
  if (!existsSync(path.join(ROOT, 'packages/core/dist/index.js'))) {
    console.error('Core not built. Run: npm run build:core');
    process.exit(1);
  }

  const template = await readFile(path.join(HERE, 'index.html'), 'utf8');
  const script = await bundleJs(path.join(HERE, 'src/main.ts'));
  const banner =
    '<!-- Generated from targets/web/ by `npm run build:web`. Do not edit by hand;' +
    ' edit the target source and rebuild. Served by GitHub Pages from the repo root. -->\n';
  const html = banner + injectHtml(template, { script });

  const problems = assertSelfContained(html);
  if (problems.length) {
    console.error('NOT self-contained:\n  - ' + problems.join('\n  - '));
    process.exit(1);
  }

  await writeFile(path.join(ROOT, 'index.html'), html);
  await writeFile(path.join(ROOT, '.nojekyll'), '');

  const s = sizes(html);
  console.log('Target B (GitHub Pages) built → ./index.html');
  console.log(`  ${s.kb} KB  (gzip ${s.gzkb} KB)  + .nojekyll`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
