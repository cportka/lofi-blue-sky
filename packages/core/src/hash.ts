/**
 * Hash utilities. A `$fx.hash` is a 64-character hex string (Tezos-style "oo..." base58 on the
 * real platform, but for our deterministic core we treat the hash purely as a 64-hex seed string).
 * These helpers validate a hash, and generate fresh ones for the browser generator / tests —
 * never used on the fxhash token itself, where the hash is fixed at mint.
 */

const HEX = '0123456789abcdef';

/** A 64-character lowercase hex string. */
export type Hash = string;

/** True if `s` looks like a 64-char hex hash. */
export function isValidHash(s: string): boolean {
  return typeof s === 'string' && /^[0-9a-f]{64}$/.test(s);
}

/**
 * Coerce arbitrary input into a stable 64-hex seed. A valid hash passes through unchanged; any
 * other string is folded deterministically into 64 hex chars so the generator can be driven from
 * a user-typed seed without ever throwing. (Determinism is preserved: same input → same output.)
 */
export function normalizeHash(input: string): Hash {
  const s = (input ?? '').toString().toLowerCase();
  if (isValidHash(s)) return s;
  // Deterministic fold: expand via a rolling integer hash into 64 hex nibbles.
  let h = 2166136261 >>> 0;
  const src = s.length ? s : 'lofi-blue-sky';
  let out = '';
  for (let i = 0; out.length < 64; i++) {
    const c = src.charCodeAt(i % src.length) + i * 131;
    h = Math.imul(h ^ c, 16777619) >>> 0;
    out += HEX[(h >>> 28) & 0xf];
    out += HEX[(h >>> 12) & 0xf];
  }
  return out.slice(0, 64);
}

/**
 * Generate a fresh random 64-hex hash. Accepts an injectable source of randomness so callers can
 * stay deterministic in tests; defaults to `Math.random` for interactive "randomize" in the
 * browser generator. Never called on the fxhash token (the platform fixes the hash at mint).
 */
export function randomHash(rand: () => number = Math.random): Hash {
  let out = '';
  for (let i = 0; i < 64; i++) out += HEX[Math.floor(rand() * 16) & 0xf];
  return out;
}
