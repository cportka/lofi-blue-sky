/**
 * Share codec for the browser generator. A pure-hash sky is shared as its 64-hex hash (its engine
 * travels in the URL / UI). A sky hand-tweaked one attribute at a time is no longer reachable by a
 * single hash, so it is shared as an **engine-tagged** token: `g:<engineId>:<base64url(params)>`.
 * Both round-trip exactly, so any sky — on any engine — stays reproducible ("regenerate as is").
 */

import type { BaseParams } from './engines/types.js';

function b64urlEncode(s: string): string {
  const b64 = btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(b64)));
}

/** True if `s` is a `g:` sky token. */
export function isSkyToken(s: string): boolean {
  return typeof s === 'string' && s.startsWith('g:');
}

/** Encode an engine + its params as a shareable `g:<engineId>:...` token. */
export function encodeSky(engineId: string, params: BaseParams): string {
  return `g:${engineId}:${b64urlEncode(JSON.stringify(params))}`;
}

/** Decode a `g:...` token into `{ engineId, params }`, or null if malformed. */
export function decodeSky(token: string): { engineId: string; params: BaseParams } | null {
  if (!isSkyToken(token)) return null;
  const rest = token.slice(2);
  const sep = rest.indexOf(':');
  if (sep <= 0) return null;
  const engineId = rest.slice(0, sep);
  if (!/^[a-z0-9-]+$/.test(engineId)) return null;
  try {
    const params = JSON.parse(b64urlDecode(rest.slice(sep + 1)));
    if (!params || typeof params !== 'object' || typeof params.loopSeconds !== 'number') return null;
    return { engineId, params: params as BaseParams };
  } catch {
    return null;
  }
}
