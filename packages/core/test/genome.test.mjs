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

test('every generated genome is in-range and well-formed', () => {
  for (let i = 0; i < 400; i++) {
    const g = genomeFromHash('seed-' + i);
    assert.equal(g.mode, 'bands');
    assert.ok(getPaletteById(g.paletteId), `unknown palette ${g.paletteId}`);
    assert.equal(g.stopJitter.length, MAX_STOPS);
    for (const j of g.stopJitter) assert.ok(Number.isFinite(j) && Math.abs(j) <= 0.06 + 1e-9);
    assert.ok(g.horizon >= 0.3 && g.horizon <= 0.62);
    assert.ok(g.sunStrength >= 0.15 && g.sunStrength <= 0.85);
    assert.ok(g.bands >= 8 && g.bands <= 48 && Number.isInteger(g.bands));
    assert.ok(g.bandPhase >= 0 && g.bandPhase < 1);
    assert.ok(g.driftCycles >= 1 && g.driftCycles <= 3 && Number.isInteger(g.driftCycles));
    assert.ok(g.quantLevels >= 5 && g.quantLevels <= 16 && Number.isInteger(g.quantLevels));
    assert.ok(g.grain >= 0 && g.dither >= 0 && g.chroma >= 0 && g.vignette >= 0);
    assert.ok(g.loopSeconds >= 20 && g.loopSeconds <= 34);
    assert.ok(g.sortAxis === 'vertical' || g.sortAxis === 'horizontal');
  }
});

test('a plain seed string is folded deterministically (never throws)', () => {
  assert.deepEqual(genomeFromHash('hello sky'), genomeFromHash('hello sky'));
});
