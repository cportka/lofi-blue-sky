/**
 * Target A entry — the fxhash token. Reads the hash from `$fx`, builds the sky, registers the
 * rarity features, drives a seamless RAF loop, and calls `$fx.preview()` on a representative frame
 * so the platform captures a clean thumbnail. No network, no external resources: everything is
 * bundled into a single self-contained index.html at build time.
 */

import { createSky } from '../../../packages/core/dist/index.js';
import { installFxShim } from './fx-shim.js';

const $fx = installFxShim();

const canvas = document.getElementById('sky') as HTMLCanvasElement;

// Drive the shared engine with the platform PRNG — the genome is derived deterministically from it.
const sky = createSky(canvas, { rand: $fx.rand });

// Publish rarity traits for indexing.
$fx.features(sky.features);

function fit(): void {
  const dpr = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2);
  sky.resize(window.innerWidth, window.innerHeight, dpr);
}
window.addEventListener('resize', fit);
fit();

// Capture the preview thumbnail once, at a representative point in the loop (a third of the way in).
const previewAt = sky.params.loopSeconds * 0.33;
let previewed = false;

const start = performance.now();
function frame(now: number): void {
  const t = (now - start) / 1000;
  sky.render(t);
  if (!previewed && (t >= previewAt || $fx.isPreview)) {
    $fx.preview();
    previewed = true;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Expose for debugging / the sandbox console.
(window as unknown as { __sky: unknown }).__sky = sky;
