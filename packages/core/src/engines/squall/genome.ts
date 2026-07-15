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
  // the calm base is a clean grid of flat sky-pixels that pulse in colour over the loop
  pulse: number; // colour-pulse amplitude of the clean pixels
  pulseCycles: number; // integer pulse cycles per loop (seamless)
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
  // A lively colour breathe — the sky must visibly MOVE (v0.7: both ranges lifted).
  const pulse = range(rand, 0.06, 0.16);
  const pulseCycles = rangeInt(rand, 2, 5); // integer → seamless

  // Coarse macroblocks like a low-bitrate codec — usually roughly square, sometimes lopsided.
  const blocksX = rangeInt(rand, 4, 18);
  const blocksY = chance(rand, 0.65) ? blocksX : rangeInt(rand, 4, 18);
  const steps = rangeInt(rand, 5, 12); // integer held-frames → seamless snaps (snappier judder)
  const bursts = rangeInt(rand, 1, 3); // integer sweeps → env returns to clear at the seam
  // Punchier envelope so the squall is a brief spike — the sky is CLEAN most of the loop.
  const sharpness = range(rand, 2.6, 6.0);
  // Corruption is the rare seasoning: the fraction of blocks that go corrupt skews low.
  const amount = 0.12 + Math.pow(rand(), 1.8) * 0.5; // 0.12..0.62, skewed low
  const motion = range(rand, 0.05, 0.22); // harder macroblock displacement when it DOES hit
  const tear = range(rand, 0.015, 0.06);
  const bloom = range(rand, 0.3, 0.75);
  const streak = range(rand, 0.1, 0.7);

  const quantLevels = rangeInt(rand, 6, 18);
  const grain = range(rand, 0.03, 0.22); // lighter crush — the clean sky dominates
  const dither = range(rand, 0.1, 0.5);
  const chroma = chance(rand, 0.28) ? range(rand, 0.0, 0.4) : 0.0;
  const vignette = range(rand, 0.08, 0.45);

  const reserved: number[] = [];
  for (let i = 0; i < SQUALL_RESERVED; i++) reserved.push(rand());

  const loopSeconds = range(rand, 20, 34);

  return {
    skyPaletteId: palette.id,
    skyJitter,
    horizon,
    sunX,
    sunStrength,
    pulse,
    pulseCycles,
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
