/**
 * The engine abstraction. A "sky" is produced by an **engine** — a self-contained algorithm with
 * its own **key** (hash → params), shaders, and rarity features. Engines are swappable and
 * versioned, so we can ship more than one look (Genesis, Billow, …) from one core and one UI.
 *
 * An engine's `keyVersion` + draw order is its determinism contract, exactly like the genome was
 * for the single-algorithm build (see docs/DETERMINISM.md, docs/CANON.md).
 */

import type { Rng } from '../rng.js';

/** Rarity traits — a flat, engine-agnostic map (the shape fxhash's `$fx.features` wants). */
export type Features = Record<string, string | boolean>;

/** Every engine's params carry a loop length; the shared loop manager reads it. */
export interface BaseParams {
  loopSeconds: number;
}

/** A per-frame renderer for one engine. Owns its GL programs and framebuffers. */
export interface EngineRenderer<P extends BaseParams = BaseParams> {
  setParams(params: P): void;
  render(loopT: number, displayW: number, displayH: number): void;
  resizeInternal(iw: number, ih: number): void;
  dispose(): void;
}

/** A swappable sky algorithm. */
export interface Engine<P extends BaseParams = BaseParams> {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Schema version of this engine's key. Bump on any change to its draw order / ranges. */
  readonly keyVersion: number;
  /** hash-seeded PRNG → params. This is the key; its draw order is frozen once minted. */
  genome(rand: Rng): P;
  /** params → rarity traits. */
  features(params: P): Features;
  /** Build the GL renderer for this engine on a context. */
  createRenderer(gl: WebGL2RenderingContext, iw: number, ih: number): EngineRenderer<P>;
  /** Optional interactive helper: return params with a single feature changed (browser only). */
  reroll?(params: P, featureKey: string, rand: Rng): P;
}
