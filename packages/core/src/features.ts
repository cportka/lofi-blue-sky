/**
 * Rarity features — the human-readable traits fxhash shows on a token and indexes for rarity.
 * Derived deterministically from the genome (same hash → same features). Registered on the token
 * via `$fx.features(deriveFeatures(genome))`.
 */

import type { Genome } from './genome.js';
import { getPaletteById, type PaletteFamily } from './palettes.js';

export interface Features {
  Palette: PaletteFamily;
  Split: 'Bars' | 'Grid' | 'Blocks';
  'Band Density': 'Fine' | 'Wide';
  Finish: 'Clean' | 'Distorted';
  Drift: 'Still' | 'Flowing';
  Processing: 'Clean' | 'Grained' | 'Degraded';
  'Perfect Horizon': boolean;
  'Full Corruption': boolean;
  [key: string]: string | boolean;
}

export function deriveFeatures(g: Genome): Features {
  const palette = getPaletteById(g.paletteId);
  const family: PaletteFamily = palette ? palette.family : 'Sodium';

  // How the frame is split (v2): a square block mosaic, a multi-column grid, or the classic bars.
  const split = g.blocks ? 'Blocks' : g.hbands > 1 ? 'Grid' : 'Bars';

  const bandDensity = g.bands >= 24 ? 'Fine' : 'Wide';

  // Clean finish (v2) renders flat cells with drift + smear off, so it also reads as Still.
  const finish = g.clean ? 'Clean' : 'Distorted';

  const motion = g.bandDrift + g.rowDisplace + (g.driftCycles - 1) * 0.03;
  const drift = g.clean || motion <= 0.09 ? 'Still' : 'Flowing';

  const wear = g.grain + g.dither * 0.5 + g.chroma + (16 - g.quantLevels) * 0.03;
  const processing = wear > 1.0 ? 'Degraded' : wear > 0.55 ? 'Grained' : 'Clean';

  // A clean, level horizon sitting near the golden band reads as a "perfect" one.
  // (Windows widened in v0.2.0 so the two rare flags actually vary as you explore — a label-only
  // tuning that never changes any seed's rendered pixels. They freeze at mint. See docs/CANON.md.)
  const perfectHorizon = g.horizon > 0.4 && g.horizon < 0.52 && g.rowDisplace < 0.025;
  const fullCorruption = g.chroma > 0.3 && g.grain > 0.32 && g.quantLevels <= 9;

  return {
    Palette: family,
    Split: split,
    'Band Density': bandDensity,
    Finish: finish,
    Drift: drift,
    Processing: processing,
    'Perfect Horizon': perfectHorizon,
    'Full Corruption': fullCorruption,
  };
}
