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

/**
 * A cloud type — a named recipe of parameter ranges. Billow is all about cloud types: the genome
 * picks one, then draws each parameter inside the type's ranges (fixed draw count, so the key
 * stays deterministic). `coverage` is the mask threshold (LOW = dense sky, HIGH = sparse);
 * `stretch` elongates the noise horizontally (cirrus, lenticular waves); `darken` greys the cloud
 * body toward storm (nimbus) tones.
 */
export interface CloudType {
  id: string;
  name: string;
  coverage: [number, number];
  softness: [number, number];
  scale: [number, number];
  stretch: [number, number];
  darken: [number, number];
  billow: [number, number];
}

/** The taxonomy — 20 cloud types, thin cirrus to the cumulonimbus storm tower. */
export const CLOUD_TYPES: readonly CloudType[] = [
  { id: 'cirrus', name: 'Cirrus', coverage: [0.6, 0.7], softness: [0.04, 0.09], scale: [3.0, 4.5], stretch: [3, 5], darken: [0, 0.05], billow: [0.15, 0.35] },
  { id: 'cirrostratus', name: 'Cirrostratus', coverage: [0.42, 0.5], softness: [0.24, 0.3], scale: [1.6, 2.4], stretch: [2, 3.5], darken: [0, 0.06], billow: [0.1, 0.25] },
  { id: 'cirrocumulus', name: 'Cirrocumulus', coverage: [0.5, 0.58], softness: [0.05, 0.09], scale: [6, 8], stretch: [1.4, 2], darken: [0, 0.05], billow: [0.15, 0.3] },
  { id: 'altocumulus', name: 'Altocumulus', coverage: [0.46, 0.56], softness: [0.07, 0.12], scale: [4, 5.5], stretch: [1.1, 1.6], darken: [0.02, 0.1], billow: [0.25, 0.45] },
  { id: 'altostratus', name: 'Altostratus', coverage: [0.36, 0.44], softness: [0.2, 0.28], scale: [1.8, 2.6], stretch: [1.5, 2.5], darken: [0.15, 0.3], billow: [0.1, 0.25] },
  { id: 'stratus', name: 'Stratus', coverage: [0.3, 0.38], softness: [0.18, 0.26], scale: [1.6, 2.2], stretch: [1.8, 3], darken: [0.1, 0.22], billow: [0.08, 0.2] },
  { id: 'stratocumulus', name: 'Stratocumulus', coverage: [0.36, 0.46], softness: [0.09, 0.15], scale: [2.6, 3.6], stretch: [1.2, 1.8], darken: [0.08, 0.18], billow: [0.3, 0.5] },
  { id: 'nimbostratus', name: 'Nimbostratus', coverage: [0.28, 0.36], softness: [0.16, 0.24], scale: [1.8, 2.6], stretch: [1.3, 2], darken: [0.35, 0.55], billow: [0.15, 0.3] },
  { id: 'cumulus-humilis', name: 'Cumulus Humilis', coverage: [0.56, 0.66], softness: [0.05, 0.1], scale: [3.4, 4.6], stretch: [1, 1.3], darken: [0, 0.06], billow: [0.3, 0.45] },
  { id: 'cumulus', name: 'Cumulus', coverage: [0.5, 0.6], softness: [0.06, 0.11], scale: [2.6, 3.6], stretch: [1, 1.3], darken: [0.02, 0.08], billow: [0.35, 0.55] },
  { id: 'cumulus-congestus', name: 'Cumulus Congestus', coverage: [0.42, 0.52], softness: [0.07, 0.12], scale: [2.0, 2.8], stretch: [1, 1.2], darken: [0.1, 0.2], billow: [0.5, 0.7] },
  { id: 'cumulonimbus', name: 'Cumulonimbus', coverage: [0.34, 0.44], softness: [0.08, 0.14], scale: [1.7, 2.4], stretch: [1, 1.2], darken: [0.4, 0.6], billow: [0.6, 0.85] },
  { id: 'mammatus', name: 'Mammatus', coverage: [0.4, 0.5], softness: [0.05, 0.09], scale: [3.2, 4.2], stretch: [1, 1.3], darken: [0.3, 0.45], billow: [0.55, 0.75] },
  { id: 'lenticularis', name: 'Lenticularis', coverage: [0.5, 0.6], softness: [0.04, 0.07], scale: [2.2, 3.0], stretch: [3.5, 5], darken: [0.02, 0.1], billow: [0.1, 0.2] },
  { id: 'castellanus', name: 'Castellanus', coverage: [0.46, 0.56], softness: [0.06, 0.1], scale: [4.5, 6], stretch: [1.6, 2.4], darken: [0.06, 0.14], billow: [0.4, 0.6] },
  { id: 'undulatus', name: 'Undulatus', coverage: [0.44, 0.54], softness: [0.08, 0.14], scale: [4.5, 6.5], stretch: [2.5, 4], darken: [0.04, 0.12], billow: [0.2, 0.35] },
  { id: 'fractus', name: 'Fractus', coverage: [0.5, 0.6], softness: [0.04, 0.08], scale: [4.5, 6.5], stretch: [1.2, 1.8], darken: [0.08, 0.18], billow: [0.55, 0.75] },
  { id: 'contrails', name: 'Contrails', coverage: [0.62, 0.72], softness: [0.03, 0.06], scale: [5, 7], stretch: [4, 5], darken: [0, 0.04], billow: [0.05, 0.15] },
  { id: 'fog', name: 'Fog', coverage: [0.24, 0.32], softness: [0.26, 0.32], scale: [1.4, 2], stretch: [1, 1.5], darken: [0.02, 0.1], billow: [0.1, 0.2] },
  { id: 'fair-weather', name: 'Fair Weather', coverage: [0.68, 0.78], softness: [0.06, 0.12], scale: [2.5, 3.5], stretch: [1, 1.5], darken: [0, 0.04], billow: [0.15, 0.3] },
];

