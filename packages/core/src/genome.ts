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

/**
 * How a Genesis sky moves (v4):
 *  - `true-clean` — THE look (~90%): every cell is exactly one flat colour (sampled at the cell
 *    centre on both axes) that changes as one unit, each cell on its own phase — pixels of a
 *    low-res sky video.
 *  - `sweep`      — the "Clean Sweep Movement" (~6%): flat rows but the sun-bloom's horizontal
 *    gradient sweeps through the bars (the v3 clean look, preserved).
 *  - `distorted`  — the venetian-blind smear + full bit-crush (~4%).
 *  - `classic`    — the original v1 slit-scan (gradient bleed + drift + smear + raw crush), the
 *    look of the first two canonical picks (<1% — the "golden window").
 */
export type GenesisMovement = 'true-clean' | 'sweep' | 'classic' | 'distorted';

/**
 * Reserved blank draws appended to the Genesis key (headroom; unused by the shaders).
 *
 * v2 spent the first two of the original four reserved draws on real structure — the horizontal
 * split, clean finish, and block mosaic (see {@link genome}) — and appended two fresh blanks. So
 * the draw *positions* are unchanged (every field up to `loopSeconds` is byte-identical), but the
 * former blanks now drive pixels: keyVersion bumped 1 → 2. See docs/ENGINES.md and docs/CANON.md.
 */
export const GENESIS_RESERVED = 2;

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
  /** Number of quantised horizontal bands (the vertical divisions / rows). */
  bands: number;
  /**
   * Horizontal divisions (columns) laid over the bands — the second axis of the pixel split. `1`
   * is the classic single-column bars (the most common, "1×N"); larger values (up to ~32, skewed
   * small) weave the sky into a tidy `hbands × bands` grid. New in v2.
   */
  hbands: number;
  /** How the sky moves — see {@link GenesisMovement}. `true-clean` is the norm (~90%). New in v4. */
  movement: GenesisMovement;
  /**
   * Square pixel-grid mosaic — override bands/hbands with a `blocksN × blocksN` grid of large
   * pixels (the 1×1 → 2×2 → 4×4 lineage). New in v2; in v5 the **1×1 origin is half of all
   * skies** — the entire visual area as one pixel of sky.
   */
  blocks: boolean;
  /** Grid size for {@link blocks} mode: 1 = the origin (~50% of seeds) → ~24 (skewed small). */
  blocksN: number;
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

  // colour + post (raw draws — finalised below once we know whether this is a clean pixel sky)
  const quantLevels = rangeInt(rand, 5, 16);
  const grainRaw = range(rand, 0.04, 0.5);
  const ditherRaw = range(rand, 0.2, 0.9);
  // Draw both rolls unconditionally so the draw COUNT never depends on an earlier value — that is
  // the fixed-draw-count half of the determinism contract. Then gate the magnitude.
  const chromaOn = chance(rand, 0.45);
  const chromaMag = range(rand, 0.0, 0.6);
  const chromaRaw = chromaOn ? chromaMag : 0.0;
  const vignette = range(rand, 0.1, 0.6);

  // loop
  const loopSeconds = range(rand, 20, 34);

  // v5 structure — **the 1×1 origin is HALF the sky**: the entire visual area as one pixel of
  // sky, one flat colour breathing through the gradient (how lofi blue sky began). The other half
  // is the pixel-grid family, still ~90% True Clean. Derived from what were the first two reserved
  // draws (g0..g3), so the draw POSITIONS are unchanged and every field above is byte-identical.
  const g0 = rand();
  const g1 = rand();
  const g2 = rand();
  const g3 = rand();
  // Horizontal split (columns). 1 = the classic single-column bars ("1×N", e.g. 1×9, 1×20), the
  // most common; otherwise a tidy `hbands × bands` grid, skewed small.
  const hbands0 = g0 < 0.5 ? 1 : 2 + Math.floor(Math.pow((g0 - 0.5) / 0.5, 2.0) * 30); // 1..32

  // The "golden window" (g2 × g3) is the <1% classic slit-scan — chosen so the two original
  // canonical picks land in it and keep the v1 look they were loved for. It takes precedence.
  const golden = g2 >= 0.42 && g2 < 0.48 && g3 >= 0.4 && g3 < 0.52;
  // THE ORIGIN — 1×1 (~50%): the whole frame is ONE pixel, so it is True Clean by definition.
  const oneByOne = !golden && g2 < 0.5;
  // Otherwise g1 splits the movements: distorted 4%, sweep 6%, true-clean the rest (~90%).
  const movement: GenesisMovement = golden
    ? 'classic'
    : oneByOne || g1 >= 0.1
      ? 'true-clean'
      : g1 < 0.04
        ? 'distorted'
        : 'sweep';
  // Classic is the pure v1 frame (single-column bars, no mosaic); 1×1 is a 1-cell mosaic.
  const hbands = movement === 'classic' || oneByOne ? 1 : hbands0;
  const blocks = movement === 'classic' ? false : oneByOne ? true : g2 >= 0.5 && g2 < 0.65;
  // Grid size: 1 for the origin; otherwise small tidy squares (2..24, skewed small).
  const blocksN = oneByOne ? 1 : 2 + Math.floor(Math.pow(g3, 2.2) * 22);

  // Clean movements read as flat, exact colour, so pull the "bit-crush" (dither/grain/chroma)
  // nearly to nothing; classic + distorted keep the full crush. A value remap, not a draw.
  const cleanish = movement === 'true-clean' || movement === 'sweep';
  const grain = cleanish ? grainRaw * 0.12 : grainRaw;
  const dither = cleanish ? ditherRaw * 0.06 : ditherRaw;
  const chroma = cleanish ? 0.0 : chromaRaw;

  // reserved blank draws — fresh headroom to open the key up again later without shifting fields.
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
    hbands,
    movement,
    blocks,
    blocksN,
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
