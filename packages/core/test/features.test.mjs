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