export function getCloudType(id: string): CloudType | undefined {
  return CLOUD_TYPES.find((t) => t.id === id);
}

export interface BillowParams extends BaseParams {
  skyPaletteId: string;
  skyJitter: number[]; // per sky stop, length MAX_SKY_STOPS
  horizon: number;
  sunX: number;
  sunStrength: number;
  cloudType: string; // id into CLOUD_TYPES — the named recipe this sky was drawn from
  coverage: number;
  softness: number;
  scale: number;
  stretch: number; // horizontal elongation of the cloud field (cirrus, lenticular waves)
  darken: number; // storm greying of the cloud body (nimbus types)
  wind: number; // integer periods per loop (seamless)
  billow: number;
  period: number; // integer noise period (seamless wrap)
  layers: number; // 1–2
  // experimental Phase 4
  mode: BillowMode;
  tile: number; // mosaic tile size
  // finish — ~20% of skies carry the full lofi crush; the rest are clean, smooth clouds
  distorted: boolean;
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

  const horizon = range(rand, 0.2, 0.58);
  const sunX = range(rand, 0.1, 0.9);
  const sunStrength = range(rand, 0.05, 0.8);

  // Billow is all about cloud types (v0.8): pick one of the 20 named recipes, then draw every
  // cloud parameter inside the type's ranges — same draw count for every type (the contract).
  const type = pick(rand, CLOUD_TYPES);
  const coverage = range(rand, type.coverage[0], type.coverage[1]);
  const softness = range(rand, type.softness[0], type.softness[1]);
  const scale = range(rand, type.scale[0], type.scale[1]);
  const stretch = range(rand, type.stretch[0], type.stretch[1]);
  const darken = range(rand, type.darken[0], type.darken[1]);
  const billow = range(rand, type.billow[0], type.billow[1]);
  const wind = rangeInt(rand, 1, 4); // integer → seamless horizontal drift
  const period = rangeInt(rand, 6, 14); // integer noise period
  const layers = chance(rand, 0.55) ? 2 : 1;

  // EXPERIMENTAL mode: mostly clouds, occasionally mosaic. sort/mosh reserved (never selected yet).
  const mode: BillowMode = weightedIndex(rand, [0.88, 0.12]) === 1 ? 'mosaic' : 'clouds';
  const tile = rangeInt(rand, 4, 14);

  // Light on the distortion: ~80% of Billow skies are CLEAN (near-zero crush); ~20% carry the
  // full lofi crush. Both branches draw the same count (determinism contract).
  const distorted = chance(rand, 0.2);
  const quantLevels = distorted ? rangeInt(rand, 5, 10) : rangeInt(rand, 10, 20);
  const grain = distorted ? range(rand, 0.15, 0.4) : range(rand, 0.01, 0.08);
  const dither = distorted ? range(rand, 0.4, 0.8) : range(rand, 0.02, 0.15);
  const chromaOn = chance(rand, 0.6);
  const chromaMag = range(rand, 0.15, 0.5);
  const chroma = distorted && chromaOn ? chromaMag : 0.0;
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
    cloudType: type.id,
    coverage,
    softness,
    scale,
    stretch,
    darken,
    wind,
    billow,
    period,
    layers,
    mode,
    tile,
    distorted,
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
