import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genomeFromHash } from '../dist/genome.js';
import { deriveFeatures } from '../dist/features.js';
import { getPaletteById } from '../dist/palettes.js';

const KEYS = ['Palette', 'Band Density', 'Drift', 'Processing', 'Perfect Horizon', 'Full Corruption'];

test('deriveFeatures is deterministic and complete', () => {
  for (let i = 0; i < 200; i++) {
    const g = genomeFromHash('feat-' + i);
    const f = deriveFeatures(g);
    for (const k of KEYS) assert.ok(k in f, `missing feature ${k}`);
    assert.equal(f.Palette, getPaletteById(g.paletteId).family);
    assert.ok(['Fine', 'Wide'].includes(f['Band Density']));
    assert.ok(['Still', 'Flowing'].includes(f.Drift));
    assert.ok(['Clean', 'Grained', 'Degraded'].includes(f.Processing));
    assert.equal(typeof f['Perfect Horizon'], 'boolean');
    assert.equal(typeof f['Full Corruption'], 'boolean');
    assert.deepEqual(deriveFeatures(g), f);
  }
});

// A full genome with only the fields deriveFeatures reads set to neutral values; override per test.
const base = {
  mode: 'bands', paletteId: 'sodium-sunset', stopJitter: [0, 0, 0, 0, 0, 0],
  horizon: 0.46, sunElevation: 0.5, sunStrength: 0.5,
  bands: 20, bandPhase: 0.5, bandDrift: 0.02, rowDisplace: 0.01, driftCycles: 1,
  tile: 6, sortThreshold: 0.5, sortAxis: 'vertical', moshDecay: 0.9,
  quantLevels: 12, grain: 0.1, dither: 0.3, chroma: 0, vignette: 0.3, loopSeconds: 27,
};
const mk = (o) => ({ ...base, ...o });

test('features discriminate at their thresholds', () => {
  // Band Density at 24
  assert.equal(deriveFeatures(mk({ bands: 23 }))['Band Density'], 'Wide');
  assert.equal(deriveFeatures(mk({ bands: 24 }))['Band Density'], 'Fine');
  // Drift at motion 0.09
  assert.equal(deriveFeatures(mk({ bandDrift: 0.04, rowDisplace: 0.04 })).Drift, 'Still'); // 0.08
  assert.equal(deriveFeatures(mk({ bandDrift: 0.05, rowDisplace: 0.045 })).Drift, 'Flowing'); // 0.095
  // Processing across both thresholds (0.55, 1.0)
  assert.equal(deriveFeatures(mk({ grain: 0.05, dither: 0.2, quantLevels: 16 })).Processing, 'Clean'); // 0.15
  assert.equal(deriveFeatures(mk({ grain: 0.3, dither: 0.4, quantLevels: 14 })).Processing, 'Grained'); // 0.56
  assert.equal(deriveFeatures(mk({ grain: 0.5, dither: 0.9, chroma: 0.5, quantLevels: 5 })).Processing, 'Degraded');
  // Perfect Horizon window
  assert.equal(deriveFeatures(mk({ horizon: 0.46, rowDisplace: 0.01 }))['Perfect Horizon'], true);
  assert.equal(deriveFeatures(mk({ horizon: 0.46, rowDisplace: 0.03 }))['Perfect Horizon'], false);
  assert.equal(deriveFeatures(mk({ horizon: 0.55, rowDisplace: 0.01 }))['Perfect Horizon'], false);
  // Full Corruption conjunction
  assert.equal(deriveFeatures(mk({ chroma: 0.5, grain: 0.4, quantLevels: 7 }))['Full Corruption'], true);
  assert.equal(deriveFeatures(mk({ chroma: 0.5, grain: 0.4, quantLevels: 8 }))['Full Corruption'], false);
});

test('features actually vary across the hash space (no zero-rarity trait)', () => {
  const seen = { Palette: new Set(), 'Band Density': new Set(), Drift: new Set(), Processing: new Set() };
  let perfect = false, corrupt = false;
  for (let i = 0; i < 600; i++) {
    const f = deriveFeatures(genomeFromHash('vary-' + i));
    for (const k of Object.keys(seen)) seen[k].add(f[k]);
    perfect ||= f['Perfect Horizon'];
    corrupt ||= f['Full Corruption'];
  }
  for (const k of Object.keys(seen)) assert.ok(seen[k].size >= 2, `feature "${k}" never varies`);
  assert.ok(perfect, 'Perfect Horizon never occurs');
  assert.ok(corrupt, 'Full Corruption never occurs');
});
