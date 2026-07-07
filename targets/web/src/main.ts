/**
 * Target B (breathe-lite) — the GitHub Pages front-end. The same shared engine, driven by a hash
 * string, with a minimal control panel: randomize, paste a seed, save a PNG, and a live feature
 * readout. Shareable via `?seed=…` in the URL. This is the small public preview of the generator;
 * the full "breathe" edition (all modes, audio, high-res/video export) grows from here — see ROADMAP.md.
 */

import {
  createSky,
  randomHash,
  normalizeHash,
  isValidHash,
  type Sky,
} from '../../../packages/core/dist/index.js';

const canvas = document.getElementById('sky') as HTMLCanvasElement;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const featsEl = $<HTMLDivElement>('feats');
const hashEl = $<HTMLDivElement>('hash');
const seedInput = $<HTMLInputElement>('seed');

let sky: Sky | null = null;
let currentHash = '';
let raf = 0;
const start = performance.now();

function fit(): void {
  if (!sky) return;
  const dpr = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2);
  sky.resize(window.innerWidth, window.innerHeight, dpr);
}

function renderFeatures(): void {
  if (!sky) return;
  const f = sky.features;
  featsEl.innerHTML = Object.entries(f)
    .map(
      ([k, v]) =>
        `<div class="feat"><span class="k">${k}</span><span class="v">${
          typeof v === 'boolean' ? (v ? 'yes' : '—') : v
        }</span></div>`,
    )
    .join('');
  hashEl.textContent = currentHash;
}

function load(hash: string): void {
  currentHash = normalizeHash(hash);
  if (sky) sky.dispose();
  sky = createSky(canvas, { hash: currentHash });
  fit();
  renderFeatures();
  const url = new URL(window.location.href);
  url.searchParams.set('seed', currentHash);
  history.replaceState(null, '', url.toString());
}

function loop(now: number): void {
  if (sky) sky.render((now - start) / 1000);
  raf = requestAnimationFrame(loop);
}

// --- controls ---------------------------------------------------------------------------------
$<HTMLButtonElement>('rand').addEventListener('click', () => load(randomHash()));

$<HTMLButtonElement>('apply').addEventListener('click', () => {
  const v = seedInput.value.trim();
  if (v) load(v);
});
seedInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && seedInput.value.trim()) load(seedInput.value.trim());
});

$<HTMLButtonElement>('save').addEventListener('click', () => {
  const a = document.createElement('a');
  a.download = `lofi-blue-sky_${currentHash.slice(0, 12)}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
});

$<HTMLButtonElement>('panelToggle').addEventListener('click', () => {
  document.body.classList.toggle('hud-hidden');
});

window.addEventListener('resize', fit);

// --- boot -------------------------------------------------------------------------------------
const fromUrl = new URL(window.location.href).searchParams.get('seed');
load(fromUrl && isValidHash(normalizeHash(fromUrl)) ? fromUrl : randomHash());
raf = requestAnimationFrame(loop);
