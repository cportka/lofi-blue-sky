/**
 * Squall's key — `hash → params`. Independent from the other engines; its own frozen draw order.
 *
 * Squall is a *stateless datamosh*: a calm sky that a squall of signal corruption rolls through and
 * clears, seamlessly, over the loop. The corruption is emulated procedurally (macroblock motion
 * error + cyan/magenta chroma tearing + held-frame snaps + horizontal sort streaks) so there is no
 * feedback history — the whole storm is a periodic function of the loop phase. Young, so its key
 * reserves blank draws to grow into (the same forward-compat trick as Genesis/Billow).
 */

import { range, rangeInt, pick, chance, type Rng } from '../../rng.js';
import { createRng } from '../../rng.js';
import { normalizeHash } from '../../hash.js';
import { SQUALL_PALETTES, MAX_SQUALL_STOPS } from './palettes.js';
import type { BaseParams } from '../types.js';

/** Number of reserved (currently unused) draws kept blank in the key for future design. */
export const SQUALL_RESERVED = 6;

export interface SquallParams extends BaseParams {
  skyPaletteId: string;
  skyJitter: number[]; // per sky stop, length MAX_SQUALL_STOPS
  horizon: number;
  sunX: number;
  sunStrength: number;
  // datamosh grid + timing
  blocksX: number; // macroblock columns
  blocksY: number; // macroblock rows
  steps: number; // integer held-frames per loop (seamless snap cadence)
  bursts: number; // integer corruption sweeps per loop (seamless envelope)
  sharpness: number; // burst envelope shape (higher = punchier, mostly-clear)
  amount: number; // peak fraction of blocks corrupt
  motion: number; // macroblock displacement magnitude
  tear: number; // cyan/magenta chroma-separation strength
  bloom: number; // how hard corrupt blocks flood toward the hot/cold duo
  streak: number; // horizontal pixel-sort smear strength
  // shared post
  quantLevels: number;
  grain: number;
  dither: number;
  chroma: number;
  vignette: number;
  reserved: number[];
  loopSeconds: number;
}

export function squallGenome(rand: Rng): SquallParams {
  const palette = pick(rand, SQUALL_PALETTES);
  const skyJitter: number[] = [];
  for (let i = 0; i < MAX_SQUALL_STOPS; i++) skyJitter.push(range(rand, -0.05, 0.05));

  const horizon = range(rand, 0.3, 0.55);
  const sunX = range(rand, 0.2, 0.8);
  const sunStrength = range(rand, 0.1, 0.6);

  // Coarse macroblocks like a low-bitrate codec — usually roughly square, sometimes lopsided.
  const blocksX = rangeInt(rand, 6, 20);
  const blocksY = chance(rand, 0.6) ? blocksX : rangeInt(rand, 6, 20);
  const steps = rangeInt(rand, 3, 9); // integer held-frames → seamless snaps
  const bursts = rangeInt(rand, 1, 3); // integer sweeps → env returns to clear at the seam
  const sharpness = range(rand, 1.4, 4.0);
  const amount = range(rand, 0.35, 0.9);
  const motion = range(rand, 0.02, 0.14);
  const tear = range(rand, 0.01, 0.05);
  const bloom = range(rand, 0.35, 0.85);
  const streak = range(rand, 0.0, 0.6);

  const quantLevels = rangeInt(rand, 6, 18);
  const grain = range(rand, 0.04, 0.4);
  const dither = range(rand, 0.2, 0.8);
  const chroma = chance(rand, 0.4) ? range(rand, 0.0, 0.5) : 0.0;
  const vignette = range(rand, 0.08, 0.5);

  const reserved: number[] = [];
  for (let i = 0; i < SQUALL_RESERVED; i++) reserved.push(rand());

  const loopSeconds = range(rand, 20, 34);

  return {
    skyPaletteId: palette.id,
    skyJitter,
    horizon,
    sunX,
    sunStrength,
    blocksX,
    blocksY,
    steps,
    bursts,
    sharpness,
    amount,
    motion,
    tear,
    bloom,
    streak,
    quantLevels,
    grain,
    dither,
    chroma,
    vignette,
    reserved,
    loopSeconds,
  };
}

export function squallGenomeFromHash(hash: string): SquallParams {
  return squallGenome(createRng(normalizeHash(hash)));
}
