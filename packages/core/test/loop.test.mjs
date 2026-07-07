import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loopPhase, loopClock, loopEnvelope, TAU } from '../dist/loop.js';

test('loopPhase is normalised to [0, 1) and periodic', () => {
  const L = 27;
  assert.equal(loopPhase(0, L), 0);
  assert.equal(loopPhase(L, L), 0);
  assert.ok(Math.abs(loopPhase(L * 3.25, L) - 0.25) < 1e-9);
  for (let t = -50; t < 50; t += 0.37) {
    const p = loopPhase(t, L);
    assert.ok(p >= 0 && p < 1, `phase out of range at t=${t}: ${p}`);
  }
});

test('loopPhase seamless: approaching the end returns toward the start', () => {
  const L = 20;
  const eps = 1e-4;
  assert.ok(loopPhase(L - L * eps, L) > 0.999);
  assert.ok(loopPhase(L + L * eps, L) < 0.001);
});

test('loopClock tracks whole cycles', () => {
  assert.deepEqual(loopClock(0, 10), { loopT: 0, cycle: 0 });
  assert.deepEqual(loopClock(25, 10), { loopT: 0.5, cycle: 2 });
});

test('loopEnvelope breathes 0 -> 1 -> 0 with no seam', () => {
  assert.ok(Math.abs(loopEnvelope(0) - 0) < 1e-9);
  assert.ok(Math.abs(loopEnvelope(0.5) - 1) < 1e-9);
  assert.ok(Math.abs(loopEnvelope(1) - 0) < 1e-9);
  assert.ok(Math.abs(TAU - Math.PI * 2) < 1e-12);
});

test('a zero loop length does not divide by zero', () => {
  const p = loopPhase(5, 0);
  assert.ok(Number.isFinite(p) && p >= 0 && p < 1);
});
