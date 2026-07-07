/**
 * Build Target A — the fxhash token. Bundles the engine into a single self-contained
 * `dist/index.html` (index.html at the archive root, as fxhash requires) and a matching
 * `upload.zip` ready for the sandbox / publish flow. Reports raw + gzip size so the bundle can be
 * kept lean enough for on-chain storage (ONCHFS). See docs/fxhash.md.
 */

import { readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { bundleJs, injectHtml, assertSelfContained, sizes } from '../../scripts/bundle.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const DIST = path.join(HERE, 'dist');

async function main() {
  if (!existsSync(path.join(ROOT, 'packages/core/dist/index.js'))) {
    console.error('Core not built. Run: npm run build:core');
    process.exit(1);
  }

  const template = await readFile(path.join(HERE, 'index.html'), 'utf8');
  const script = await bundleJs(path.join(HERE, 'src/main.ts'));
  const html = injectHtml(template, { script });

  const problems = assertSelfContained(html);
  if (problems.length) {
    console.error('NOT self-contained:\n  - ' + problems.join('\n  - '));
    process.exit(1);
  }

  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  await writeFile(path.join(DIST, 'index.html'), html);
  await copyFile(path.join(ROOT, 'LICENSE'), path.join(DIST, 'LICENSE'));

  // upload.zip with index.html at the archive root. `zip` is a documented build prerequisite
  // (present on ubuntu-latest CI and standard dev boxes); fail clearly if it is missing.
  try {
    execFileSync('zip', ['-v'], { stdio: 'ignore' });
  } catch {
    console.error('`zip` not found. Install it (e.g. `apt-get install zip`) to produce upload.zip.');
    console.error('dist/index.html was written and is the essential artifact.');
    process.exit(1);
  }
  const zipPath = path.join(HERE, 'upload.zip');
  await rm(zipPath, { force: true });
  execFileSync('zip', ['-j', '-q', zipPath, path.join(DIST, 'index.html'), path.join(DIST, 'LICENSE')]);

  const s = sizes(html);
  const zipSize = (await readFile(zipPath)).length;
  console.log('Target A (fxhash) built:');
  console.log(`  dist/index.html   ${s.kb} KB  (gzip ${s.gzkb} KB)`);
  console.log(`  upload.zip        ${(zipSize / 1024).toFixed(1)} KB`);
  console.log(
    s.raw < 60 * 1024
      ? '  ✓ lean enough to consider ONCHFS (fully on-chain).'
      : '  • sizeable — IPFS is the safer storage target at this size.',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
