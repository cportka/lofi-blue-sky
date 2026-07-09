/**
 * Exploration helpers for the browser generator (Target B). These NEVER touch the seed → genome
 * mapping — that is frozen (see docs/CANON.md). They operate one level up: biasing which *random
 * hashes* the "new sky" button surfaces, and producing tweaked *genomes* for single-attribute
 * exploration (which are shared as encoded genomes, not hashes — see codec.ts).
 *
 * The range constants here mirror genome.ts, but are used only for interactive re-rolls; genome.ts
 * itself is never modified, so pasting any hash always reproduces its exact sky.
 */

import { PALETTES, getPaletteById } from './palettes.js';
import { deriveFeatures, type Features } from './features.js';
import { genomeFromHash, type Genome } from './genome.js';
import { randomHash } from './hash.js';

type R = () => number;
const uf = (r: R, a: number, b: number) => a + (b - a) * r();
const ui = (r: R, a: number, b: number) => Math.floor(a + (b - a + 1) * r());
const jitter6 = (r: R) => Array.from({ length: 6 }, () => uf(r, -0.06, 0.06));

/**
 * Draw a random hash while making one palette family rarer in exploration — *rejection sampling*,
 * not a genome change. Olive still appears (`prob < 1`), and any Olive hash pasted directly still
 * renders Olive. Default: Olive re-rolled ~2/3 of the time → ~10% of new skies instead of ~25%.
 */
export function randomHashByPolicy(
  rand: R = Math.random,
  opts: { rarer?: string; prob?: number; tries?: number } = {},
): string {
  const { rarer = 'Olive', prob = 0.66, tries = 8 } = opts;
  let hash = randomHash(rand);
  for (let i = 0; i < tries; i++) {
    const fam = getPaletteById(genomeFromHash(hash).paletteId)?.family;
    if (fam !== rarer) return hash; // not the rare family — keep
    if (rand() >= prob) return hash; // rare family, but sometimes keep it ("still possible")
    hash = randomHash(rand);
  }
  return hash;
}

/** The clickable attributes, in HUD order. */
export const FEATURE_KEYS: readonly (keyof Features)[] = [
  'Palette',
  'Split',
  'Band Density',
  'Finish',
  'Drift',
  'Processing',
  'Perfect Horizon',
  'Full Corruption',
];

// For each feature, a function proposing new values for the genome fields it depends on. The
// proposals aim to *cross* the feature's threshold; rerollFeature verifies via deriveFeatures.
const PROPOSE: Record<string, (g: Genome, r: R) => Partial<Genome>> = {
  Palette: (g, r) => {
    const fam = getPaletteById(g.paletteId)?.family;
    const others = PALETTES.filter((p) => p.family !== fam);
    const pool = others.length ? others : PALETTES.filter((p) => p.id !== g.paletteId);
    const p = pool[Math.floor(r() * pool.length)] ?? PALETTES[0]!;
    return { paletteId: p.id, stopJitter: jitter6(r) };
  },
  Split: (g, r) => {
    const cur = deriveFeatures(g).Split;
    // Propose a value that crosses the current one. Bars ↔ Grid ↔ Blocks; skewed small like the
    // genome (wide splits stay rare), so clicking Split stays in pleasing territory.
    const someHbands = () => (r() < 0.7 ? ui(r, 2, 10) : ui(r, 11, 40));
    const someBlocksN = () => (r() < 0.7 ? ui(r, 2, 8) : ui(r, 9, 40));
    if (cur === 'Blocks') {
      return r() < 0.5
        ? { blocks: false, hbands: 1 }
        : { blocks: false, hbands: someHbands() };
    }
    if (cur === 'Grid') {
      return r() < 0.5
        ? { blocks: false, hbands: 1 }
        : { blocks: true, blocksN: someBlocksN() };
    }
    // Bars
    return r() < 0.5
      ? { blocks: false, hbands: someHbands() }
      : { blocks: true, blocksN: someBlocksN() };
  },
  'Band Density': (g, r) => ({ bands: g.bands >= 24 ? ui(r, 8, 23) : ui(r, 24, 48) }),
  Finish: (g) => ({ clean: !g.clean }),
  Drift: (g, r) => {
    const flowing = g.bandDrift + g.rowDisplace + (g.driftCycles - 1) * 0.03 > 0.09;
    return flowing
      ? { bandDrift: uf(r, 0.015, 0.028), rowDisplace: uf(r, 0, 0.008), driftCycles: 1 }
      : { bandDrift: uf(r, 0.05, 0.09), rowDisplace: uf(r, 0.03, 0.06), driftCycles: ui(r, 2, 3) };
  },
  Processing: (_g, r) => ({
    grain: uf(r, 0.04, 0.5),
    dither: uf(r, 0.2, 0.9),
    chroma: r() < 0.45 ? uf(r, 0, 0.6) : 0,
    quantLevels: ui(r, 5, 16),
  }),
  'Perfect Horizon': (g, r) => {
    const on = deriveFeatures(g)['Perfect Horizon'];
    return on
      ? { horizon: r() < 0.5 ? uf(r, 0.3, 0.39) : uf(r, 0.53, 0.62), rowDisplace: uf(r, 0.03, 0.06) }
      : { horizon: uf(r, 0.42, 0.5), rowDisplace: uf(r, 0, 0.014) };
  },
  'Full Corruption': (g, r) => {
    const on = deriveFeatures(g)['Full Corruption'];
    return on
      ? { chroma: 0, grain: uf(r, 0.04, 0.28), quantLevels: ui(r, 11, 16) }
      : { chroma: uf(r, 0.4, 0.6), grain: uf(r, 0.36, 0.5), quantLevels: ui(r, 5, 8) };
  },
};

/**
 * Return a new genome with a single feature changed. Re-rolls the fields that feature depends on
 * until `deriveFeatures[key]` actually differs (bounded); best-effort if it can't. The rest of the
 * genome is untouched, so only that one attribute of the sky moves.
 */
export function rerollFeature(g: Genome, key: string, rand: R = Math.random): Genome {
  const propose = PROPOSE[key];
  if (!propose) return g;
  const before = deriveFeatures(g)[key];
  let next = g;
  for (let i = 0; i < 48; i++) {
    next = { ...g, ...propose(g, rand) };
    if (deriveFeatures(next)[key] !== before) return next;
  }
  return next;
}
