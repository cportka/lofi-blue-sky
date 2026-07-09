import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genomeFromHash } from '../dist/genome.js';

// Canonical seeds — Chris's two picks. FROZEN at the current keyVersion. If any change alters the
// genome one of these hashes produces, this fails on purpose: it would mean a canonical sky no
// longer regenerates as-is. The genome, palettes, and shaders are the contract; everything else
// (UI, exploration policy, feature labels) may evolve without touching what a hash renders.
//
// v2 note: the Genesis key was opened (keyVersion 1 → 2) — the first two of the four reserved
// draws now drive the v2 geometry (hbands/clean/blocks). The DNA of these picks is byte-identical
// (palette, horizon, bands, colour, post all unchanged), and the geometry overlay activates:
// 00f50f keeps its sodium slit-scan but with a *clean* finish; 3ebed4 keeps its olive rows but
// woven into a 26-column *grid*. That is the sanctioned evolution — a new key, re-blessed picks.
// See docs/CANON.md.
const CANON = {
  // Chris's picks (v0.2.0), re-blessed under the v2 key.
  '00f50f353cf56cfa55f3b32404db3196e7cef86e37bd4b0fbca9304a8dd6097f': {
    mode: 'bands', paletteId: 'sodium-ember',
    stopJitter: [0.012655991921201343, -0.03318908608518541, 0.019618835337460047,
      0.015342185217887161, -0.02222185774706304, -0.019905288191512223],
    horizon: 0.42092513039708135, sunElevation: 0.43736527191009367, sunStrength: 0.7114813092630357,
    bands: 9, hbands: 1, clean: true, blocks: false, blocksN: 8,
    bandPhase: 0.7529440429061651, bandDrift: 0.07542739116819575,
    rowDisplace: 0.017053212183527646, driftCycles: 2, tile: 12, sortThreshold: 0.5932750415988266,
    sortAxis: 'vertical', moshDecay: 0.8997874998836778, quantLevels: 8, grain: 0.26657230912242086,
    dither: 0.4057804578682408, chroma: 0.5052202731370926, vignette: 0.30507355709560213,
    loopSeconds: 21.048279407434165,
    reserved: [0.6924051342066377, 0.7906805051025003],
  },
  '3ebed465933f11af41fb9f999635ca11ea55c1357cdcba0f3d4bc11f9de5ff64': {
    mode: 'bands', paletteId: 'olive-rose',
    stopJitter: [0.02516851094551384, -0.051634382000193, 0.0417234693467617,
      0.010482334736734628, 0.032278002994135024, 0.008471077512949704],
    horizon: 0.5896774014085531, sunElevation: 0.542511689160019, sunStrength: 0.7240639494033531,
    bands: 13, hbands: 26, clean: false, blocks: false, blocksN: 11,
    bandPhase: 0.5475297577213496, bandDrift: 0.07462609054986387,
    rowDisplace: 0.022370359115302562, driftCycles: 2, tile: 12, sortThreshold: 0.6645986850839107,
    sortAxis: 'horizontal', moshDecay: 0.8618357972288504, quantLevels: 8, grain: 0.06991859803907574,
    dither: 0.2241068454924971, chroma: 0, vignette: 0.28589400011114774, loopSeconds: 33.16096306312829,
    reserved: [0.056064733071252704, 0.14252913929522038],
  },
};

test('canonical seeds regenerate byte-identically (Genesis v2 genome is frozen)', () => {
  for (const [hash, genome] of Object.entries(CANON)) {
    assert.deepEqual(genomeFromHash(hash), genome, `canonical seed drifted: ${hash.slice(0, 12)}…`);
  }
});

test('v2 preserved the pre-reserved DNA of the canonical seeds (only geometry overlay is new)', () => {
  // Every field drawn *before* the reserved block must be byte-identical to v1 — that is the whole
  // point of spending reserved draws rather than reordering the key.
  const V1_DNA = {
    '00f50f353cf56cfa55f3b32404db3196e7cef86e37bd4b0fbca9304a8dd6097f': {
      paletteId: 'sodium-ember', bands: 9, horizon: 0.42092513039708135, loopSeconds: 21.048279407434165,
    },
    '3ebed465933f11af41fb9f999635ca11ea55c1357cdcba0f3d4bc11f9de5ff64': {
      paletteId: 'olive-rose', bands: 13, horizon: 0.5896774014085531, loopSeconds: 33.16096306312829,
    },
  };
  for (const [hash, dna] of Object.entries(V1_DNA)) {
    const g = genomeFromHash(hash);
    for (const [k, v] of Object.entries(dna)) assert.equal(g[k], v, `${hash.slice(0, 8)} ${k} drifted`);
  }
});
