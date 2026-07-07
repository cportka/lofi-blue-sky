/**
 * Target B (breathe-lite) — the GitHub Pages front-end. The same shared engine, with interactive
 * exploration on top of it:
 *   • a live seed box (paste a hash or a `g:…` token; it applies automatically, no button),
 *   • click the sky to toggle the HUD, click again to bring it back,
 *   • click any attribute to reshuffle just that one, with ◀ ▶ undo/redo through the history,
 *   • "new sky" biases Olive rarer (exploration only — every seed still regenerates exactly),
 *   • save the current frame (PNG) or record one full seamless loop (WebM).
 *
 * None of this touches the seed → genome mapping (frozen; see docs/CANON.md). A hand-tweaked sky is
 * no longer a single hash, so it is represented and shared as an encoded genome (`g:…`).
 */

import {
  createSky,
  genomeFromHash,
  normalizeHash,
  randomHashByPolicy,
  rerollFeature,
  encodeGenome,
  decodeGenome,
  isGenomeToken,
  type Genome,
  type Sky,
} from '../../../packages/core/dist/index.js';

const canvas = document.getElementById('sky') as HTMLCanvasElement;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const featsEl = $<HTMLDivElement>('feats');
const seedInput = $<HTMLInputElement>('seed');
const backBtn = $<HTMLButtonElement>('back');
const fwdBtn = $<HTMLButtonElement>('fwd');
const copyBtn = $<HTMLButtonElement>('copy');
const webmBtn = $<HTMLButtonElement>('webm');

interface State {
  genome: Genome;
  token: string; // a 64-hex hash (pure) or a `g:…` encoded genome (edited)
}

const history: State[] = [];
let hi = -1;
let sky: Sky | null = null;
let start = performance.now();
let recording = false;

// --- rendering ---------------------------------------------------------------------------------
function fit(): void {
  if (!sky) return;
  const dpr = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2);
  sky.resize(window.innerWidth, window.innerHeight, dpr);
}

function renderFeatures(): void {
  if (!sky) return;
  featsEl.innerHTML = '';
  for (const [k, v] of Object.entries(sky.features)) {
    const row = document.createElement('button');
    row.className = 'feat';
    row.dataset.key = k;
    row.innerHTML = `<span class="k">${k}</span><span class="v">${
      typeof v === 'boolean' ? (v ? 'yes' : '—') : v
    }</span>`;
    row.addEventListener('click', () => reshuffle(k));
    featsEl.appendChild(row);
  }
}

function updateNav(): void {
  backBtn.disabled = hi <= 0;
  fwdBtn.disabled = hi >= history.length - 1;
}

/** Load a state into the engine and sync the UI. `push` records it in the history. */
function apply(state: State, push: boolean): void {
  if (push) {
    history.splice(hi + 1); // drop any redo branch
    history.push(state);
    hi = history.length - 1;
  }
  if (sky) sky.dispose();
  sky = createSky(canvas, { genome: state.genome });
  start = performance.now();
  fit();
  renderFeatures();
  updateNav();
  seedInput.value = state.token;
  const url = new URL(window.location.href);
  url.searchParams.set('seed', state.token);
  history.length && window.history.replaceState(null, '', url.toString());
}

function loop(now: number): void {
  if (sky) sky.render((now - start) / 1000);
  requestAnimationFrame(loop);
}

// --- state helpers -----------------------------------------------------------------------------
function fromToken(token: string): State {
  if (isGenomeToken(token)) {
    const g = decodeGenome(token);
    if (g) return { genome: g, token };
  }
  const hash = normalizeHash(token);
  return { genome: genomeFromHash(hash), token: hash };
}

function newSky(): void {
  const hash = randomHashByPolicy(Math.random, { rarer: 'Olive' });
  apply({ genome: genomeFromHash(hash), token: hash }, true);
}

function reshuffle(featureKey: string): void {
  if (!sky) return;
  const g = rerollFeature(sky.params, featureKey, Math.random);
  apply({ genome: g, token: encodeGenome(g) }, true);
}

function labelOf(token: string): string {
  return isGenomeToken(token) ? 'edited' : token.slice(0, 12);
}

function downloadBlob(blob: Blob, name: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// --- controls ----------------------------------------------------------------------------------
// Click the sky (anywhere outside the HUD) to toggle the info box.
canvas.addEventListener('click', () => document.body.classList.toggle('hud-hidden'));

backBtn.addEventListener('click', () => {
  if (hi > 0) { hi--; apply(history[hi]!, false); }
});
fwdBtn.addEventListener('click', () => {
  if (hi < history.length - 1) { hi++; apply(history[hi]!, false); }
});

$<HTMLButtonElement>('rand').addEventListener('click', newSky);

// Live seed box — no apply button; typing (debounced) or pasting updates the sky.
let debounce = 0;
seedInput.addEventListener('input', () => {
  window.clearTimeout(debounce);
  debounce = window.setTimeout(() => {
    const v = seedInput.value.trim();
    if (!v) return;
    const st = fromToken(v);
    if (st.token !== history[hi]?.token) apply(st, true);
  }, 350);
});
seedInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    window.clearTimeout(debounce);
    const v = seedInput.value.trim();
    if (v) apply(fromToken(v), true);
  }
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(history[hi]?.token ?? seedInput.value);
    copyBtn.textContent = '✓';
    copyBtn.classList.add('ok');
    setTimeout(() => {
      copyBtn.textContent = '⧉';
      copyBtn.classList.remove('ok');
    }, 1200);
  } catch {
    seedInput.select();
  }
});

$<HTMLButtonElement>('png').addEventListener('click', () => {
  const token = history[hi]?.token ?? 'sky';
  const b64 = canvas.toDataURL('image/png').split(',')[1]!;
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  downloadBlob(new Blob([bytes], { type: 'image/png' }), `lofi-blue-sky_${labelOf(token)}.png`);
});

// Record exactly one loop to a seamless WebM. (Preparing the animated export — the full breathe
// edition adds high-res + MP4; see ROADMAP.md.)
webmBtn.addEventListener('click', async () => {
  if (recording || !sky || typeof MediaRecorder === 'undefined') return;
  recording = true;
  const restore = webmBtn.textContent;
  webmBtn.disabled = true;
  const L = sky.params.loopSeconds;
  try {
    const stream = canvas.captureStream(30);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    const stopped = new Promise<void>((res) => (rec.onstop = () => res()));
    start = performance.now(); // begin the capture at loop t = 0
    rec.start();
    for (let s = Math.ceil(L); s > 0; s--) {
      webmBtn.textContent = `● ${s}s`;
      await new Promise((r) => setTimeout(r, 1000));
    }
    rec.stop();
    await stopped;
    downloadBlob(new Blob(chunks, { type: 'video/webm' }), `lofi-blue-sky_${labelOf(history[hi]?.token ?? 'sky')}.webm`);
  } finally {
    recording = false;
    webmBtn.disabled = false;
    webmBtn.textContent = restore;
  }
});

window.addEventListener('resize', fit);

// --- boot --------------------------------------------------------------------------------------
const fromUrl = new URL(window.location.href).searchParams.get('seed');
if (fromUrl) apply(fromToken(fromUrl), true);
else newSky();
requestAnimationFrame(loop);
