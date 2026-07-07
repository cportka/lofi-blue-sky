/**
 * render.mjs — local verification + capture harness (a dev tool, not part of CI).
 *
 * Drives the compiled engine in real headless Chromium (WebGL2) to:
 *   • prove pixel-level determinism (same hash → byte-identical frame),
 *   • prove the loop is seamless AND actually moves (frame at loopT→1 ≈ loopT=0, mid-loop differs),
 *   • guard the pixel contract with a tolerant golden signature (catches accidental shader edits),
 *   • capture PNG stills and a frame sequence for visual inspection / video export.
 *
 * Usage:
 *   node scripts/render.mjs                  # verify + capture a default set into .captures/
 *   node scripts/render.mjs frame <hash>     # one still
 *   node scripts/render.mjs loop  <hash> <n> # n frames across the loop
 *   node scripts/render.mjs golden [--write] # check (or rewrite) the pixel-signature golden
 *
 * Note on goldens: GPU float output varies slightly across drivers, so the golden is a downsampled
 * average-colour signature compared with a tolerance — a same-driver regression guard, not a
 * cross-machine determinism proof (that is the param-level golden in the unit suite). See
 * docs/DETERMINISM.md.
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
const GOLDEN_PATH = path.join(ROOT, 'scripts/render-goldens.json');

const FIXED = [
  { hash: '00000000000000000000000000000000000000000000000000000000deadbeef', t: 0.33 },
  { hash: 'a3f1b2c4d5e6f7089a1b2c3d4e5f60718293a4b5c6d7e8f9012345678abcdef0', t: 0.5 },
  { hash: 'facefeed1234567890abcdef0000111122223333444455556666777788889999', t: 0.2 },
  { hash: 'b10eb1005ky5eed5b10eb1005ky5eed5b10eb1005ky5eed5b10eb1005ky5eed5a', t: 0.66 },
  // canonical picks — pixel-locked so a shader change that would alter them fails the golden
  { hash: '00f50f353cf56cfa55f3b32404db3196e7cef86e37bd4b0fbca9304a8dd6097f', t: 0.33 },
  { hash: '3ebed465933f11af41fb9f999635ca11ea55c1357cdcba0f3d4bc11f9de5ff64', t: 0.33 },
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
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
      // Contain to ROOT: allow ROOT itself, else require the path separator boundary
      // (so a sibling like `${ROOT}-evil` cannot be served).
      if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
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

/** Mean absolute per-channel difference. `rgbOnly` drops the (always-opaque) alpha channel. */
function meanAbsDiff(a, b, rgbOnly = false) {
  let sum = 0;
  let n = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (rgbOnly && i % 4 === 3) continue;
    sum += Math.abs(a[i] - b[i]);
    n++;
  }
  return n ? sum / n : 0;
}

/** Downsample RGBA pixels to a grid of average colours — a small, driver-tolerant signature. */
function signature(px, w, h, grid = 24) {
  const sig = [];
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      const x0 = Math.floor((gx * w) / grid);
      const x1 = Math.floor(((gx + 1) * w) / grid);
      const y0 = Math.floor((gy * h) / grid);
      const y1 = Math.floor(((gy + 1) * h) / grid);
      let r = 0, g = 0, b = 0, c = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * w + x) * 4;
          r += px[i];
          g += px[i + 1];
          b += px[i + 2];
          c++;
        }
      }
      sig.push(Math.round(r / c), Math.round(g / c), Math.round(b / c));
    }
  }
  return sig;
}

async function main() {
  const [cmd, argA, argB] = process.argv.slice(2);
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
    const info = await setup(argA, 512, 512);
    await renderAt(0);
    await writePng('frame.png', await png());
    console.log('params:', JSON.stringify(info.params));
    console.log('features:', JSON.stringify(info.features));
    console.log('→ .captures/frame.png');
  } else if (cmd === 'loop') {
    const frames = Number(argB || 24);
    const info = await setup(argA, 400, 400);
    const L = info.params.loopSeconds;
    for (let i = 0; i < frames; i++) {
      await renderAt((i / frames) * L);
      await writePng(`loop_${String(i).padStart(3, '0')}.png`, await png());
    }
    console.log(`→ ${frames} frames in .captures/ (loopSeconds=${L.toFixed(2)})`);
  } else if (cmd === 'golden') {
    const write = argA === '--write';
    const sigs = {};
    for (const { hash, t } of FIXED) {
      const info = await setup(hash, 256, 256);
      await renderAt(info.params.loopSeconds * t);
      sigs[hash] = signature(await pixels(), 256, 256);
    }
    if (write) {
      await writeFile(GOLDEN_PATH, JSON.stringify(sigs) + '\n');
      console.log(`wrote ${Object.keys(sigs).length} signatures → ${path.relative(ROOT, GOLDEN_PATH)}`);
    } else {
      const stored = JSON.parse(await readFile(GOLDEN_PATH, 'utf8'));
      for (const { hash } of FIXED) {
        const diff = meanAbsDiff(sigs[hash], stored[hash] ?? []);
        const ok = diff < 3; // tolerant of cross-driver float variance; catches real shader edits
        if (!ok) exitCode = 1;
        console.log(`  ${ok ? 'PASS' : 'FAIL'}  golden ${hash.slice(0, 12)}…  meanAbsDiff=${diff.toFixed(3)}`);
      }
      console.log(exitCode ? '\nGOLDEN DRIFT — re-run with --write only if the change is intended.' : '\nGolden OK.');
    }
  } else {
    console.log('=== determinism (same hash → byte-identical frame) ===');
    for (const { hash } of FIXED) {
      await setup(hash, 256, 256);
      await renderAt(3.0);
      const p1 = await pixels();
      await setup(hash, 256, 256);
      await renderAt(3.0);
      const p2 = await pixels();
      const diff = meanAbsDiff(p1, p2);
      const ok = diff === 0;
      if (!ok) exitCode = 1;
      console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${hash.slice(0, 12)}…  meanAbsDiff=${diff}`);
    }

    console.log('=== seamless loop (closes at loopT→1, and actually moves) ===');
    for (const { hash } of FIXED) {
      const info = await setup(hash, 256, 256);
      const L = info.params.loopSeconds;
      await renderAt(0);
      const p0 = await pixels();
      // Sample several offsets and take the MAX — a single mid-loop sample can alias with an even
      // drift period (loopT=0.5 == loopT=0 when driftCycles is even), which is not a static frame.
      let motion = 0;
      for (const frac of [0.2, 0.37, 0.63, 0.8]) {
        await renderAt(L * frac);
        motion = Math.max(motion, meanAbsDiff(p0, await pixels(), true));
      }
      await renderAt(L * (1 - 1 / 840)); // one frame before the loop closes (~840-frame loop)
      const pEnd = await pixels();
      const close = meanAbsDiff(p0, pEnd, true);
      const ok = close < 8 && motion > 0.3; // seamless AND not a frozen frame
      if (!ok) exitCode = 1;
      console.log(
        `  ${ok ? 'PASS' : 'FAIL'}  ${hash.slice(0, 12)}…  close=${close.toFixed(3)} motion=${motion.toFixed(2)} (L=${L.toFixed(1)})`,
      );
    }

    console.log('=== gallery stills → .captures/ ===');
    for (let i = 0; i < FIXED.length; i++) {
      const info = await setup(FIXED[i].hash, 400, 400);
      await renderAt(info.params.loopSeconds * 0.33);
      await writePng(`gallery_${i}_${info.features.Palette}.png`, await png());
      console.log(`  ${FIXED[i].hash.slice(0, 12)}…  ${JSON.stringify(info.features)}`);
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
