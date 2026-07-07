# architecture

How lofi-blue-sky is put together: one shared GLSL core, two frames around it, and a build that
turns each frame into a single self-contained HTML file. For the *why* behind the aesthetic and the
open product calls, see [../README.md](../README.md), [../ROADMAP.md](../ROADMAP.md), and
[./DECISIONS.md](./DECISIONS.md).

## one shared core, two frames

The whole engine lives once, in `packages/core`. Two thin targets wrap it:

| | Target A — the fxhash token | Target B — breathe |
|---|---|---|
| path | `targets/fxhash/` | `targets/web/` |
| driven by | `$fx.rand` (platform PRNG) | a hash string (`?seed=…`) |
| ships as | one self-contained `dist/index.html` + `upload.zip` | one `index.html` at the repo root (GitHub Pages) |
| scope | one restrained slit-scan sunset, lean enough for on-chain storage (ONCHFS) | the public generator preview — randomize, paste a seed, save a PNG |

Both targets import the **same** compiled core and the **same** genome, so they render byte-identical
skies from the same seed. The target is just the frame; the masterpiece is in the GLSL.

```
                 ┌──────────────── packages/core (platform-agnostic) ────────────────┐
                 │  rng · hash · genome · palettes · features · loop · gl/* · engine  │
                 └───────────────────────────────────────────────────────────────────┘
                        ▲                                             ▲
             injects $fx.rand                               injects a hash string
                        │                                             │
        targets/fxhash/src (Target A)                    targets/web/src (Target B)
            → dist/index.html + upload.zip                   → ./index.html (Pages)
```

## the golden rule

**`packages/core` never imports `$fx` and never touches the DOM UI.** It only ever consumes a PRNG
*shape* — a zero-arg `() => number` in `[0, 1)` (see `rng.ts`, type `Rng`), which is structurally
identical to `$fx.rand`. The core makes no platform assumptions; the **targets inject the RNG**:

- Target A passes `$fx.rand` straight into `createSky(canvas, { rand: $fx.rand })`.
- Target B passes a hash string; the core folds it into a seed and builds its own `Rng`.

Everything platform-specific — the `$fx` snippet, the shim, the control panel, `?seed=` URL sync,
PNG capture — lives in the targets. This is what lets one shader set serve both a hash-locked
on-chain token and a browser toy without a single conditional in the core.

## module map

Every module in `packages/core/src`, and what it owns:

| module | role |
|---|---|
| `rng.ts` | deterministic `fxrand`-compatible PRNG. `xmur3` (string → seed ints) → `sfc32` (integer-only generator). `createRng(seed)` plus draw helpers `range`, `rangeInt`, `pick`, `weightedIndex`, `chance`. |
| `hash.ts` | hash validation and coercion. `isValidHash`, `normalizeHash` (folds any string into a stable 64-hex seed), `randomHash`. Never used on the token itself — the platform fixes the hash at mint. |
| `genome.ts` | **genome** — `hash → params`, the DNA of a token. Draws an `Rng` in a *fixed order* to fill a `Genome`. That draw order is the determinism contract; reordering it is a MAJOR bump. Ships `mode: 'bands'`; forward-compat fields (mosaic/sort/mosh) are still drawn so today's tokens keep a stable genome when later modes land. |
| `palettes.ts` | the curated colour ramps — 12 ramps across **the four palette families** (Sodium, Powder, Olive, Periwinkle), `MAX_STOPS = 6`. Never lets the RNG pick raw RGB: the genome picks a ramp then *perturbs* its stops ("curate, then perturb"). `sampleRamp` mirrors the GLSL sampler on the CPU for tests/tooling. |
| `features.ts` | rarity **features** — human-readable traits (Palette, Band Density, Drift, Processing, Perfect Horizon, Full Corruption) derived deterministically from a genome, registered via `$fx.features`. |
| `loop.ts` | the **seamless loop** manager. `loopPhase(t, loopSeconds)` → `loopT ∈ [0, 1)`. The engine only ever hands shaders `loopT`, never wall-clock; every time-varying term is periodic in `loopT`, so the frame at `loopT = 0` matches the frame approaching `loopT = 1`. |
| `gl/context.ts` | WebGL2 plumbing: context creation, the `Program` wrapper (compiles the shared fullscreen-triangle vertex shader + a fragment body, caches uniform locations), and `createTarget`/`disposeTarget` FBO helpers. Attributeless — the vertex shader derives a fullscreen triangle from `gl_VertexID`, so there are no vertex buffers. |
| `gl/passes/*.ts` | the GLSL, authored as typed template-string modules (not `.frag` files — fxhash forbids runtime fetches, so shader source must inline anyway). `common.ts` is a uniform-free prelude (hashing, luma, posterize, Bayer dither) injected into every fragment; `sky.ts`, `slitscan.ts`, `post.ts` are the three passes. |
| `engine.ts` | the one entry point, `createSky(canvas, opts)`. Resolves a genome (explicit `genome` > injected `rand` > `hash`), derives features, owns the WebGL2 context and the `Pipeline`, and exposes `render(timeSeconds)` / `resize(...)` / `dispose()`. |
| `index.ts` | the public API — the single module both targets import. Re-exports the above; imports nothing platform-specific. |

