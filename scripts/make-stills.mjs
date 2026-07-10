/**
 * Regenerate the featured README / design-log stills into assets/renders/. Not CI — run by hand
 * after a look change:  node scripts/make-stills.mjs
 */
import http from 'node:http';
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RENDERS = path.join(ROOT, 'assets/renders');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };

// [outfile, hash, engine|null, t, size]
const STILLS = [
  ['hero.png', 'gal-7', null, 0.4, 640],
  ['billow.png', 'bill-2', 'billow', 0.45, 560],
  ['v0.6-genesis-blocks.png', 'gal-7', null, 0.4, 512],
  ['v0.6-genesis-bars.png', 'gal-16', null, 0.5, 512],
  ['v0.6-genesis-blue.png', 'gal-31', null, 0.35, 512],
  ['v0.6-squall.png', 'squ-17', 'squall', 0.5, 512],
];
// filmstrip: one seed, 5 loop moments, stitched horizontally
const FILM = { hash: 'gal-7', engine: null, phases: [0.0, 0.2, 0.4, 0.6, 0.8], tile: 300 };

function startServer() {
  const s = http.createServer(async (req, res) => {
    let u = decodeURIComponent((req.url || '/').split('?')[0]);
    let f = path.join(ROOT, u);
    if (!existsSync(f)) return res.writeHead(404).end('no');
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] ?? 'application/octet-stream' });
    res.end(await readFile(f));
  });
  return new Promise((r) => s.listen(0, '127.0.0.1', () => r({ base: `http://127.0.0.1:${s.address().port}`, close: () => s.close() })));
}
async function loadChromium() {
  for (const c of ['/opt/node22/lib/node_modules/playwright/index.js', 'playwright']) {
    try { const m = await import(c); const ch = m.chromium ?? m.default?.chromium; if (ch?.launch) return ch; } catch { /* next */ }
  }
  throw new Error('no playwright');
}
const savePng = async (name, dataUrl) =>
  writeFile(path.join(RENDERS, name), Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));

const chromium = await loadChromium();
const server = await startServer();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
await page.goto(`${server.base}/scripts/harness.html`);
await page.waitForFunction('window.__ready === true');
await mkdir(RENDERS, { recursive: true });

for (const [out, hash, engine, t, size] of STILLS) {
  const info = await page.evaluate(([h, e, s]) => window.__setup(h, s, s, e || undefined), [hash, engine, size]);
  await page.evaluate((tt) => window.__renderAt(tt), info.params.loopSeconds * t);
  await savePng(out, await page.evaluate(() => window.__png()));
  console.log('→ assets/renders/' + out);
}

// filmstrip
{
  const info = await page.evaluate(([h, e, s]) => window.__setup(h, s, s, e || undefined), [FILM.hash, FILM.engine, FILM.tile]);
  const frames = [];
  for (const t of FILM.phases) {
    await page.evaluate((tt) => window.__renderAt(tt), info.params.loopSeconds * t);
    frames.push(await page.evaluate(() => window.__png()));
  }
  const strip = await page.evaluate(async ({ frames, tile }) => {
    const gap = 6;
    const cv = document.createElement('canvas');
    cv.width = frames.length * tile + (frames.length - 1) * gap;
    cv.height = tile;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#0b0a12'; ctx.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < frames.length; i++) {
      const img = new Image(); img.src = frames[i]; await img.decode();
      ctx.drawImage(img, i * (tile + gap), 0, tile, tile);
    }
    return cv.toDataURL('image/png');
  }, { frames, tile: FILM.tile });
  await savePng('filmstrip.png', strip);
  console.log('→ assets/renders/filmstrip.png');
}

await browser.close();
server.close();
