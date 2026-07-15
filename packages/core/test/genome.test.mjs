import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genome, genomeFromHash } from '../dist/genome.js';
import { createRng } from '../dist/rng.js';
import { normalizeHash } from '../dist/hash.js';
import { getPaletteById, MAX_STOPS } from '../dist/palettes.js';

const H = '00000000000000000000000000000000000000000000000000000000deadbeef';

// Golden snapshot: locks the determinism contract. If a change reorders the rand() draws or
// shifts a range, this fails on purpose — that is a genome-breaking change and needs a decision
// (a major bump), because a token minted under the old genome must keep rendering identically.
const GOLDEN = {
  mode: 'bands',
  paletteId: 'powder-salmon',
  stopJitter: [
    0.017530374415218833, 0.0072729489393532215, 0.0011650265660136938,
    -0.0028371065855026245, -0.020117907486855983, 0.0371691295132041,
  ],
  horizon: 0.4920364335924387,
  sunElevation: 0.4421515778778121,
  sunStrength: 0.8333223456284031,
  bands: 19,
  hbands: 1,
  movement: 'distorted',
  blocks: false,
  blocksN: 7,
  bandPhase: 0.5071672464255244,
  bandDrift: 0.07815468958346172,
  rowDisplace: 0.03513844524510205,
  driftCycles: 1,
  tile: 3,
  sortThreshold: 0.44207224116427823,
  sortAxis: 'vertical',
  moshDecay: 0.87459176894743,
  quantLevels: 15,
  grain: 0.499167243395932,
  dither: 0.39859091320540757,
  chroma: 0.02633928065188229,
  vignette: 0.24825711131561548,
  loopSeconds: 20.59140261122957,
  reserved: [0.43703945842571557, 0.5436633701901883],
};

test('genome matches the golden snapshot (byte-identical determinism)', () => {
  assert.deepEqual(genomeFromHash(H), GOLDEN);
});

test('same hash -> identical genome; independent RNG instances agree', () => {
  const a = genomeFromHash(H);
  const b = genome(createRng(normalizeHash(H)));
  assert.deepEqual(a, b);
});

test('different hashes -> different genomes', () => {
  const a = genomeFromHash('1111111111111111111111111111111111111111111111111111111111111111');
  const b = genomeFromHash('2222222222222222222222222222222222222222222222222222222222222222');
  assert.notDeepEqual(a, b);
});

// Extra golden vectors pin the OTHER draw paths the deadbeef golden misses: a chroma=0 hash (the
// gated-magnitude branch) and a fine-bands / driftCycles=3 / horizontal-ish hash.
const GOLDEN_VECTORS = {
  'seed-4': {
    mode: 'bands', paletteId: 'olive-haze',
    stopJitter: [0.057708084359765044, -0.0051770644728094325, -0.013355187932029368,
      -0.004327639639377594, 0.05123597390949726, -0.04592280942946672],
    horizon: 0.4017001429200172, sunElevation: 0.5773192049912177, sunStrength: 0.27621843698434534,
    bands: 9, hbands: 4, movement: 'true-clean', blocks: true, blocksN: 8,
    bandPhase: 0.6816464364528656, bandDrift: 0.035924939919495955,
    rowDisplace: 0.01323959418106824, driftCycles: 1, tile: 12, sortThreshold: 0.6664858225570061,
    sortAxis: 'horizontal', moshDecay: 0.8693750870763324, quantLevels: 8, grain: 0.010911608280055225,
    dither: 0.025603077446110546, chroma: 0, vignette: 0.4436766439117491, loopSeconds: 23.383221368771046,
    reserved: [0.3182834356557578, 0.3021326712332666],
  },
  'seed-3': {
    mode: 'bands', paletteId: 'periwinkle-dusk',
    stopJitter: [-0.002698839101940395, -0.056407305216416716, -0.04179643026553094,
      -0.004335041223093868, -0.03517482270486653, 0.04921595804393292],
    horizon: 0.40009025782346724, sunElevation: 0.5037014248827472, sunStrength: 0.7796804954996333,
    bands: 44, hbands: 5, movement: 'true-clean', blocks: true, blocksN: 7,
    bandPhase: 0.39475096575915813, bandDrift: 0.048222664415370674,
    rowDisplace: 0.054802955766208465, driftCycles: 3, tile: 9, sortThreshold: 0.447101808085572,
    sortAxis: 'vertical', moshDecay: 0.9698582527227699, quantLevels: 6, grain: 0.05229735904019326,
    dither: 0.0136680676471442, chroma: 0, vignette: 0.13846778790466488,
    loopSeconds: 32.79398643737659,
    reserved: [0.29602953302673995, 0.023686108645051718],
  },
};

test('golden vectors pin every draw path (chroma=0 and fine-bands branches)', () => {
  for (const [seed, expected] of Object.entries(GOLDEN_VECTORS)) {
    assert.deepEqual(genomeFromHash(seed), expected);
  }
});

