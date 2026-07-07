/**
 * Share codec for the browser generator. A pure-hash sky is shared as its 64-hex hash. A sky that
 * has been hand-tweaked one attribute at a time is no longer reachable by a single hash, so it is
 * shared as an encoded genome — a `g:`-prefixed base64url of the full genome. Both round-trip
 * exactly, so *any* sky you make is reproducible, which keeps the "regenerate as is" promise even
 * for edited skies. See docs/CANON.md.
 */

import type { Genome } from './genome.js';

function b64urlEncode(s: string): string {
  const b64 = btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(b64)));
}

const GENOME_KEYS = new Set([
  'mode', 'paletteId', 'stopJitter', 'horizon', 'sunElevation', 'sunStrength', 'bands',
  'bandPhase', 'bandDrift', 'rowDisplace', 'driftCycles', 'tile', 'sortThreshold', 'sortAxis',
  'moshDecay', 'quantLevels', 'grain', 'dither', 'chroma', 'vignette', 'loopSeconds',
]);

/** Encode a genome as a shareable `g:...` token. */
export function encodeGenome(g: Genome): string {
  return 'g:' + b64urlEncode(JSON.stringify(g));
}

/** True if `s` is a `g:` genome token. */
export function isGenomeToken(s: string): boolean {
  return typeof s === 'string' && s.startsWith('g:');
}

/** Decode a `g:...` token back into a genome, or null if it is malformed. */
export function decodeGenome(s: string): Genome | null {
  if (!isGenomeToken(s)) return null;
  try {
    const obj = JSON.parse(b64urlDecode(s.slice(2)));
    if (!obj || typeof obj !== 'object') return null;
    // shape check: every genome key present, no stray keys, jitter is length-6
    for (const k of GENOME_KEYS) if (!(k in obj)) return null;
    if (!Array.isArray(obj.stopJitter) || obj.stopJitter.length !== 6) return null;
    return obj as Genome;
  } catch {
    return null;
  }
}
