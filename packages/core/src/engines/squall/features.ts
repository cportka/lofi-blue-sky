/**
 * Squall rarity traits, derived deterministically from its params.
 */

import type { Features } from '../types.js';
import { getSquallPalette } from './palettes.js';
import type { SquallParams } from './genome.js';

export function squallFeatures(p: SquallParams): Features {
  const palette = getSquallPalette(p.skyPaletteId);

  const corruption = p.amount < 0.3 ? 'Light' : p.amount < 0.48 ? 'Heavy' : 'Total';
  const cadence = p.bursts <= 1 ? 'One Squall' : p.bursts === 2 ? 'Two Squalls' : 'Three Squalls';
  // Roughly-square macroblocks read as a grid; very different counts read as torn bands.
  const ratio = Math.max(p.blocksX, p.blocksY) / Math.min(p.blocksX, p.blocksY);
  const blocks = ratio > 1.6 ? 'Torn' : p.blocksX <= 9 ? 'Coarse' : 'Fine';
  const tearing = p.tear > 0.032 ? 'Bleeding' : 'Fringed';

  // The squall's wind — how hard the rows get dragged when the burst hits.
  const winds = p.gust > 0.38 ? 'Gale' : p.gust > 0.24 ? 'Gusty' : 'Breeze';

  return {
    Sky: palette ? palette.name : 'Powder Signal',
    Corruption: corruption,
    Squalls: cadence,
    Winds: winds,
    Blocks: blocks,
    Tearing: tearing,
    // A rare heavier wipe: a lot of blocks flood hard, with hard snaps.
    'Signal Lost': p.amount > 0.52 && p.bloom > 0.6 && p.steps >= 6,
    // The calm end of the range: the sky barely corrupts at all — mostly a clean pixel sky.
    'Clear Skies': p.amount < 0.24 && p.bloom < 0.5,
  };
}
