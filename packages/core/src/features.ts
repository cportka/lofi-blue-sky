/**
 * Rarity features — the human-readable traits fxhash shows on a token and indexes for rarity.
 * Derived deterministically from the genome (same hash → same features). Registered on the token
 * via `$fx.features(deriveFeatures(genome))`.
 */

import type { Genome } from './genome.js';
import { getPaletteById, type PaletteFamily } from './palettes.js';

export interface Features {
  Palette: PaletteFamily;
  'Band Density': 'Fine' | 'Wide';
  Drift: 'Still' | 'Flowing';
  Processing: 'Clean' | 'Grained' | 'Degraded';
  'Perfect Horizon': boolean;
  'Full Corruption': boolean;
  [key: string]: string | boolean;
}

export function deriveFeatures(g: Genome): Features {
  const palette = getPaletteById(g.paletteId);
  const family: PaletteFamily = palette ? palette.family : 'Sodium';

  const bandDensity = g.bands >= 24 ? 'Fine' : 'Wide';

  const motion = g.bandDrift + g.rowDisplace + (g.driftCycles - 1) * 0.03;
  const drift = motion > 0.09 ? 'Flowing' : 'Still';

  const wear = g.grain + g.dither * 0.5 + g.chroma + (16 - g.quantLevels) * 0.03;
  const processing = wear > 1.0 ? 'Degraded' : wear > 0.55 ? 'Grained' : 'Clean';

  // A clean, level horizon sitting near the golden band reads as a "perfect" one.
  const perfectHorizon = g.horizon > 0.42 && g.horizon < 0.5 && g.rowDisplace < 0.02;
  const fullCorruption = g.chroma > 0.4 && g.grain > 0.35 && g.quantLevels <= 7;

  return {
    Palette: family,
    'Band Density': bandDensity,
    Drift: drift,
    Processing: processing,
    'Perfect Horizon': perfectHorizon,
    'Full Corruption': fullCorruption,
  };
}
