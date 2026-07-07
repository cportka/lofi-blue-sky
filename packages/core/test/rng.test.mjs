import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRng,
  sfc32,
  xmur3,
  range,
  rangeInt,
  pick,
  weightedIndex,
  chance,
} from '../dist/rng.js';

test('sfc32 is deterministic for the same seeds', () => {
  const a = sfc32(1, 2, 3, 4);
  const b = sfc32(1, 2, 3, 4);
  for (let i = 0; i < 1000; i++) assert.equal(a(), b());
});

test('sfc32 output stays in [0, 1)', () => {
  const r = sfc32(9, 8, 7, 6);
  for (let i = 0; i < 10000; i++) {
    const v = r();
    assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
  }
});

test('createRng: same seed -> identical sequence (determinism contract)', () => {
  const a = createRng('a3f1b2c4d5e6f7089a1b2c3d4e5f60718293a4b5c6d7e8f9012345678abcdef0');
  const b = createRng('a3f1b2c4d5e6f7089a1b2c3d4e5f60718293a4b5c6d7e8f9012345678abcdef0');
  for (let i = 0; i < 500; i++) assert.equal(a(), b());
});

test('createRng: different seeds -> different sequences', () => {
  const a = createRng('seed-one');
  const b = createRng('seed-two');
  let differ = false;
  for (let i = 0; i < 50; i++) if (a() !== b()) differ = true;
  assert.ok(differ, 'distinct seeds produced identical streams');
});

test('xmur3 produces uint32 values', () => {
  const h = xmur3('lofi');
  for (let i = 0; i < 100; i++) {
    const v = h();
    assert.ok(Number.isInteger(v) && v >= 0 && v <= 0xffffffff);
  }
});

test('range / rangeInt respect bounds', () => {
  const r = createRng('bounds');
  for (let i = 0; i < 5000; i++) {
    const f = range(r, -3, 7);
    assert.ok(f >= -3 && f < 7);
    const n = rangeInt(r, 2, 9);
    assert.ok(Number.isInteger(n) && n >= 2 && n <= 9);
  }
});

test('pick returns a member; weightedIndex respects a zero weight; chance is bounded', () => {
  const r = createRng('helpers');
  const arr = ['x', 'y', 'z'];
  for (let i = 0; i < 100; i++) assert.ok(arr.includes(pick(r, arr)));
  // weight 0 in the middle must never be selected
  const counts = [0, 0, 0];
  for (let i = 0; i < 2000; i++) counts[weightedIndex(r, [1, 0, 1])]++;
  assert.equal(counts[1], 0);
  let trues = 0;
  for (let i = 0; i < 2000; i++) if (chance(r, 0.5)) trues++;
  assert.ok(trues > 700 && trues < 1300);
});
