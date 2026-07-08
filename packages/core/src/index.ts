/**
 * Public API of the shared core — the one module both targets import. Never touches `$fx` or the
 * DOM UI; the targets inject the RNG and drive the engine.
 */

// engine entry
export { createSky, BASE_RES } from './engine.js';
export type { Sky, SkyOptions } from './engine.js';

// engine framework + registry (the registry pulls in every engine — import it only where you want
// the full set, e.g. the web app's switcher; single-engine targets import one engine object instead)
export { ENGINES, ENGINE_IDS, DEFAULT_ENGINE_ID, getEngine } from './engines/registry.js';
export { GENESIS } from './engines/genesis/index.js';
export { BILLOW } from './engines/billow/index.js';
export type { Engine, EngineRenderer, BaseParams, Features } from './engines/types.js';

// --- Genesis engine (the original slit-scan sunset) ---
export { genome, genomeFromHash } from './genome.js';
export type { Genome, SkyMode, SortAxis } from './genome.js';
export { deriveFeatures } from './features.js';
export { PALETTES, PALETTE_FAMILIES, MAX_STOPS, getPaletteById, sampleRamp } from './palettes.js';
export type { Palette, PaletteStop, PaletteFamily } from './palettes.js';
export { randomHashByPolicy, rerollFeature, FEATURE_KEYS } from './explore.js';

// --- Billow engine (rolling clouds) ---
export { billowGenome, billowGenomeFromHash, billowFeatures, BILLOW_PALETTES } from './engines/billow/index.js';
export type { BillowParams, BillowMode } from './engines/billow/index.js';

// rng
export { createRng, sfc32, xmur3, range, rangeInt, pick, weightedIndex, chance } from './rng.js';
export type { Rng } from './rng.js';

// hash
export { isValidHash, normalizeHash, randomHash } from './hash.js';
export type { Hash } from './hash.js';

// share codec (engine-tagged tokens)
export { encodeSky, decodeSky, isSkyToken } from './codec.js';

// loop
export { loopPhase, loopClock, loopEnvelope, TAU } from './loop.js';
export type { LoopClock } from './loop.js';
