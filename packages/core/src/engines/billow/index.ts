/**
 * Billow — a second engine: rolling billowing clouds sweeping across a blue sky (toward the `35`
 * reference). Its own key, shaders, palettes, and features; shares the GL helpers and post pass.
 * Young and evolving — its key reserves blank draws and carries the experimental Phase-4 mode.
 */

import type { Engine } from '../types.js';
import { BillowRenderer } from './renderer.js';
import { billowGenome, CLOUD_TYPES, type BillowParams, type BillowMode } from './genome.js';
import { billowFeatures } from './features.js';
import { BILLOW_PALETTES, MAX_SKY_STOPS } from './palettes.js';
import { rangeInt, type Rng } from '../../rng.js';

type R = Rng;
const uf = (r: R, a: number, b: number) => a + (b - a) * r();

const PROPOSE: Record<string, (p: BillowParams, r: R) => Partial<BillowParams>> = {
  Sky: (p, r) => {
    const others = BILLOW_PALETTES.filter((x) => x.id !== p.skyPaletteId);
    const pick = others[Math.floor(r() * others.length)] ?? BILLOW_PALETTES[0]!;
    return { skyPaletteId: pick.id, skyJitter: Array.from({ length: MAX_SKY_STOPS }, () => uf(r, -0.05, 0.05)) };
  },
  // Re-cast the sky as a different cloud type: pick another recipe and redraw its parameters.
  Clouds: (p, r) => {
    const others = CLOUD_TYPES.filter((t) => t.id !== p.cloudType);
    const t = others[Math.floor(r() * others.length)] ?? CLOUD_TYPES[0]!;
    return {
      cloudType: t.id,
      coverage: uf(r, t.coverage[0], t.coverage[1]),
      softness: uf(r, t.softness[0], t.softness[1]),
      scale: uf(r, t.scale[0], t.scale[1]),
      stretch: uf(r, t.stretch[0], t.stretch[1]),
      darken: uf(r, t.darken[0], t.darken[1]),
      billow: uf(r, t.billow[0], t.billow[1]),
    };
  },
  Coverage: (_p, r) => ({ coverage: uf(r, 0.25, 0.78) }),
  Wind: (p, r) => ({ wind: ((p.wind - 1 + rangeInt(r, 1, 3)) % 4) + 1 }),
  Churn: (p, r) => ({ billow: p.billow > 0.45 ? uf(r, 0.1, 0.4) : uf(r, 0.5, 0.85) }),
  Finish: (p, r) =>
    p.distorted
      ? { distorted: false, grain: uf(r, 0.01, 0.08), dither: uf(r, 0.02, 0.15), chroma: 0, quantLevels: rangeInt(r, 10, 20) }
      : { distorted: true, grain: uf(r, 0.15, 0.4), dither: uf(r, 0.4, 0.8), chroma: r() < 0.6 ? uf(r, 0.15, 0.5) : 0, quantLevels: rangeInt(r, 5, 10) },
  Mode: (p) => ({ mode: (p.mode === 'mosaic' ? 'clouds' : 'mosaic') as BillowMode }),
  'Golden Light': (p, r) => {
    const on = p.sunStrength > 0.55 && p.horizon < 0.4;
    return on
      ? { sunStrength: uf(r, 0.1, 0.45), horizon: uf(r, 0.42, 0.5) }
      : { sunStrength: uf(r, 0.58, 0.7), horizon: uf(r, 0.28, 0.38) };
  },
  'Full Mosaic': (p, r) => {
    const on = p.mode === 'mosaic' && p.tile >= 10;
    return on ? { mode: 'clouds' as BillowMode } : { mode: 'mosaic' as BillowMode, tile: rangeInt(r, 10, 14) };
  },
};

function billowReroll(p: BillowParams, key: string, rand: R): BillowParams {
  const propose = PROPOSE[key];
  if (!propose) return p;
  const before = billowFeatures(p)[key];
  let next = p;
  for (let i = 0; i < 48; i++) {
    next = { ...p, ...propose(p, rand) };
    if (billowFeatures(next)[key] !== before) return next;
  }
  return next;
}

export const BILLOW: Engine<BillowParams> = {
  id: 'billow',
  name: 'Billow',
  description:
    'Clouds across a blue sky — 20 named types, thin cirrus streaks to the cumulonimbus storm tower. Procedural FBM, seamless drift + churn; clean 4 in 5 skies. Young — carries the experimental Phase-4 mosaic mode.',
  keyVersion: 4,
  genome: billowGenome,
  features: billowFeatures,
  createRenderer: (gl, iw, ih) => new BillowRenderer(gl, iw, ih),
  reroll: billowReroll,
};

// re-exports for tooling/tests
export { billowGenome, billowGenomeFromHash, CLOUD_TYPES, getCloudType } from './genome.js';
export type { BillowParams, BillowMode, CloudType } from './genome.js';
export { billowFeatures } from './features.js';
export { BILLOW_PALETTES, getBillowPalette } from './palettes.js';
