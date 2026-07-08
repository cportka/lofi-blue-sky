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

## the fxhash create flow — art coin (Open form)

fxhash's current `create` wizard (fxhash.xyz/create) launches a project as an **art coin**: you mint
a coin (`$TICKER`) that goes live *alongside* the generative work, and collectors spend that coin
(plus a mint fee) to mint editions. The wizard's left rail has eight steps:

`get-started → art-coin-details → artwork-type → artwork → check-files → configure-capture → verification → preview-and-mint`

Everything below is transcribed from the live flow so we know exactly what to prepare.

### 1. art-coin-details — *"set up your art coin"*
| field | what it wants | notes for lofi blue sky |
|-------|---------------|--------------------------|
| **ticker** | `$` symbol, **≥ 2 chars** | e.g. `$SKY` / `$LOFI` / `$PANT`. **⚠ pick one** (decision below). |
| **self-allocation** | fixed by the platform: **you are allocated 40% of supply, locked, unlocking gradually over 3 years**. More than that = buy it on fxhash after launch. | not a choice — just know it. |
| **description** | **≥ 5 chars** | the coin's blurb (short; the project description is separate, step 4). |
| **logo** | an image file (drop / pick) | **asset to make** — a lofi-blue-sky mark (a sky swatch / the favicon at higher res). |

### 2. artwork-type — *"select the type of project you want to publish"*
- **Open form** — *"Generative art that evolves — collectors can **reroll and branch** new editions from their collected ones."*
- **Long form** — *"The classic genart experience — unique, randomized artworks generated at mint time."*

> **Recommendation: Open form.** It is a direct match for what the engine already does — the browser
> generator's per-attribute **reshuffle** and its **`g:<engine>:…` genome tokens** (see
> [ENGINES.md](./ENGINES.md), [CANON.md](./CANON.md)) *are* reroll-and-branch. An Open-form token
> would expose that as on-chain evolution: a collector rerolls their sky into a new branched edition.
> This also elevates decision #4 (fx(params) exposure) — Open form wants **evolve params**, so we'd
> map a small, safe set of genome fields (e.g. palette, band density; Billow: coverage, wind) to the
> evolve/`$fx.params` surface and keep the rest hash-locked. Genesis's frozen key + reserved draws
> give us room to wire this without disturbing existing seeds.

### 3. artwork — the generative project itself
| field | what it wants | for lofi blue sky |
|-------|---------------|--------------------|
| **where to store the code** | **offchain IPFS** (cheaper, needs pinning) *or* **onchain ONCHFS** (fully on-chain, pay-per-byte, storage cost = chain + live gas) | we're built lean (~18 KB) → **ONCHFS is viable** (decision #2). |
| **project zip** | the self-contained bundle, `index.html` at the archive root | our `targets/fxhash/upload.zip` — exactly this shape. |
| **editions** | total supply / **nb of editions** → sets the coin price per edition (the example showed `100000` → *10 $PANT to mint 1 edition*) | **⚠ decide edition count** (decision #5). |
| **mint fee** | the fee in **ETH** to mint an edition (example `0.001`) | small, covers gas + platform. **⚠ decide.** |
| **royalties** | your % of each secondary resale (**25% goes to fxhash**) | **⚠ decide** (decision #6). |
| **evolve fee growth rate** | % growth of the evolve fee per depth — **not self-editable, contact support to change** (default `25` → `0.00025 ETH` at depth 1, `0.0005` at depth 2, …) | governs the cost to reroll/branch; relevant only for **Open form**. |
| **name** | the project title | e.g. *lofi blue sky — Genesis*. |
| **description** | the project blurb | our thesis, short. |
| **release date** | **coin + project go live together** — the coin opens for trading and the project becomes mintable at the same moment | **⚠ pick a date/time.** |
| **tags** | comma-separated | `generative, art, sky, glitch, slit-scan, lofi, seamless-loop`. |
| **labels** | pick any that apply: *Epileptic trigger · Sexual content · Sensitive content · Image composition · Animated · Interactive · Profile Picture (PFP) · Audio · Includes prerendered components* | **Animated** ✓. (Audio only if Target B's bed ever ships here — it won't; that's the breathe edition.) |

### 4. check-files
fxhash validates the uploaded zip: `index.html` at the root, renders in the sandbox, no external
resources. This is the same contract our `assertSelfContained` gate already enforces at build time —
so a green `npm run build:fxhash` should sail through.

### 5. configure-capture
Sets how fxhash snapshots the token's **preview/thumbnail**: the capture **trigger**, **resolution**,
and a **delay**. Our entry calls **`$fx.preview()` a third of the way into the loop** on a
representative frame — so configure the trigger as *"programmatic / fxpreview"* (wait for the
`$fx.preview()` signal) rather than a fixed delay, at a square resolution. Verify the captured still
looks like a good representative sky.

### 6. verification
Wallet + identity verification for the launching account (the `djpants` identity — keep it the same
across the drop for clean provenance; verify links via tzprofiles / your ENS where prompted).

### 7. preview-and-mint
Final review of coin + project, then mint. Coin and project go live at the **release date** set in
step 3.

## ⚠ release worksheet — decisions to lock before minting

| # | decision | default / lean | status |
|---|----------|----------------|--------|
| ticker | the `$` coin symbol (≥2 chars) | `$SKY` (or `$LOFI`) | **open** |
| type | Open form vs Long form | **Open form** (matches reroll/branch) | recommended |
| storage | ONCHFS vs IPFS | **ONCHFS** (we're lean) | decision #2 |
| editions | supply / edition count → price | — | **open** (decision #5) |
| mint fee | ETH per mint | small (e.g. 0.001) | **open** |
| royalties | secondary % (−25% fxhash) | — | **open** (decision #6) |
| evolve params | which genome fields become evolve/`$fx.params` | palette + band density (Genesis) | decision #4 |
| labels / tags | Animated; sky/glitch/lofi tags | set | ready |
| logo | coin mark image | make one | **asset to do** |
| release date | coin + project go-live | — | **open** |
| wallet / identity | launch account, royalties payout, tzprofiles/ENS | `djpants` | verify |

## publish checklist (short)

1. **Build + sandbox-validate on two machines** — `npm run build:fxhash`, upload `upload.zip` to
   fxhash.xyz/sandbox on two different machines/browsers. Confirm it renders, resizes, loops
   seamlessly, and the **same hash → same sky** on both; the captured preview looks right.
2. **Lock the worksheet above** (ticker, type, storage, editions, fees, royalties, release date).
3. **Run the create wizard** (steps 1–7) with those values; upload the same `upload.zip`.
4. **Mint** — coin + project go live at the release date.
5. **Announce** across the project's channels (see [PROJECT.md](./PROJECT.md)).

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
