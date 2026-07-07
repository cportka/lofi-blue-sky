/**
 * `$fx` shim.
 *
 * On the published token, the fxhash snippet is injected *before* this bundle and defines the real
 * `$fx` (hash fixed at mint, `$fx.rand` seeded from it, preview/features/params wired to the
 * platform). This module only fills in a compatible stand-in when `$fx` is absent — so the exact
 * same `index.html` also runs standalone in the fxhash sandbox validator, in local dev, and as the
 * GitHub Pages preview, with a hash taken from the URL (`?fxhash=…`) or a fresh random one.
 *
 * It intentionally implements only the subset of the SDK this piece uses. See docs/fxhash.md for
 * the publish-time swap to `@fxhash/project-sdk`.
 */

import { createRng, normalizeHash, randomHash } from '../../../packages/core/dist/index.js';

export interface FxSnippet {
  hash: string;
  rand: () => number;
  minter: string;
  randminter: () => number;
  isPreview: boolean;
  preview: () => void;
  features: (f: Record<string, unknown>) => void;
  getFeature: (name: string) => unknown;
  getFeatures: () => Record<string, unknown>;
  params: (defs: unknown[]) => void;
  getParam: (id: string) => unknown;
}

declare global {
  // eslint-disable-next-line no-var
  var $fx: FxSnippet | undefined;
}

function hashFromLocation(): string {
  try {
    const u = new URL(window.location.href);
    const q = u.searchParams.get('fxhash') ?? u.searchParams.get('hash');
    if (q) return normalizeHash(q);
    if (u.hash.length > 1) return normalizeHash(u.hash.slice(1));
  } catch {
    /* non-browser or opaque location */
  }
  return randomHash();
}

function buildShim(): FxSnippet {
  const hash = hashFromLocation();
  const rand = createRng(hash);
  const minter = 'tz1shimSHIMshimSHIMshimSHIMshimSHIMsh';
  const features: Record<string, unknown> = {};
  let isPreview = false;
  try {
    isPreview = new URL(window.location.href).searchParams.has('preview');
  } catch {
    /* ignore */
  }
  return {
    hash,
    rand,
    minter,
    randminter: createRng(minter),
    isPreview,
    preview() {
      // In dev/preview there is no platform capture hook; signal it so tooling can snapshot.
      try {
        document.documentElement.setAttribute('data-fx-preview', '1');
        window.dispatchEvent(new CustomEvent('fxhash:preview'));
      } catch {
        /* ignore */
      }
    },
    features(f) {
      Object.assign(features, f);
    },
    getFeature(name) {
      return features[name];
    },
    getFeatures() {
      return features;
    },
    params() {
      /* v1 is hash-locked; params are a Phase-3 addition (see ROADMAP.md) */
    },
    getParam() {
      return undefined;
    },
  };
}

/** Return the real `$fx` if the platform injected it, otherwise install and return the shim. */
export function installFxShim(): FxSnippet {
  const existing = (globalThis as { $fx?: FxSnippet }).$fx;
  if (existing && typeof existing.rand === 'function') return existing;
  const shim = buildShim();
  (globalThis as { $fx?: FxSnippet }).$fx = shim;
  return shim;
}
