/**
 * The genome — `hash → parameters`. This is the DNA of a token.
 *
 * A hash-seeded {@link Rng} is drawn in a *fixed order* to fill a {@link Genome}. Because the draw
 * order never branches on earlier values in a way that changes the *count* of draws, the same hash
 * always yields byte-identical params on any machine (see docs/DETERMINISM.md and the genome test).
 *
 * v1 ships one mode — `bands` (the slit-scan sunset). The other modes' fields are still generated
 * so a token minted today keeps a stable genome when later modes come online in Target B.
 */

import {
  createRng,
  range,
  rangeInt,
  pick,
  chance,
  type Rng,
} from './rng.js';
import { normalizeHash } from './hash.js';
import { PALETTES, MAX_STOPS } from './palettes.js';

export type SkyMode = 'bands' | 'mosaic' | 'sort' | 'mosh';
export type SortAxis = 'vertical' | 'horizontal';

/** Reserved blank draws appended to the Genesis key (headroom; unused by the shaders). */
export const GENESIS_RESERVED = 4;

export interface Genome {
  /** Active glitch mode. v1 = `bands`. */
  mode: SkyMode;

  // palette
  /** Id of the curated ramp (see palettes.ts). */
  paletteId: string;
  /** Per-stop luminance/hue nudge, length {@link MAX_STOPS}. "Curate, then perturb." */
  stopJitter: number[];

  // sky
  /** Vertical centre of the horizon glow, 0 (bottom) → 1 (top). */
  horizon: number;
  /** Vertical position of the sun glow, 0 → 1. */
  sunElevation: number;
  /** Sun glow intensity, 0 → 1. */
  sunStrength: number;

  // slit-scan (bands)
  /** Number of quantised horizontal bands. */
  bands: number;
  /** Per-band drift phase seed, 0 → 1. */
  bandPhase: number;
  /** Vertical smear amplitude of the venetian-blind reveal. */
  bandDrift: number;
  /** Per-row horizontal displacement strength. */
  rowDisplace: number;
  /** Integer number of drift cycles per loop — integer keeps the loop seamless. */
  driftCycles: number;

  // mosaic (forward-compat)
  /** Downsample tile size in pixels. */
  tile: number;

  // sort / mosh (forward-compat)
  /** Luma cutoff for the smear mask. */
  sortThreshold: number;
  /** Sort/smear axis. */
  sortAxis: SortAxis;
  /** Feedback persistence for the datamosh mode. */
  moshDecay: number;

  // colour + post
  /** Posterisation levels (colour quantisation). */
  quantLevels: number;
  /** Film-grain intensity, 0 → 1. */
  grain: number;
  /** Ordered-dither intensity, 0 → 1. */
  dither: number;
  /** Chromatic-bleed intensity, 0 → 1. */
  chroma: number;
  /** Vignette intensity, 0 → 1. */
  vignette: number;

  // loop
  /** Seamless loop length in seconds, 20 → 34. */
  loopSeconds: number;

  /**
   * Reserved blank draws — headroom to grow the Genesis key without shifting existing fields.
   * Drawn at the very end and unused by the shaders, so every seed's *pixels* are unchanged
   * (opened up a little in v0.3.0, pre-release). See docs/ENGINES.md and docs/CANON.md.
   */
  reserved: number[];
}

/**
 * Build a genome from a PRNG. Accepts any `fxrand`-shaped function, so on fxhash you pass
 * `$fx.rand` directly and in the browser/tests you pass {@link createRng}. The order of `rand()`
 * calls below is the determinism contract — do not reorder without a major version bump.
 */
export function genome(rand: Rng): Genome {
  // palette + per-stop jitter (fixed draw count regardless of palette size)
  const palette = pick(rand, PALETTES);
  const stopJitter: number[] = [];
  for (let i = 0; i < MAX_STOPS; i++) stopJitter.push(range(rand, -0.06, 0.06));

  // sky
  const horizon = range(rand, 0.3, 0.62);
  const sunElevation = range(rand, horizon - 0.05, horizon + 0.18);
  const sunStrength = range(rand, 0.15, 0.85);

  // slit-scan
  const fine = chance(rand, 0.5);
  const bands = fine ? rangeInt(rand, 24, 48) : rangeInt(rand, 8, 22);
  const bandPhase = rand();
  const bandDrift = range(rand, 0.015, 0.09);
  const rowDisplace = range(rand, 0.0, 0.06);
  const driftCycles = rangeInt(rand, 1, 3); // integer → seamless loop

  // mosaic (drawn now to keep the stream stable for future modes)
  const tile = rangeInt(rand, 3, 12);

  // sort / mosh
  const sortThreshold = range(rand, 0.35, 0.72);
  const sortAxis: SortAxis = chance(rand, 0.7) ? 'vertical' : 'horizontal';
  const moshDecay = range(rand, 0.85, 0.98);

  // colour + post
  const quantLevels = rangeInt(rand, 5, 16);
  const grain = range(rand, 0.04, 0.5);
  const dither = range(rand, 0.2, 0.9);
  // Draw both rolls unconditionally so the draw COUNT never depends on an earlier value — that is
  // the fixed-draw-count half of the determinism contract. Then gate the magnitude.
  const chromaOn = chance(rand, 0.45);
  const chromaMag = range(rand, 0.0, 0.6);
  const chroma = chromaOn ? chromaMag : 0.0;
  const vignette = range(rand, 0.1, 0.6);

  // loop
  const loopSeconds = range(rand, 20, 34);

  // reserved blank draws — headroom to open the key up later without shifting existing fields.
  const reserved: number[] = [];
  for (let i = 0; i < GENESIS_RESERVED; i++) reserved.push(rand());

  return {
    mode: 'bands',
    paletteId: palette.id,
    stopJitter,
    horizon,
    sunElevation,
    sunStrength,
    bands,
    bandPhase,
    bandDrift,
    rowDisplace,
    driftCycles,
    tile,
    sortThreshold,
    sortAxis,
    moshDecay,
    quantLevels,
    grain,
    dither,
    chroma,
    vignette,
    loopSeconds,
    reserved,
  };
}

/** Convenience: seed a genome straight from a hash string. */
export function genomeFromHash(hash: string): Genome {
  return genome(createRng(normalizeHash(hash)));
}
