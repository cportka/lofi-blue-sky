/**
 * Billow rarity traits, derived deterministically from its params.
 */

import type { Features } from '../types.js';
import { getBillowPalette } from './palettes.js';
import type { BillowParams } from './genome.js';

export function billowFeatures(p: BillowParams): Features {
  const palette = getBillowPalette(p.skyPaletteId);
  const coverage =
    p.coverage < 0.4 ? 'Clear' : p.coverage < 0.58 ? 'Scattered' : 'Overcast';
  const wind = p.wind <= 1 ? 'Calm' : p.wind === 2 ? 'Breezy' : 'Gusty';
  const churn = p.billow > 0.45 ? 'Rolling' : 'Drifting';
  const mode = p.mode === 'mosaic' ? 'Mosaic (exp)' : 'Clouds';

  return {
    Sky: palette ? palette.name : 'Day Blue',
    Coverage: coverage,
    Wind: wind,
    Churn: churn,
    Finish: p.distorted ? 'Distorted' : 'Clean',
    Mode: mode,
    'Golden Light': p.sunStrength > 0.55 && p.horizon < 0.4,
    'Full Mosaic': p.mode === 'mosaic' && p.tile >= 10,
  };
}
