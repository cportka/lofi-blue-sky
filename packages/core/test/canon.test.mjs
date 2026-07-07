import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genomeFromHash } from '../dist/genome.js';

// Canonical seeds — FROZEN at v0.1.0. If any change alters the genome one of these hashes produces,
// this fails on purpose: it would mean an existing, beloved sky no longer regenerates as-is. The
// genome, palettes, and shaders are the contract; everything else (UI, exploration policy, feature
// labels) may evolve without touching what a hash renders. See docs/CANON.md.
const CANON = {
  // Chris's picks (v0.2.0)
  '00f50f353cf56cfa55f3b32404db3196e7cef86e37bd4b0fbca9304a8dd6097f': {
    mode: 'bands', paletteId: 'sodium-ember',
    stopJitter: [0.012655991921201343, -0.03318908608518541, 0.019618835337460047,
      0.015342185217887161, -0.02222185774706304, -0.019905288191512223],
    horizon: 0.42092513039708135, sunElevation: 0.43736527191009367, sunStrength: 0.7114813092630357,
    bands: 9, bandPhase: 0.7529440429061651, bandDrift: 0.07542739116819575,
    rowDisplace: 0.017053212183527646, driftCycles: 2, tile: 12, sortThreshold: 0.5932750415988266,
    sortAxis: 'vertical', moshDecay: 0.8997874998836778, quantLevels: 8, grain: 0.26657230912242086,
    dither: 0.4057804578682408, chroma: 0.5052202731370926, vignette: 0.30507355709560213,
    loopSeconds: 21.048279407434165,
  },
  '3ebed465933f11af41fb9f999635ca11ea55c1357cdcba0f3d4bc11f9de5ff64': {
    mode: 'bands', paletteId: 'olive-rose',
    stopJitter: [0.02516851094551384, -0.051634382000193, 0.0417234693467617,
      0.010482334736734628, 0.032278002994135024, 0.008471077512949704],
    horizon: 0.5896774014085531, sunElevation: 0.542511689160019, sunStrength: 0.7240639494033531,
    bands: 13, bandPhase: 0.5475297577213496, bandDrift: 0.07462609054986387,
    rowDisplace: 0.022370359115302562, driftCycles: 2, tile: 12, sortThreshold: 0.6645986850839107,
    sortAxis: 'horizontal', moshDecay: 0.8618357972288504, quantLevels: 8, grain: 0.06991859803907574,
    dither: 0.2241068454924971, chroma: 0, vignette: 0.28589400011114774, loopSeconds: 33.16096306312829,
  },
};

test('canonical seeds regenerate byte-identically (v0.1.0 genome is frozen)', () => {
  for (const [hash, genome] of Object.entries(CANON)) {
    assert.deepEqual(genomeFromHash(hash), genome, `canonical seed drifted: ${hash.slice(0, 12)}…`);
  }
});
