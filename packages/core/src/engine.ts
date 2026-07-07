/**
 * The engine — one call, `createSky(canvas, opts)`, that both targets drive. It owns the WebGL2
 * context and the multi-pass pipeline, resolves a genome (from a hash, an injected PRNG, or an
 * explicit genome), and renders a seamless loop. It makes no platform assumptions: fxhash passes
 * `$fx.rand`; the browser generator passes a hash string.
 */

import { createGL } from './gl/context.js';
import { Pipeline } from './gl/pipeline.js';
import { genome as buildGenome, type Genome } from './genome.js';
import { deriveFeatures, type Features } from './features.js';
import { loopPhase } from './loop.js';
import { createRng, type Rng } from './rng.js';
import { normalizeHash } from './hash.js';

/** Internal longest-side render resolution — the lofi crush. Matches the 400×400 references. */
export const BASE_RES = 400;

export interface SkyOptions {
  /** Seed string (a 64-hex `$fx.hash`, or any string — folded deterministically). */
  hash?: string;
  /** Inject a PRNG directly (fxhash passes `$fx.rand`). Takes precedence over `hash`. */
  rand?: Rng;
  /** Inject a fully-formed genome (e.g. from fx(params)). Takes precedence over `rand`/`hash`. */
  genome?: Genome;
  /** Device-pixel-ratio cap for the initial size. */
  dpr?: number;
}

export interface Sky {
  readonly params: Genome;
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
  const params: Genome =
    opts.genome ??
    buildGenome(opts.rand ?? createRng(normalizeHash(opts.hash ?? 'lofi-blue-sky')));
  const features = deriveFeatures(params);

  const gl = createGL(canvas);

  let dpr = opts.dpr ?? (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
  let displayW = canvas.width || 800;
  let displayH = canvas.height || 800;
  canvas.width = displayW;
  canvas.height = displayH;

  let [iw, ih] = internalSize(displayW, displayH);
  const pipeline = new Pipeline(gl, iw, ih);
  pipeline.setGenome(params);

  return {
    params,
    features,
    render(timeSeconds: number): void {
      const loopT = loopPhase(timeSeconds, params.loopSeconds);
      pipeline.render(loopT, displayW, displayH);
    },
    resize(cssWidth: number, cssHeight: number, nextDpr?: number): void {
      dpr = nextDpr ?? dpr;
      displayW = Math.max(1, Math.round(cssWidth * dpr));
      displayH = Math.max(1, Math.round(cssHeight * dpr));
      canvas.width = displayW;
      canvas.height = displayH;
      [iw, ih] = internalSize(displayW, displayH);
      pipeline.resizeInternal(iw, ih);
    },
    dispose(): void {
      pipeline.dispose();
    },
  };
}
