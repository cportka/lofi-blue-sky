/**
 * Rarity features — the human-readable traits fxhash shows on a token and indexes for rarity.
 * Derived deterministically from the genome (same hash → same features). Registered on the token
 * via `$fx.features(deriveFeatures(genome))`.
 */

import type { Genome } from './genome.js';
import { getPaletteById, type PaletteFamily } from './palettes.js';

export interface Features {
  Palette: PaletteFamily;
  Split: 'Single Pixel' | 'Bars' | 'Grid' | 'Blocks';
  'Band Density': 'Fine' | 'Wide';
  Movement: 'True Clean' | 'Clean Sweep' | 'Classic' | 'Distorted';
  Drift: 'Still' | 'Flowing';
  Processing: 'Clean' | 'Grained' | 'Degraded';
  'True Horizon': boolean;
  'Full Corruption': boolean;
  [key: string]: string | boolean;
}

const MOVEMENT_LABEL = {
  'true-clean': 'True Clean',
  sweep: 'Clean Sweep',
  classic: 'Classic',
  distorted: 'Distorted',
} as const;

export function deriveFeatures(g: Genome): Features {
  const palette = getPaletteById(g.paletteId);
  const family: PaletteFamily = palette ? palette.family : 'Sodium';

  // How the frame is split: the 1×1 origin (the whole frame as one pixel, ~half of all skies),
  // a square block mosaic, a multi-column grid, or the classic bars.
  const split = g.blocks
    ? g.blocksN === 1
      ? 'Single Pixel'
      : 'Blocks'
    : g.hbands > 1
      ? 'Grid'
      : 'Bars';

  const bandDensity = g.bands >= 24 ? 'Fine' : 'Wide';

  // How the sky moves — True Clean is the sky (~90%); everything else is the rare seasoning.
  const movement = MOVEMENT_LABEL[g.movement] ?? 'True Clean';

  // Every sky pulses; Drift is the *strength* of that pulse (plus the smear on smeared movements).
  const smeared = g.movement === 'classic' || g.movement === 'distorted';
  const motion = g.bandDrift + (g.driftCycles - 1) * 0.02 + (smeared ? g.rowDisplace : 0);
  const drift = motion > 0.06 ? 'Flowing' : 'Still';

  const wear = g.grain + g.dither * 0.5 + g.chroma + (16 - g.quantLevels) * 0.03;
  const processing = wear > 1.0 ? 'Degraded' : wear > 0.55 ? 'Grained' : 'Clean';

  // True Horizon — a crisp, always-distinguishable colour edge at the horizon. Unlike the old
  // label-only "Perfect Horizon", this trait is VISUALIZED: the sky pass pushes the gradient
  // apart across uHorizon when it holds (see sky.ts / pipeline.ts — same derivation).
  const trueHorizon = g.horizon > 0.4 && g.horizon < 0.52 && g.rowDisplace < 0.025;
  const fullCorruption = g.chroma > 0.3 && g.grain > 0.32 && g.quantLevels <= 9;

  return {
    Palette: family,
    Split: split,
    'Band Density': bandDensity,
    Movement: movement,
    Drift: drift,
    Processing: processing,
    'True Horizon': trueHorizon,
    'Full Corruption': fullCorruption,
  };
}
