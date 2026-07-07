# Target A — fxhash token: build + publish

The disciplined masterpiece. One restrained **slit-scan** sunset, deterministic from a hash,
bundled into a single self-contained `index.html` with no network and no external resources — lean
enough to live fully on-chain. This is the practical guide for building it and putting it on the
platform.

Source of truth for this target lives in `targets/fxhash/`:

- `index.html` — the template (two marker comments, nothing else).
- `src/main.ts` — the entry: hash → genome → engine → seamless loop → preview.
- `src/fx-shim.ts` — the `$fx` stand-in that lets one file run everywhere.
- `build.mjs` — bundles + zips; prints size and the storage hint.

Related reading: the thesis and the look in [../README.md](../README.md), where this sits on the
plan in [../ROADMAP.md](../ROADMAP.md) (Phase 3), and the open calls in
[./DECISIONS.md](./DECISIONS.md).

## the hard rules (non-negotiable)

fxhash sandboxes the token in a way that mirrors how a collector will ever see it. Four rules, and
the build enforces the ones it can:

| rule | why | how this repo keeps it |
|------|-----|------------------------|
| **bundle everything — no external resources** | the token must render with nothing but its own bytes | `bundle.mjs` inlines the whole engine into one `<script>`; `assertSelfContained` fails the build on any `src`/`href` to `http(s)` or any leftover ESM `import` |
| **no network calls** | no fetch can be relied on, ever | `assertSelfContained` fails the build if a `fetch(` survives into the HTML |
| **respond to resize** | one token, every display, every aspect ratio | `main.ts` binds `window.addEventListener('resize', fit)` and calls `fit()` once; `fit` caps DPR at 2 and calls `sky.resize(...)` |
| **no unseeded RNG — use `$fx.rand`** | same hash → same sky, on every machine, forever | the engine is driven with `createSky(canvas, { rand: $fx.rand })`; the **genome** (hash → params) is derived only from that stream — no `Math.random()` anywhere |

If any of the first two are violated, `npm run build:fxhash` exits non-zero and tells you what
leaked. The last two are properties of the entry code, not the bundler — keep them true.

## the `$fx` subset this piece uses

The piece deliberately touches only a slice of the fxhash SDK. `fx-shim.ts` declares exactly that
slice as `FxSnippet`, so what dev and the token share is a small, explicit contract:

| member | used for | in `main.ts` |
|--------|----------|--------------|
| `hash` | the seed the genome is built from | consumed indirectly via `rand` |
| `rand()` | the deterministic PRNG (seeded from `hash`) | `createSky(canvas, { rand: $fx.rand })` |
| `minter` / `randminter()` | minter address + a PRNG seeded from it | available on the snippet; not needed by v1 |
| `isPreview` | "capture the thumbnail now" signal | forces the preview frame early |
| `preview()` | tell the platform to snapshot this frame | called once, a third into the loop |
| `features(f)` / `getFeature(name)` | publish rarity traits for indexing | `$fx.features(sky.features)` |
| `params(defs)` / `getParam(id)` | mint-time controls | **no-op in v1** — hash-locked (see below) |

`params`/`getParam` are wired into the contract but intentionally inert: v1 is fully hash-locked.
Exposing palette + band density at mint is a Phase-3 follow-up — see decision #4 in
[./DECISIONS.md](./DECISIONS.md) and Phase 3 in [../ROADMAP.md](../ROADMAP.md).

## one index.html, three contexts

The reason `fx-shim.ts` exists: the **same** `index.html` has to run in local dev, in the fxhash
sandbox validator, and on the minted token — unchanged. The shim is what makes that true.

```
                         ┌─────────────────────────────────────────────┐
   index.html  ─────────►│  is a real $fx already on the page?          │
   (loads bundle)        │  (installFxShim: existing.rand is a fn?)     │
                         └───────────────┬─────────────────┬───────────┘
                                    yes  │                 │  no
                                         ▼                 ▼
                            use the platform $fx     build the shim:
                            (shim no-ops)            hash from ?fxhash= / ?hash=
                                                     / #fragment, else randomHash()
                                                     rand = createRng(hash)
                                                     isPreview from ?preview
```

`installFxShim()` checks `globalThis.$fx`. If a real snippet is present (its `rand` is a function),
it returns it untouched — **the shim no-ops on the token**. Otherwise it installs a compatible
stand-in:

- **hash** comes from the URL — `?fxhash=…` or `?hash=…`, or the `#…` fragment — normalized; if
  none is given it mints a fresh `randomHash()`. So `dist/index.html?fxhash=<any-hex>` reproduces an
  exact sky in dev, and a bare open randomizes.
