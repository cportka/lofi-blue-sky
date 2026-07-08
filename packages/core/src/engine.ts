/**
 * `createSky(canvas, opts)` — the one call both targets drive. It selects an **engine** (a sky
 * algorithm) from the registry, resolves that engine's params (from a hash, an injected PRNG, or
 * explicit params), builds its renderer, and drives a seamless loop. Platform-agnostic: fxhash
 * passes `$fx.rand`; the browser passes a hash and an engine id.
 */

import { createGL } from './gl/context.js';
import { loopPhase } from './loop.js';
import { createRng, type Rng } from './rng.js';
import { normalizeHash } from './hash.js';
// Default to Genesis directly (not via the registry) so a single-engine target — the fxhash token —
// tree-shakes the other engines out. Multi-engine callers (the web app) pass an Engine object from
// the registry. See docs/ENGINES.md.
import { GENESIS } from './engines/genesis/index.js';
import type { Engine, BaseParams, Features } from './engines/types.js';

/** Internal longest-side render resolution — the lofi crush. Matches the 400×400 references. */
export const BASE_RES = 400;

export interface SkyOptions {
  /** The engine (algorithm) to run. Defaults to Genesis. Pass an engine object from the registry. */
  engine?: Engine;
  /** Seed string (a 64-hex `$fx.hash`, or any string — folded deterministically). */
  hash?: string;
  /** Inject a PRNG directly (fxhash passes `$fx.rand`). Takes precedence over `hash`. */
  rand?: Rng;
  /** Inject fully-formed params for the chosen engine (e.g. a decoded token). Highest precedence. */
  params?: BaseParams;
  /** Device-pixel-ratio cap for the initial size. */
  dpr?: number;
}

export interface Sky {
  readonly engineId: string;
  readonly params: BaseParams;
  readonly features: Features;
  /** Render one frame for wall-clock `timeSeconds` (converted to a loop phase internally). */
  render(timeSeconds: number): void;
  /** Resize to a CSS pixel size (backing store scaled by `dpr`). */
  resize(cssWidth: number, cssHeight: number, dpr?: number): void;
  dispose(): void;
}

function internalSize(dw: number, dh: number): [number, number] {
  const w = Math.max(1, dw);
  const h = Math.max(1, dh);
  if (w >= h) return [BASE_RES, Math.max(2, Math.round((BASE_RES * h) / w))];
  return [Math.max(2, Math.round((BASE_RES * w) / h)), BASE_RES];
}

export function createSky(canvas: HTMLCanvasElement, opts: SkyOptions = {}): Sky {
  const engine = opts.engine ?? GENESIS;
  const params: BaseParams =
    opts.params ??
    engine.genome(opts.rand ?? createRng(normalizeHash(opts.hash ?? 'lofi-blue-sky')));
  const features = engine.features(params);

  const gl = createGL(canvas);

  let dpr = opts.dpr ?? (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
  let displayW = canvas.width || 800;
  let displayH = canvas.height || 800;
  canvas.width = displayW;
  canvas.height = displayH;

  let [iw, ih] = internalSize(displayW, displayH);
  const renderer = engine.createRenderer(gl, iw, ih);
  renderer.setParams(params);
  const loopSeconds = params.loopSeconds;

  return {
    engineId: engine.id,
    params,
    features,
    render(timeSeconds: number): void {
      renderer.render(loopPhase(timeSeconds, loopSeconds), displayW, displayH);
    },
    resize(cssWidth: number, cssHeight: number, nextDpr?: number): void {
      dpr = nextDpr ?? dpr;
      displayW = Math.max(1, Math.round(cssWidth * dpr));
      displayH = Math.max(1, Math.round(cssHeight * dpr));
      canvas.width = displayW;
      canvas.height = displayH;
      [iw, ih] = internalSize(displayW, displayH);
      renderer.resizeInternal(iw, ih);
    },
    dispose(): void {
      renderer.dispose();
    },
  };
}
