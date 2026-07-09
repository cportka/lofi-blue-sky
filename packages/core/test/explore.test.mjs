import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genomeFromHash } from '../dist/genome.js';
import { deriveFeatures } from '../dist/features.js';
import { getPaletteById } from '../dist/palettes.js';
import { randomHashByPolicy, rerollFeature, FEATURE_KEYS } from '../dist/explore.js';

// deterministic PRNG so the policy/rerolls are testable
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test('randomHashByPolicy makes Olive rarer but still possible; output is a valid hash', () => {
  const r = rng(12345);
  let olive = 0, seen = false;
  for (let i = 0; i < 2000; i++) {
    const h = randomHashByPolicy(r, { rarer: 'Olive', prob: 0.66 });
    assert.match(h, /^[0-9a-f]{64}$/);
    if (getPaletteById(genomeFromHash(h).paletteId).family === 'Olive') olive++;
  }
  const pct = olive / 2000;
  assert.ok(pct < 0.18, `Olive should be rarer than baseline ~25%, got ${(pct * 100).toFixed(1)}%`);
  assert.ok(pct > 0.02, `Olive should still be possible, got ${(pct * 100).toFixed(1)}%`);
  // and pasting an Olive hash still yields Olive (genome is untouched by the policy)
  assert.equal(getPaletteById(genomeFromHash('3ebed465933f11af41fb9f999635ca11ea55c1357cdcba0f3d4bc11f9de5ff64').paletteId).family, 'Olive');
});

test('rerollFeature changes exactly the clicked feature (best-effort) and returns a valid genome', () => {
  const base = genomeFromHash('explore-seed');
  const r = rng(999);
  for (const key of FEATURE_KEYS) {
    const before = deriveFeatures(base)[key];
    const next = rerollFeature(base, key, r);
    // still a well-formed genome
    assert.equal(next.mode, 'bands');
    assert.equal(next.stopJitter.length, 6);
    assert.ok(getPaletteById(next.paletteId), 'palette still valid');
    // the targeted feature actually moved for the discrete traits
    if (['Palette', 'Split', 'Band Density', 'Finish', 'Perfect Horizon', 'Full Corruption'].includes(key)) {
      assert.notEqual(deriveFeatures(next)[key], before, `feature ${key} did not change`);
    }
  }
});

test('rerollFeature leaves other genome fields untouched', () => {
  const base = genomeFromHash('untouched');
  const next = rerollFeature(base, 'Band Density', rng(1));
  // Band Density depends only on `bands`; everything else is identical
  for (const k of Object.keys(base)) {
    if (k === 'bands') continue;
    assert.deepEqual(next[k], base[k], `field ${k} changed unexpectedly`);
  }
});