test('every generated genome is fully in-range and well-formed', () => {
  const inRange = (v, lo, hi, msg) => assert.ok(v >= lo - 1e-9 && v <= hi + 1e-9, `${msg}: ${v}`);
  for (let i = 0; i < 500; i++) {
    const g = genomeFromHash('seed-' + i);
    assert.equal(g.mode, 'bands');
    assert.ok(getPaletteById(g.paletteId), `unknown palette ${g.paletteId}`);
    assert.equal(g.stopJitter.length, MAX_STOPS);
    for (const j of g.stopJitter) inRange(j, -0.06, 0.06, 'stopJitter');
    inRange(g.horizon, 0.3, 0.62, 'horizon');
    inRange(g.sunElevation, g.horizon - 0.05, g.horizon + 0.18, 'sunElevation');
    inRange(g.sunStrength, 0.15, 0.85, 'sunStrength');
    assert.ok(g.bands >= 8 && g.bands <= 48 && Number.isInteger(g.bands), `bands ${g.bands}`);
    assert.ok(g.hbands >= 1 && g.hbands <= 32 && Number.isInteger(g.hbands), `hbands ${g.hbands}`);
    assert.ok(['true-clean', 'sweep', 'classic', 'distorted'].includes(g.movement), `movement ${g.movement}`);
    assert.equal(typeof g.blocks, 'boolean');
    if (g.movement === 'classic') assert.ok(g.hbands === 1 && !g.blocks, 'classic is pure v1 bars');
    assert.ok(g.blocksN >= 1 && g.blocksN <= 24 && Number.isInteger(g.blocksN), `blocksN ${g.blocksN}`);
    inRange(g.bandPhase, 0, 1, 'bandPhase');
    inRange(g.bandDrift, 0.015, 0.09, 'bandDrift');
    inRange(g.rowDisplace, 0.0, 0.06, 'rowDisplace');
    assert.ok(g.driftCycles >= 1 && g.driftCycles <= 3 && Number.isInteger(g.driftCycles));
    assert.ok(g.tile >= 3 && g.tile <= 12 && Number.isInteger(g.tile), `tile ${g.tile}`);
    inRange(g.sortThreshold, 0.35, 0.72, 'sortThreshold');
    assert.ok(g.sortAxis === 'vertical' || g.sortAxis === 'horizontal');
    inRange(g.moshDecay, 0.85, 0.98, 'moshDecay');
    assert.ok(g.quantLevels >= 5 && g.quantLevels <= 16 && Number.isInteger(g.quantLevels));
    // Clean movements (the norm) pull grain/dither right down (×0.12 / ×0.06); classic/distorted
    // keep the full range.
    inRange(g.grain, 0.04 * 0.12, 0.5, 'grain');
    inRange(g.dither, 0.2 * 0.06, 0.9, 'dither');
    const cleanish = g.movement === 'true-clean' || g.movement === 'sweep';
    if (cleanish) assert.ok(g.grain <= 0.06 + 1e-9 && g.dither <= 0.054 + 1e-9 && g.chroma === 0, 'clean movements are crisp');
    assert.ok(g.chroma === 0 || (g.chroma >= 0 && g.chroma <= 0.6), `chroma ${g.chroma}`);
    inRange(g.vignette, 0.1, 0.6, 'vignette');
    inRange(g.loopSeconds, 20, 34, 'loopSeconds');
    assert.equal(g.reserved.length, 2);
    for (const rv of g.reserved) inRange(rv, 0, 1, 'reserved');
  }
});

test('chroma is bimodal: exactly 0 or within (0, 0.6]', () => {
  let zeros = 0, nonzeros = 0;
  for (let i = 0; i < 300; i++) {
    const c = genomeFromHash('cseed-' + i).chroma;
    if (c === 0) zeros++;
    else { nonzeros++; assert.ok(c > 0 && c <= 0.6); }
  }
  assert.ok(zeros > 0 && nonzeros > 0, 'expected a mix of chroma on/off');
});

test('a plain seed string is folded deterministically (never throws)', () => {
  assert.deepEqual(genomeFromHash('hello sky'), genomeFromHash('hello sky'));
});

test('v4: True Clean is ~90%; every other movement is rare (<10%); classic is the <1% golden window', () => {
  let bars = 0, grid = 0, blocks = 0, oneByOne = 0;
  const mv = { 'true-clean': 0, sweep: 0, classic: 0, distorted: 0 };
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const g = genomeFromHash('split-' + i);
    mv[g.movement]++;
    if (g.blocks) { blocks++; if (g.blocksN === 1) oneByOne++; }
    else if (g.hbands > 1) grid++;
    else bars++;
  }
  // True Clean IS the sky — ~90% of seeds. Everything else is individually rare.
  assert.ok(mv['true-clean'] / N > 0.86 && mv['true-clean'] / N < 0.93, `true-clean ${(mv['true-clean'] / N).toFixed(3)} ~0.90`);
  assert.ok(mv.sweep / N < 0.1 && mv.sweep > 0, `sweep ${(mv.sweep / N).toFixed(3)} <0.10`);
  assert.ok(mv.distorted / N < 0.1 && mv.distorted > 0, `distorted ${(mv.distorted / N).toFixed(3)} <0.10`);
  assert.ok(mv.classic / N < 0.015 && mv.classic > 0, `classic ${(mv.classic / N).toFixed(4)} <0.01ish (golden window)`);
  // All three splits are genuinely reachable, and the 1×1 origin (a single pulsing colour) occurs, rarely.
  assert.ok(bars > 0 && grid > 0 && blocks > 0, `bars ${bars} grid ${grid} blocks ${blocks}`);
  assert.ok(oneByOne > 0 && oneByOne / N < 0.05, `1×1 share ${(oneByOne / N).toFixed(3)} should be rare but present`);
});

test('the two original canonical picks land in the classic golden window (their v1 look preserved)', () => {
  for (const h of [
    '00f50f353cf56cfa55f3b32404db3196e7cef86e37bd4b0fbca9304a8dd6097f',
    '3ebed465933f11af41fb9f999635ca11ea55c1357cdcba0f3d4bc11f9de5ff64',
  ]) {
    const g = genomeFromHash(h);
    assert.equal(g.movement, 'classic', `${h.slice(0, 8)} should be classic`);
    assert.ok(g.hbands === 1 && !g.blocks, 'classic renders as the pure v1 single-column bars');
  }
});
