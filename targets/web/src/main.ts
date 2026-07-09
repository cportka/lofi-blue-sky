/**
 * Target B (breathe-lite) — the full-screen GitHub Pages generator, now multi-engine.
 *   • switch sky engine (Genesis / Billow) with a chip; the same seed reinterprets under it,
 *   • live seed box (hash or g:engine:… token, applies automatically),
 *   • click the sky to toggle the HUD; click any attribute to reshuffle just that one (per engine),
 *   • ◀ ▶ undo/redo; ⧉ copy-with-check; ↻ new sky. (Save a frame with the OS screenshot.)
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

interface State {
  engineId: string;
  token: string; // 64-hex hash (pure) or g:engineId:… (edited)
  params: BaseParams;
}

const history: State[] = [];
let hi = -1;
let sky: Sky | null = null;
let start = performance.now();

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

window.addEventListener('resize', fit);

// --- boot --------------------------------------------------------------------------------------
const url = new URL(window.location.href);
const urlEngine = url.searchParams.get('engine');
const urlSeed = url.searchParams.get('seed');
const engineId = ENGINES.some((e) => e.id === urlEngine) ? urlEngine! : DEFAULT_ENGINE_ID;
apply(urlSeed ? fromToken(urlSeed, engineId) : newSkyState(engineId), true);
requestAnimationFrame(loop);
