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
  clean: false,
  blocks: false,
  blocksN: 13,
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
    bands: 9, hbands: 4, clean: true, blocks: false, blocksN: 15,
    bandPhase: 0.6816464364528656, bandDrift: 0.035924939919495955,
    rowDisplace: 0.01323959418106824, driftCycles: 1, tile: 12, sortThreshold: 0.6664858225570061,
    sortAxis: 'horizontal', moshDecay: 0.8693750870763324, quantLevels: 8, grain: 0.09093006900046022,
    dither: 0.42671795743517577, chroma: 0, vignette: 0.4436766439117491, loopSeconds: 23.383221368771046,
    reserved: [0.3182834356557578, 0.3021326712332666],
  },
  'seed-3': {
    mode: 'bands', paletteId: 'periwinkle-dusk',
    stopJitter: [-0.002698839101940395, -0.056407305216416716, -0.04179643026553094,
      -0.004335041223093868, -0.03517482270486653, 0.04921595804393292],
    horizon: 0.40009025782346724, sunElevation: 0.5037014248827472, sunStrength: 0.7796804954996333,
    bands: 44, hbands: 5, clean: true, blocks: false, blocksN: 13,
    bandPhase: 0.39475096575915813, bandDrift: 0.048222664415370674,
    rowDisplace: 0.054802955766208465, driftCycles: 3, tile: 9, sortThreshold: 0.447101808085572,
    sortAxis: 'vertical', moshDecay: 0.9698582527227699, quantLevels: 6, grain: 0.4358113253349438,
    dither: 0.22780112745240333, chroma: 0.5315904050599783, vignette: 0.13846778790466488,
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
    assert.ok(g.hbands >= 1 && g.hbands <= 40 && Number.isInteger(g.hbands), `hbands ${g.hbands}`);
    assert.equal(typeof g.clean, 'boolean');
    assert.equal(typeof g.blocks, 'boolean');
    assert.ok(g.blocksN >= 2 && g.blocksN <= 40 && Number.isInteger(g.blocksN), `blocksN ${g.blocksN}`);
    inRange(g.bandPhase, 0, 1, 'bandPhase');
    inRange(g.bandDrift, 0.015, 0.09, 'bandDrift');
    inRange(g.rowDisplace, 0.0, 0.06, 'rowDisplace');
    assert.ok(g.driftCycles >= 1 && g.driftCycles <= 3 && Number.isInteger(g.driftCycles));
    assert.ok(g.tile >= 3 && g.tile <= 12 && Number.isInteger(g.tile), `tile ${g.tile}`);
    inRange(g.sortThreshold, 0.35, 0.72, 'sortThreshold');
    assert.ok(g.sortAxis === 'vertical' || g.sortAxis === 'horizontal');
    inRange(g.moshDecay, 0.85, 0.98, 'moshDecay');
    assert.ok(g.quantLevels >= 5 && g.quantLevels <= 16 && Number.isInteger(g.quantLevels));
    inRange(g.grain, 0.04, 0.5, 'grain');
    inRange(g.dither, 0.2, 0.9, 'dither');
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

test('v2 split prefers the classic single column, but grids and blocks both appear', () => {
  let bars = 0, grid = 0, blocks = 0, cleanCount = 0;
  const N = 1000;
  for (let i = 0; i < N; i++) {
    const g = genomeFromHash('split-' + i);
    if (g.blocks) blocks++;
    else if (g.hbands > 1) grid++;
    else bars++;
    if (g.clean) cleanCount++;
  }
  // Bars (the preferred "20×1" look) is the single most common split by a wide margin…
  assert.ok(bars > grid && bars > blocks, `bars ${bars} should dominate (grid ${grid}, blocks ${blocks})`);
  assert.ok(bars / N > 0.45 && bars / N < 0.65, `bars share ${(bars / N).toFixed(2)} ~0.56`);
  // …yet grids and blocks are both genuinely reachable, and clean is a meaningful minority.
  assert.ok(grid > 0 && blocks > 0, 'grid and blocks must both occur');
  assert.ok(cleanCount / N > 0.18 && cleanCount / N < 0.4, `clean share ${(cleanCount / N).toFixed(2)} ~0.28`);
});