- **rand** is `createRng(hash)` — the same fxrand-compatible PRNG the token uses.
- **preview()** has no platform capture hook off-platform, so it sets `data-fx-preview="1"` on
  `<html>` and fires a `fxhash:preview` event — enough for headless tooling (`npm run render`) to
  snapshot.
- **params/getParam** are no-ops returning `undefined`, matching the hash-locked v1.

Both the shim and the engine import from the same built core (`packages/core/dist`), so `rand`,
`normalizeHash`, and `randomHash` behave identically in every context.

## the publish-time swap

The template's `<head>` carries a single marker:

```html
<!-- FX_SNIPPET: at publish time the fxhash snippet (@fxhash/project-sdk) is injected here,
     before the bundle, so it defines the real $fx. -->
```

`injectHtml(template, { script, snippet })` (in `scripts/bundle.mjs`) replaces that marker with
`snippet` and the `<!-- INLINE_SCRIPT -->` marker with the bundled engine. The ordering matters: the
snippet lands **before** the bundle, so the real `$fx` exists by the time `installFxShim()` runs and
the shim steps aside.

The standard build passes **no** snippet, so the marker is replaced with empty — the shim drives it.
That is exactly the artifact you validate in the sandbox and open in dev. At publish, the real
`@fxhash/project-sdk` snippet occupies that slot (fxhash injects its snippet when serving the
token). Nothing else changes: the fixed hash arrives via the real `$fx`, `$fx.rand` is seeded from
it, and `preview()`/`features()` are wired to the platform.

> One file, one code path. The only difference between dev and token is who provides `$fx`.

## the build

```bash
npm run build:core     # prerequisite: packages/core/dist (build.mjs checks and tells you)
npm run build:fxhash   # → node targets/fxhash/build.mjs
```

`build.mjs` reads the template, bundles `src/main.ts` into one minified IIFE, injects it, and then
**asserts self-containment before writing anything**. On success it writes:

- `targets/fxhash/dist/index.html` — the self-contained token.
- `targets/fxhash/dist/LICENSE` — copied from the repo root (**MIT — bundled with the token**).
- `targets/fxhash/upload.zip` — `zip -j` of `index.html` + `LICENSE`, so **`index.html` sits at the
  archive root** (fxhash requires this) with no nested directories.

It prints raw + gzip size and a storage hint:

```
Target A (fxhash) built:
  dist/index.html   ~16 KB  (gzip ~6.5 KB)
  upload.zip        ... KB
  ✓ lean enough to consider ONCHFS (fully on-chain).
```

The hint is a threshold: **under 60 KB raw** it prints the ONCHFS line above; at or over 60 KB it
switches to *"sizeable — IPFS is the safer storage target at this size."* It is a nudge, not a
decision.

## storage: ONCHFS vs IPFS

This is a conscious call, not a default. v0.1.0 is built lean (~16 KB, gzip ~6.5 KB) specifically so
**ONCHFS** — permanent, fully on-chain, pay-per-byte — stays on the table; **IPFS** is cheaper but
needs pinning. Confirm before the drop: see decision #2 in [./DECISIONS.md](./DECISIONS.md).

## publish sequence

A checklist, top to bottom. Do not skip the two-machine step — determinism bugs hide on a single
box.

1. **sandbox-validate on two machines.** Build, then upload `upload.zip` to fxhash.xyz/sandbox on
   **two different machines/browsers**. Confirm: it renders, resizes cleanly, loops seamlessly, and
   the **same hash yields the same sky** on both. Check the captured preview looks right (it fires a
   third of the way into the loop).
2. **connect a wallet.** Kukai or Temple, on the account that will hold the token and receive
   royalties.
3. **publish the generative token.** Upload the same `upload.zip`; pick the storage target from the
   decision above (ONCHFS vs IPFS).
4. **set edition size + pricing.** Fixed / Dutch / open — a platform setting, not code (decision #5
   in [./DECISIONS.md](./DECISIONS.md)).
5. **set royalties.** Secondary-sale split; not stored in the repo (decision #6).
6. **mint artist proofs.** Pull a few iterations for yourself; sanity-check live tokens against the
   sandbox.
7. **announce.** Share the drop.

## quick reference

| thing | value |
|-------|-------|
| build command | `npm run build:fxhash` |
| entry | `targets/fxhash/src/main.ts` |
| output | `targets/fxhash/dist/index.html` + `upload.zip` (index.html at root) |
| license | MIT, bundled alongside the token |
| dev repro | `dist/index.html?fxhash=<hex>` (or `?hash=` / `#<hex>`) |
| force preview frame | append `?preview` |
| self-containment gate | `assertSelfContained` in `scripts/bundle.mjs` |
| snippet injection point | `<!-- FX_SNIPPET -->` marker in `index.html`, before the bundle |
