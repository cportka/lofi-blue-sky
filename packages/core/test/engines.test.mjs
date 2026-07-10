import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENGINES, ENGINE_IDS, DEFAULT_ENGINE_ID, getEngine } from '../dist/engines/registry.js';
import { billowGenomeFromHash, billowFeatures } from '../dist/engines/billow/index.js';
import { BILLOW_RESERVED } from '../dist/engines/billow/genome.js';
import { squallGenomeFromHash, squallFeatures } from '../dist/engines/squall/index.js';
import { SQUALL_RESERVED } from '../dist/engines/squall/genome.js';

test('registry exposes genesis + billow + squall; getEngine falls back to default', () => {
  assert.deepEqual([...ENGINE_IDS], ['genesis', 'billow', 'squall']);
  assert.equal(DEFAULT_ENGINE_ID, 'genesis');
  assert.equal(getEngine('billow').id, 'billow');
  assert.equal(getEngine('squall').id, 'squall');
  assert.equal(getEngine('nope').id, 'genesis'); // fallback
  for (const e of ENGINES) {
    assert.ok(e.id && e.name && typeof e.keyVersion === 'number');
    assert.equal(typeof e.genome, 'function');
    assert.equal(typeof e.features, 'function');
    assert.equal(typeof e.createRenderer, 'function');
  }
});

test('Billow key is deterministic, in-range, and reserves blank space', () => {
  const H = 'b111011111011111011111011111011111011111011111011111011111011111';
  assert.deepEqual(billowGenomeFromHash(H), billowGenomeFromHash(H));
  for (let i = 0; i < 300; i++) {
    const p = billowGenomeFromHash('bill-' + i);
    assert.ok(p.loopSeconds >= 20 && p.loopSeconds <= 34);
    assert.ok(p.wind >= 1 && p.wind <= 3 && Number.isInteger(p.wind));
    assert.ok(p.period >= 6 && p.period <= 12 && Number.isInteger(p.period));
    assert.ok(p.layers === 1 || p.layers === 2);
    assert.ok(['clouds', 'mosaic'].includes(p.mode)); // sort/mosh reserved, never selected yet
    assert.equal(p.skyJitter.length, 4);
    assert.equal(p.reserved.length, BILLOW_RESERVED);
    for (const rv of p.reserved) assert.ok(rv >= 0 && rv < 1);
  }
});

test('Billow features are deterministic and complete', () => {
  const KEYS = ['Sky', 'Coverage', 'Wind', 'Churn', 'Mode', 'Golden Light', 'Full Mosaic'];
  let clouds = 0, mosaic = 0;
  for (let i = 0; i < 300; i++) {
    const p = billowGenomeFromHash('bf-' + i);
    const f = billowFeatures(p);
    for (const k of KEYS) assert.ok(k in f, `missing ${k}`);
    assert.deepEqual(billowFeatures(p), f);
    if (p.mode === 'mosaic') mosaic++;
    else clouds++;
  }
  assert.ok(clouds > 0 && mosaic > 0, 'expected a mix of clouds and the experimental mosaic mode');
});

test('Squall key is deterministic, in-range, and reserves blank space', () => {
  const H = '5c1a115c1a115c1a115c1a115c1a115c1a115c1a115c1a115c1a115c1a115c1a';
  assert.deepEqual(squallGenomeFromHash(H), squallGenomeFromHash(H));
  for (let i = 0; i < 300; i++) {
    const p = squallGenomeFromHash('squ-' + i);
    assert.ok(p.loopSeconds >= 20 && p.loopSeconds <= 34);
    assert.ok(p.blocksX >= 4 && p.blocksX <= 18 && Number.isInteger(p.blocksX));
    assert.ok(p.blocksY >= 4 && p.blocksY <= 18 && Number.isInteger(p.blocksY));
    assert.ok(p.steps >= 3 && p.steps <= 9 && Number.isInteger(p.steps)); // integer held-frames → seamless
    assert.ok(p.bursts >= 1 && p.bursts <= 3 && Number.isInteger(p.bursts)); // integer sweeps → seamless envelope
    assert.ok(p.pulseCycles >= 1 && p.pulseCycles <= 3 && Number.isInteger(p.pulseCycles)); // integer → seamless
    assert.ok(p.pulse >= 0.02 && p.pulse <= 0.08);
    assert.ok(p.amount >= 0.12 && p.amount <= 0.62); // corruption skews light — mostly clean
    assert.ok(p.chroma === 0 || (p.chroma > 0 && p.chroma <= 0.4));
    assert.equal(p.skyJitter.length, 5);
    assert.equal(p.reserved.length, SQUALL_RESERVED);
    for (const rv of p.reserved) assert.ok(rv >= 0 && rv < 1);
  }
});

test('Squall features are deterministic, complete, and vary', () => {
  const KEYS = ['Sky', 'Corruption', 'Squalls', 'Blocks', 'Tearing', 'Signal Lost', 'Clear Skies'];
  const seen = { Corruption: new Set(), Squalls: new Set(), Blocks: new Set(), Tearing: new Set() };
  for (let i = 0; i < 400; i++) {
    const p = squallGenomeFromHash('sf-' + i);
    const f = squallFeatures(p);
    for (const k of KEYS) assert.ok(k in f, `missing ${k}`);
    assert.deepEqual(squallFeatures(p), f);
    for (const k of Object.keys(seen)) seen[k].add(f[k]);
  }
  for (const k of Object.keys(seen)) assert.ok(seen[k].size >= 2, `Squall feature "${k}" never varies`);
});
