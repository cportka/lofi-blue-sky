import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PALETTES,
  PALETTE_FAMILIES,
  MAX_STOPS,
  getPaletteById,
  sampleRamp,
} from '../dist/palettes.js';

test('palettes are well-formed', () => {
  assert.ok(PALETTES.length >= 10, 'want at least 10 curated ramps');
  const ids = new Set();
  for (const p of PALETTES) {
    assert.ok(!ids.has(p.id), `duplicate palette id ${p.id}`);
    ids.add(p.id);
    assert.ok(PALETTE_FAMILIES.includes(p.family), `bad family ${p.family}`);
    assert.ok(p.stops.length >= 2 && p.stops.length <= MAX_STOPS);
    // stops strictly increasing, first ~0, last ~1, colours normalised
    let prev = -1;
    for (const s of p.stops) {
      assert.ok(s.t > prev, `stops not increasing in ${p.id}`);
      prev = s.t;
      for (const ch of s.c) assert.ok(ch >= 0 && ch <= 1, `channel out of range in ${p.id}`);
    }
    assert.ok(p.stops[0].t <= 0.001, `${p.id} should start at 0`);
    assert.ok(p.stops[p.stops.length - 1].t >= 0.999, `${p.id} should end at 1`);
  }
});

test('every family has at least two ramps', () => {
  for (const fam of PALETTE_FAMILIES) {
    const n = PALETTES.filter((p) => p.family === fam).length;
    assert.ok(n >= 2, `family ${fam} has only ${n} ramp(s)`);
  }
});

test('sampleRamp clamps endpoints and stays in gamut', () => {
  for (const p of PALETTES) {
    const lo = sampleRamp(p, -1);
    const hi = sampleRamp(p, 2);
    assert.deepEqual(lo, [...p.stops[0].c]);
    assert.deepEqual(hi, [...p.stops[p.stops.length - 1].c]);
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const c = sampleRamp(p, t);
      for (const ch of c) assert.ok(ch >= -1e-9 && ch <= 1 + 1e-9);
    }
  }
});

test('getPaletteById round-trips and rejects unknowns', () => {
  for (const p of PALETTES) assert.equal(getPaletteById(p.id), p);
  assert.equal(getPaletteById('nope'), undefined);
});
