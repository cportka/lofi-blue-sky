/**
 * Squall rarity traits, derived deterministically from its params.
 */

import type { Features } from '../types.js';
import { getSquallPalette } from './palettes.js';
import type { SquallParams } from './genome.js';

export function squallFeatures(p: SquallParams): Features {
  const palette = getSquallPalette(p.skyPaletteId);

  const corruption = p.amount < 0.5 ? 'Light' : p.amount < 0.72 ? 'Heavy' : 'Total';
  const cadence = p.bursts <= 1 ? 'One Squall' : p.bursts === 2 ? 'Two Squalls' : 'Three Squalls';
  // Roughly-square macroblocks read as a grid; very different counts read as torn bands.
  const ratio = Math.max(p.blocksX, p.blocksY) / Math.min(p.blocksX, p.blocksY);
  const blocks = ratio > 1.6 ? 'Torn' : p.blocksX <= 10 ? 'Coarse' : 'Fine';
  const tearing = p.tear > 0.032 ? 'Bleeding' : 'Fringed';

  return {
    Sky: palette ? palette.name : 'Powder Signal',
    Corruption: corruption,
    Squalls: cadence,
    Blocks: blocks,
    Tearing: tearing,
    // A rare near-total wipe: heavy flood, lots of blocks, hard snaps.
    'Signal Lost': p.amount > 0.8 && p.bloom > 0.7 && p.steps >= 6,
    // The calm end of the range: the sky mostly survives the squall.
    'Clear Skies': p.amount < 0.45 && p.bloom < 0.55,
  };
}
