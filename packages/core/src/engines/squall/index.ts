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
    p.amount < 0.5
      ? { amount: uf(r, 0.55, 0.9) }
      : { amount: uf(r, 0.35, 0.48) },
  Squalls: (p, r) => ({ bursts: ((p.bursts - 1 + rangeInt(r, 1, 2)) % 3) + 1 }),
  Blocks: (p, r) => {
    const ratio = Math.max(p.blocksX, p.blocksY) / Math.min(p.blocksX, p.blocksY);
    if (ratio > 1.6) {
      const n = rangeInt(r, 8, 16);
      return { blocksX: n, blocksY: n }; // square-ish → Coarse/Fine
    }
    return p.blocksX <= 10
      ? { blocksX: rangeInt(r, 13, 20), blocksY: rangeInt(r, 13, 20) } // Coarse → Fine
      : { blocksX: rangeInt(r, 6, 10), blocksY: rangeInt(r, 14, 20) }; // Fine → Torn (lopsided)
  },
  Tearing: (p, r) => (p.tear > 0.032 ? { tear: uf(r, 0.01, 0.028) } : { tear: uf(r, 0.036, 0.05) }),
  'Signal Lost': (p, r) => {
    const on = p.amount > 0.8 && p.bloom > 0.7 && p.steps >= 6;
    return on
      ? { amount: uf(r, 0.4, 0.7), bloom: uf(r, 0.35, 0.6) }
      : { amount: uf(r, 0.82, 0.9), bloom: uf(r, 0.72, 0.85), steps: rangeInt(r, 6, 9) };
  },
  'Clear Skies': (p, r) => {
    const on = p.amount < 0.45 && p.bloom < 0.55;
    return on
      ? { amount: uf(r, 0.5, 0.85), bloom: uf(r, 0.58, 0.85) }
      : { amount: uf(r, 0.35, 0.43), bloom: uf(r, 0.35, 0.52) };
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
    'A stateless datamosh — a calm sky that a squall of signal corruption sweeps through and clears. Macroblock motion error, cyan/magenta chroma tearing, held-frame snaps. Young and experimental.',
  keyVersion: 1,
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