## the render pipeline

`gl/pipeline.ts` orchestrates three passes ping-ponging through two FBOs, then to the screen:

```
sky.frag ──► FBO_A ──► slitscan.frag ──► FBO_B ──► post.frag ──► screen
(gradient)  (linear)   (drifting bands)  (nearest) (dither/grain/  (display
                                                    chroma/vignette) resolution)
   └────────── internal resolution (seed-stable, 400px longest side) ──────────┘
```

| pass | reads → writes | does |
|---|---|---|
| `sky.frag` | — → FBO_A | a vertical sunset gradient sampled from the chosen ramp, plus a soft hazy sun glow near the horizon. Stateless. |
| `slitscan.frag` | FBO_A → FBO_B | the signature **slit-scan** look: quantise into `bands` horizontal bands, sample the sky at a per-band vertical drift (the venetian-blind reveal) plus a per-row horizontal smear. Every time term is periodic in `loopT` and every drift-cycle count is an integer, so the loop is seamless with no history buffer. |
| `post.frag` | FBO_B → screen | the digital-corruption layer: chromatic bleed, ordered dither, colour posterisation, static (loop-invariant) film grain, vignette. |

**Internal vs display resolution.** The sky and slit-scan passes render at a fixed internal
resolution — `BASE_RES = 400` on the longest side (`engine.ts`, `internalSize`) — so a token looks
*identical at any display size*: the seed determines the pixels, not the window. Only the final
`post.frag` upscales that buffer to the canvas backing store (`displayW × displayH`, CSS size ×
capped DPR). FBO_A uses `LINEAR` filtering for a smooth gradient; FBO_B uses `NEAREST` so the
upscale keeps its lofi crunch. `resize()` recomputes the internal size and reallocates the FBOs;
the genome is untouched.

## build model

Two stages, two different consumers.

**1. `tsc -b` → `dist`.** The root `tsconfig.json` is a solution-style project-references build
(`packages/core`, `targets/fxhash`, `targets/web`, all extending `tsconfig.base.json`). It emits
plain ESM `dist/`. That compiled `packages/core/dist/index.js` is what the **node `--test`** unit
suite and the **render harness** consume:

- `node --test packages/core/test/*.test.mjs` imports the compiled core directly (determinism +
  golden-genome snapshots).
- `scripts/harness.html` imports `/packages/core/dist/index.js` same-origin; `scripts/render.mjs`
  serves it and drives it in headless Chromium to verify determinism and a seamless loop in a real
  GPU.
- The targets themselves import the compiled core too (e.g. `targets/fxhash/src/fx-shim.ts` imports
  from `packages/core/dist/index.js`), which is why the core must be built before a target bundles.

**2. esbuild → one self-contained HTML per target.** `scripts/bundle.mjs` is the shared helper:
`bundleJs(entry)` bundles a target's `src/main.ts` into a single minified IIFE; `injectHtml`
inlines it into that target's `index.html` template at a marker comment; `assertSelfContained`
fails the build if any external `src`/`href`, leftover ESM `import`, or runtime `fetch()` survives.
The result has **zero external resources** — exactly what both the fxhash sandbox and GitHub Pages
want.

- `targets/fxhash/build.mjs` → `targets/fxhash/dist/index.html` + a matching `upload.zip` (index at
  the archive root), and prints raw + gzip size with an **ONCHFS** hint (lean → fully on-chain is on
  the table; currently ~16 KB).
- `targets/web/build.mjs` → `./index.html` at the repo root + `.nojekyll`, committed so GitHub Pages
  ("deploy from main", repo root) serves it with no build step of its own.

The WebGL2 context is created with `preserveDrawingBuffer: true` so both targets can read the canvas
back for a preview thumbnail (`$fx.preview()`) or a PNG save.

## how to add a new mode

v1 ships only `mode: 'bands'`. The next modes (mosaic, then the feedback-based sort/datamosh — see
[../ROADMAP.md](../ROADMAP.md)) slot in the same two places:

1. **`gl/passes/<mode>.ts`** — author the fragment body as a template-string export, reusing the
   `common.ts` prelude. Keep every time-varying term periodic in `loopT` so the loop stays seamless;
   a stateless mode (like mosaic) needs nothing more. A feedback mode (sort/mosh) needs a history
   buffer and a loop-closure strategy, which is the FBO layer's job to grow.
2. **`gl/pipeline.ts`** — construct the new `Program`, add its uniforms in `render()`, and branch on
   `genome.mode` to choose the middle pass (or add a history FBO for feedback modes). The pipeline
   comment marks this as the spot where sort/mosh would add a history buffer.

The genome already reserves the forward-compat fields each mode needs (`tile`, `sortThreshold`,
`sortAxis`, `moshDecay`) and draws them today, so enabling a mode won't shift the RNG stream or break
determinism for already-minted tokens. Add any new trait to `features.ts` in the same pass.
