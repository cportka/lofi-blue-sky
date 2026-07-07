/**
 * Public API of the shared core — the one module both targets import. Never touches `$fx` or the
 * DOM UI; the targets inject the RNG and drive the engine.
 */

// engine
export { createSky, BASE_RES } from './engine.js';
export type { Sky, SkyOptions } from './engine.js';

// genome / DNA
export { genome, genomeFromHash } from './genome.js';
export type { Genome, SkyMode, SortAxis } from './genome.js';

// features
export { deriveFeatures } from './features.js';
export type { Features } from './features.js';

// palettes
export { PALETTES, PALETTE_FAMILIES, MAX_STOPS, getPaletteById, sampleRamp } from './palettes.js';
export type { Palette, PaletteStop, PaletteFamily } from './palettes.js';

// rng
export { createRng, sfc32, xmur3, range, rangeInt, pick, weightedIndex, chance } from './rng.js';
export type { Rng } from './rng.js';

// hash
export { isValidHash, normalizeHash, randomHash } from './hash.js';
export type { Hash } from './hash.js';

// loop
export { loopPhase, loopClock, loopEnvelope, TAU } from './loop.js';
export type { LoopClock } from './loop.js';
