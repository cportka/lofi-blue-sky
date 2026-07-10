/**
 * Squall — a third engine: a stateless datamosh, a calm sky that a squall of signal corruption
 * sweeps through and clears (toward the `13` reference). Its own key, shaders, palettes, and
 * features; shares the GL helpers and post pass. Young and experimental — its key reserves blank
 * draws to grow into.
 */

import type { Engine } from '../types.js';
import { SquallRenderer } from './renderer.js';
import { squallGenome, type SquallParams } from './genome.js';
import { squallFeatures } from './features.js';
import { SQUALL_PALETTES, MAX_SQUALL_STOPS } from './palettes.js';
import { rangeInt, type Rng } from '../../rng.js';

type R = Rng;
const uf = (r: R, a: number, b: number) => a + (b - a) * r();

const PROPOSE: Record<string, (p: SquallParams, r: R) => Partial<SquallParams>> = {
  Sky: (p, r) => {
    const others = SQUALL_PALETTES.filter((x) => x.id !== p.skyPaletteId);
    const pick = others[Math.floor(r() * others.length)] ?? SQUALL_PALETTES[0]!;
    return { skyPaletteId: pick.id, skyJitter: Array.from({ length: MAX_SQUALL_STOPS }, () => uf(r, -0.05, 0.05)) };
  },
  Corruption: (p, r) =>
    p.amount < 0.3
      ? { amount: uf(r, 0.34, 0.62) }
      : { amount: uf(r, 0.13, 0.27) },
  Squalls: (p, r) => ({ bursts: ((p.bursts - 1 + rangeInt(r, 1, 2)) % 3) + 1 }),
  Blocks: (p, r) => {
    const ratio = Math.max(p.blocksX, p.blocksY) / Math.min(p.blocksX, p.blocksY);
    if (ratio > 1.6) {
      const n = rangeInt(r, 6, 14);
      return { blocksX: n, blocksY: n }; // square-ish → Coarse/Fine
    }
    return p.blocksX <= 9
      ? { blocksX: rangeInt(r, 12, 18), blocksY: rangeInt(r, 12, 18) } // Coarse → Fine
      : { blocksX: rangeInt(r, 4, 8), blocksY: rangeInt(r, 13, 18) }; // Fine → Torn (lopsided)
  },
  Tearing: (p, r) => (p.tear > 0.032 ? { tear: uf(r, 0.01, 0.028) } : { tear: uf(r, 0.036, 0.05) }),
  'Signal Lost': (p, r) => {
    const on = p.amount > 0.52 && p.bloom > 0.6 && p.steps >= 6;
    return on
      ? { amount: uf(r, 0.2, 0.45), bloom: uf(r, 0.3, 0.55) }
      : { amount: uf(r, 0.55, 0.62), bloom: uf(r, 0.64, 0.75), steps: rangeInt(r, 6, 9) };
  },
  'Clear Skies': (p, r) => {
    const on = p.amount < 0.24 && p.bloom < 0.5;
    return on
      ? { amount: uf(r, 0.32, 0.6), bloom: uf(r, 0.55, 0.75) }
      : { amount: uf(r, 0.13, 0.22), bloom: uf(r, 0.32, 0.48) };
  },
};

function squallReroll(p: SquallParams, key: string, rand: R): SquallParams {
  const propose = PROPOSE[key];
  if (!propose) return p;
  const before = squallFeatures(p)[key];
  let next = p;
  for (let i = 0; i < 48; i++) {
    next = { ...p, ...propose(p, rand) };
    if (squallFeatures(next)[key] !== before) return next;
  }
  return next;
}

export const SQUALL: Engine<SquallParams> = {
  id: 'squall',
  name: 'Squall',
  description:
    'A clean grid of sky-pixels that a rare squall of datamosh sweeps through and clears. Mostly the calm, pulsing pixel sky; occasionally macroblock motion error and cyan/magenta chroma tearing. Young and experimental.',
  keyVersion: 2,
  genome: squallGenome,
  features: squallFeatures,
  createRenderer: (gl, iw, ih) => new SquallRenderer(gl, iw, ih),
  reroll: squallReroll,
};

// re-exports for tooling/tests
export { squallGenome, squallGenomeFromHash, SQUALL_RESERVED } from './genome.js';
export type { SquallParams } from './genome.js';
export { squallFeatures } from './features.js';
export { SQUALL_PALETTES, getSquallPalette } from './palettes.js';
