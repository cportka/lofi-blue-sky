/**
 * Deterministic PRNG — an `fxrand`-compatible interface.
 *
 * On fxhash the platform injects `$fx.rand()`: a `() => number` in [0, 1). Our engine only ever
 * consumes that *shape*, so it never depends on which PRNG produced it. This module supplies an
 * identical shape for the browser target and for tests: {@link createRng} returns a `() => number`
 * seeded deterministically from a hash string using integer-only math (xmur3 → sfc32), so the
 * sequence is byte-identical across machines, architectures, and JS engines. Determinism is the
 * whole game for a code-NFT — see docs/DETERMINISM.md.
 */

/** A zero-argument PRNG returning a float in [0, 1). Structurally identical to `$fx.rand`. */
export type Rng = () => number;

/**
 * xmur3 string hash → a generator of successive 32-bit seed integers.
 * Used to expand a hash string into the four seeds sfc32 needs.
 */
export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function next(): number {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/**
 * sfc32 (Small Fast Counter, 32-bit) — four 32-bit seeds → a PRNG in [0, 1).
 * Fast, well-distributed, and fully integer, so it produces identical output everywhere.
 */
export function sfc32(a: number, b: number, c: number, d: number): Rng {
  return function next(): number {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/** Seed a deterministic {@link Rng} from any string (typically a 64-hex `$fx.hash`). */
export function createRng(seed: string): Rng {
  const h = xmur3(seed);
  return sfc32(h(), h(), h(), h());
}

// --- small helpers on top of an Rng (used by genome.ts) ---------------------------------------

/** Uniform float in [min, max). */
export function range(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

/** Uniform integer in [min, max] (inclusive). */
export function rangeInt(rng: Rng, min: number, max: number): number {
  return Math.floor(min + (max - min + 1) * rng());
}

/** Pick one element of a non-empty array. */
export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length] as T;
}

/** Weighted index pick: returns i with probability weights[i] / sum(weights). */
export function weightedIndex(rng: Rng, weights: readonly number[]): number {
  let total = 0;
  for (const w of weights) total += w;
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i] as number;
    if (r < 0) return i;
  }
  return weights.length - 1;
}

/** True with probability p. */
export function chance(rng: Rng, p: number): boolean {
  return rng() < p;
}
