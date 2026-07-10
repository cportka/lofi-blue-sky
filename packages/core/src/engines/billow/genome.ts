/**
 * Billow's key — `hash → params`. Independent from Genesis; its own frozen draw order (once minted).
 *
 * Billow is young, so its key deliberately draws a block of **reserved** values it doesn't use yet:
 * blank space to grow into as the design settles, without shifting existing fields later (the same
 * forward-compat trick Genesis used). Phase-4 modes ride here as an EXPERIMENTAL `mode` field —
 * `clouds` and `mosaic` are live; `sort` / `mosh` are reserved.
 */

import { range, rangeInt, pick, chance, weightedIndex, type Rng } from '../../rng.js';
import { createRng } from '../../rng.js';
import { normalizeHash } from '../../hash.js';
import { BILLOW_PALETTES, MAX_SKY_STOPS } from './palettes.js';
import type { BaseParams } from '../types.js';

export type BillowMode = 'clouds' | 'mosaic' | 'sort' | 'mosh';

/** Number of reserved (currently unused) draws kept blank in the key for future design. */
export const BILLOW_RESERVED = 8;

export interface BillowParams extends BaseParams {
  skyPaletteId: string;
  skyJitter: number[]; // per sky stop, length MAX_SKY_STOPS
  horizon: number;
  sunX: number;
  sunStrength: number;
  coverage: number;
  softness: number;
  scale: number;
  wind: number; // integer periods per loop (seamless)
  billow: number;
  period: number; // integer noise period (seamless wrap)
  layers: number; // 1–2
  // experimental Phase 4
  mode: BillowMode;
  tile: number; // mosaic tile size
  // shared post
  quantLevels: number;
  grain: number;
  dither: number;
  chroma: number;
  vignette: number;
  // reserved blank space (drawn but unused — headroom for future params)
  reserved: number[];
  loopSeconds: number;
}

export function billowGenome(rand: Rng): BillowParams {
  const palette = pick(rand, BILLOW_PALETTES);
  const skyJitter: number[] = [];
  for (let i = 0; i < MAX_SKY_STOPS; i++) skyJitter.push(range(rand, -0.05, 0.05));

  const horizon = range(rand, 0.28, 0.5);
  const sunX = range(rand, 0.2, 0.8);
  const sunStrength = range(rand, 0.1, 0.7);

  const coverage = range(rand, 0.32, 0.66);
  const softness = range(rand, 0.06, 0.22);
  const scale = range(rand, 2.2, 5.5);
  const wind = rangeInt(rand, 1, 3); // integer → seamless horizontal drift
  const billow = range(rand, 0.15, 0.7);
  const period = rangeInt(rand, 6, 12); // integer noise period
  const layers = chance(rand, 0.55) ? 2 : 1;

  // EXPERIMENTAL mode: mostly clouds, occasionally mosaic. sort/mosh reserved (never selected yet).
  const mode: BillowMode = weightedIndex(rand, [0.82, 0.18]) === 1 ? 'mosaic' : 'clouds';
  const tile = rangeInt(rand, 4, 14);

  // Lean clean: most Billow skies are clean, smooth clouds — the crush is light and chroma rare.
  const quantLevels = rangeInt(rand, 8, 20);
  const grain = range(rand, 0.02, 0.2);
  const dither = range(rand, 0.1, 0.4);
  const chroma = chance(rand, 0.2) ? range(rand, 0.0, 0.3) : 0.0;
  const vignette = range(rand, 0.08, 0.45);

  const reserved: number[] = [];
  for (let i = 0; i < BILLOW_RESERVED; i++) reserved.push(rand());

  const loopSeconds = range(rand, 20, 34);

  return {
    skyPaletteId: palette.id,
    skyJitter,
    horizon,
    sunX,
    sunStrength,
    coverage,
    softness,
    scale,
    wind,
    billow,
    period,
    layers,
    mode,
    tile,
    quantLevels,
    grain,
    dither,
    chroma,
    vignette,
    reserved,
    loopSeconds,
  };
}

export function billowGenomeFromHash(hash: string): BillowParams {
  return billowGenome(createRng(normalizeHash(hash)));
}
