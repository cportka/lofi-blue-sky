/**
 * render.mjs — local verification + capture harness (a dev tool, not part of CI).
 *
 * Drives the compiled engine in real headless Chromium (WebGL2) to:
 *   • prove pixel-level determinism (same hash → byte-identical frame),
 *   • prove the loop is seamless (frame at loopT→1 ≈ frame at loopT=0),
 *   • capture PNG stills and a frame sequence for visual inspection / video export.
 *
 * Usage:
 *   node scripts/render.mjs                 # verify + capture a default set into .captures/
 *   node scripts/render.mjs frame <hash>    # one still
 *   node scripts/render.mjs loop  <hash> <frames>
 *
 * Playwright + Chromium are provided by the environment (not npm-installed here); we resolve the
 * global install by absolute path and fall back to a normal import if it is on the module path.
 */

import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.captures');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.map': 'application/json; charset=utf-8',
};

async function loadPlaywright() {
  const candidates = [
    'playwright',
    '/opt/node22/lib/node_modules/playwright/index.js',
    '/opt/node22/lib/node_modules/playwright-core/index.js',
  ];
  for (const c of candidates) {
    try {
      const mod = await import(c);
      const chromium = mod.chromium ?? mod.default?.chromium;
      if (chromium?.launch) return chromium;
    } catch {
      /* try next */
    }
  }
  throw new Error('Could not resolve Playwright. This is a local verification tool only.');
}

function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = decodeURIComponent((req.url || '/').split('?')[0]);
      let file = path.normalize(path.join(ROOT, url));
      if (!file.startsWith(ROOT)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      if (url === '/' || url.endsWith('/')) file = path.join(file, 'index.html');
      if (!existsSync(file)) {
        res.writeHead(404).end('not found: ' + url);
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch (e) {
      res.writeHead(500).end(String(e));
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ base: `http://127.0.0.1:${port}`, close: () => server.close() });
    });
  });
}

async function writePng(name, dataUrl) {
  const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  await writeFile(path.join(OUT, name), Buffer.from(b64, 'base64'));
}

function meanAbsDiff(a, b) {
  let sum = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) sum += Math.abs(a[i] - b[i]);
  return sum / n;
}

async function main() {
  const [cmd, argHash, argN] = process.argv.slice(2);
  await mkdir(OUT, { recursive: true });
  if (!existsSync(path.join(ROOT, 'packages/core/dist/index.js'))) {
    console.error('Build the core first:  npm run build:core');
    process.exit(1);
  }

  const chromium = await loadPlaywright();
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
  await page.goto(`${server.base}/scripts/harness.html`);
  await page.waitForFunction('window.__ready === true');

  const setup = (hash, w, h) => page.evaluate(([hh, ww, hhh]) => window.__setup(hh, ww, hhh), [hash, w, h]);
  const renderAt = (t) => page.evaluate((tt) => window.__renderAt(tt), t);
  const pixels = () => page.evaluate(() => window.__pixels());
  const png = () => page.evaluate(() => window.__png());

  let exitCode = 0;

  if (cmd === 'frame') {
    const info = await setup(argHash, 512, 512);
    await renderAt(0);
    await writePng('frame.png', await png());
    console.log('params:', JSON.stringify(info.params));
    console.log('features:', JSON.stringify(info.features));
    console.log('→ .captures/frame.png');
  } else if (cmd === 'loop') {
    const frames = Number(argN || 24);
    const info = await setup(argHash, 400, 400);
    const L = info.params.loopSeconds;
    for (let i = 0; i < frames; i++) {
      await renderAt((i / frames) * L);
      await writePng(`loop_${String(i).padStart(3, '0')}.png`, await png());
    }
    console.log(`→ ${frames} frames in .captures/ (loopSeconds=${L.toFixed(2)})`);
  } else {
    // default: verify + capture a small gallery
    const hashes = [
      '00000000000000000000000000000000000000000000000000000000deadbeef',
      'a3f1b2c4d5e6f7089a1b2c3d4e5f60718293a4b5c6d7e8f9012345678abcdef0',
      'facefeed1234567890abcdef0000111122223333444455556666777788889999',
      'b10eb1005ky5eed5b10eb1005ky5eed5b10eb1005ky5eed5b10eb1005ky5eed5a',
    ];

    console.log('=== determinism (same hash → byte-identical frame) ===');
    for (const h of hashes) {
      await setup(h, 256, 256);
      await renderAt(3.0);
      const p1 = await pixels();
      await setup(h, 256, 256);
      await renderAt(3.0);
      const p2 = await pixels();
      const diff = meanAbsDiff(p1, p2);
      const ok = diff === 0;
      if (!ok) exitCode = 1;
      console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${h.slice(0, 12)}…  meanAbsDiff=${diff}`);
    }

    console.log('=== seamless loop (frame at loopT→1 ≈ loopT=0) ===');
    for (const h of hashes) {
      const info = await setup(h, 256, 256);
      const L = info.params.loopSeconds;
      await renderAt(0);
      const p0 = await pixels();
      await renderAt(L * (1 - 1 / 840)); // one frame before the loop closes (~840-frame loop)
      const pEnd = await pixels();
      const diff = meanAbsDiff(p0, pEnd);
      const ok = diff < 6; // < ~2.3% of a 0–255 channel
      if (!ok) exitCode = 1;
      console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${h.slice(0, 12)}…  meanAbsDiff=${diff.toFixed(3)}  (loopSeconds=${L.toFixed(1)})`);
    }

    console.log('=== gallery stills → .captures/ ===');
    for (let i = 0; i < hashes.length; i++) {
      const info = await setup(hashes[i], 400, 400);
      await renderAt(info.params.loopSeconds * 0.33);
      await writePng(`gallery_${i}_${info.features.Palette}.png`, await png());
      console.log(`  ${hashes[i].slice(0, 12)}…  ${JSON.stringify(info.features)}`);
    }
    console.log(exitCode === 0 ? '\nALL CHECKS PASSED' : '\nSOME CHECKS FAILED');
  }

  await browser.close();
  server.close();
  process.exit(exitCode);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
