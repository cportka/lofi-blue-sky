/**
 * Target B (breathe-lite) — the full-screen GitHub Pages generator, now multi-engine.
 *   • switch sky engine (Genesis / Billow) with a chip; the same seed reinterprets under it,
 *   • live seed box (hash or g:engine:… token, applies automatically),
 *   • click the sky to toggle the HUD; click any attribute to reshuffle just that one (per engine),
 *   • ◀ ▶ undo/redo; ⧉ copy-with-check; png frame; loop = record one seamless loop as WebM.
 *
 * Full-screen + always looping. Never touches any engine's seed → params mapping (frozen; see
 * docs/CANON.md). A hand-tweaked sky is shared as an engine-tagged `g:engine:…` token.
 */

import {
  createSky,
  getEngine,
  ENGINES,
  DEFAULT_ENGINE_ID,
  createRng,
  normalizeHash,
  randomHash,
  randomHashByPolicy,
  encodeSky,
  decodeSky,
  isSkyToken,
  type Sky,
  type BaseParams,
} from '../../../packages/core/dist/index.js';

const canvas = document.getElementById('sky') as HTMLCanvasElement;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const enginesEl = $<HTMLDivElement>('engines');
const featsEl = $<HTMLDivElement>('feats');
const seedInput = $<HTMLInputElement>('seed');
const backBtn = $<HTMLButtonElement>('back');
const fwdBtn = $<HTMLButtonElement>('fwd');
const copyBtn = $<HTMLButtonElement>('copy');
const webmBtn = $<HTMLButtonElement>('webm');

interface State {
  engineId: string;
  token: string; // 64-hex hash (pure) or g:engineId:… (edited)
  params: BaseParams;
}

const history: State[] = [];
let hi = -1;
let sky: Sky | null = null;
let start = performance.now();
let recording = false;

const cur = (): State => history[hi]!;

// --- state builders ----------------------------------------------------------------------------
function paramsFromHash(engineId: string, hash: string): BaseParams {
  return getEngine(engineId).genome(createRng(normalizeHash(hash)));
}
function hashState(engineId: string, hash: string): State {
  const h = normalizeHash(hash);
  return { engineId, token: h, params: paramsFromHash(engineId, h) };
}
function fromToken(token: string, fallbackEngine: string): State {
  if (isSkyToken(token)) {
    const d = decodeSky(token);
    if (d) return { engineId: d.engineId, token, params: d.params };
  }
  return hashState(fallbackEngine, token);
}
function newSkyState(engineId: string): State {
  const hash = engineId === 'genesis' ? randomHashByPolicy(Math.random, { rarer: 'Olive' }) : randomHash();
  return hashState(engineId, hash);
}

// --- rendering / UI ----------------------------------------------------------------------------
function fit(): void {
  if (!sky) return;
  const dpr = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2);
  sky.resize(window.innerWidth, window.innerHeight, dpr);
}

function renderEngines(): void {
  enginesEl.innerHTML = '';
  for (const e of ENGINES) {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = e.name;
    chip.title = e.description;
    chip.setAttribute('aria-selected', String(e.id === cur().engineId));
    chip.addEventListener('click', () => switchEngine(e.id));
    enginesEl.appendChild(chip);
  }
}

function renderFeatures(): void {
  if (!sky) return;
  featsEl.innerHTML = '';
  for (const [k, v] of Object.entries(sky.features)) {
    const row = document.createElement('button');
    row.className = 'feat';
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

function apply(state: State, push: boolean): void {
  if (push) {
    history.splice(hi + 1);
    history.push(state);
    hi = history.length - 1;
  }
  if (sky) sky.dispose();
  sky = createSky(canvas, { engine: getEngine(state.engineId), params: state.params });
  start = performance.now();
  fit();
  renderEngines();
  renderFeatures();
  updateNav();
  seedInput.value = state.token;
  const url = new URL(window.location.href);
  url.searchParams.set('engine', state.engineId);
  url.searchParams.set('seed', state.token);
  window.history.replaceState(null, '', url.toString());
}

function loop(now: number): void {
  if (sky) sky.render((now - start) / 1000);
  requestAnimationFrame(loop);
}

// --- actions -----------------------------------------------------------------------------------
function newSky(): void {
  apply(newSkyState(cur().engineId), true);
}

function switchEngine(id: string): void {
  if (id === cur().engineId) return;
  // reinterpret a pure hash under the new engine (same seed, new algorithm); else a fresh sky
  const next = isSkyToken(cur().token) ? newSkyState(id) : hashState(id, cur().token);
  apply(next, true);
}

function reshuffle(featureKey: string): void {
  const eng = getEngine(cur().engineId);
  if (!eng.reroll) return;
  const p = eng.reroll(cur().params, featureKey, Math.random);
  apply({ engineId: cur().engineId, token: encodeSky(cur().engineId, p), params: p }, true);
}

function labelOf(token: string): string {
  return isSkyToken(token) ? 'edited' : token.slice(0, 12);
}
function downloadBlob(blob: Blob, name: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// --- controls ----------------------------------------------------------------------------------
canvas.addEventListener('click', () => document.body.classList.toggle('hud-hidden'));

backBtn.addEventListener('click', () => {
  if (hi > 0) { hi--; apply(cur(), false); }
});
fwdBtn.addEventListener('click', () => {
  if (hi < history.length - 1) { hi++; apply(cur(), false); }
});
$<HTMLButtonElement>('rand').addEventListener('click', newSky);

let debounce = 0;
seedInput.addEventListener('input', () => {
  window.clearTimeout(debounce);
  debounce = window.setTimeout(() => {
    const v = seedInput.value.trim();
    if (v && v !== cur().token) apply(fromToken(v, cur().engineId), true);
  }, 350);
});
seedInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    window.clearTimeout(debounce);
    const v = seedInput.value.trim();
    if (v) apply(fromToken(v, cur().engineId), true);
  }
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(cur().token);
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
  const b64 = canvas.toDataURL('image/png').split(',')[1]!;
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  downloadBlob(new Blob([bytes], { type: 'image/png' }), `lofi-blue-sky_${cur().engineId}_${labelOf(cur().token)}.png`);
});

webmBtn.addEventListener('click', async () => {
  if (recording || !sky || typeof MediaRecorder === 'undefined') return;
  recording = true;
  const restore = webmBtn.textContent;
  webmBtn.disabled = true;
  const L = sky.params.loopSeconds;
  try {
    const stream = canvas.captureStream(30);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    const stopped = new Promise<void>((res) => (rec.onstop = () => res()));
    start = performance.now();
    rec.start();
    for (let s = Math.ceil(L); s > 0; s--) {
      webmBtn.textContent = `● ${s}s`;
      await new Promise((r) => setTimeout(r, 1000));
    }
    rec.stop();
    await stopped;
    downloadBlob(new Blob(chunks, { type: 'video/webm' }), `lofi-blue-sky_${cur().engineId}_${labelOf(cur().token)}.webm`);
  } finally {
    recording = false;
    webmBtn.disabled = false;
    webmBtn.textContent = restore;
  }
});

window.addEventListener('resize', fit);

// --- boot --------------------------------------------------------------------------------------
const url = new URL(window.location.href);
const urlEngine = url.searchParams.get('engine');
const urlSeed = url.searchParams.get('seed');
const engineId = ENGINES.some((e) => e.id === urlEngine) ? urlEngine! : DEFAULT_ENGINE_ID;
apply(urlSeed ? fromToken(urlSeed, engineId) : newSkyState(engineId), true);
requestAnimationFrame(loop);
